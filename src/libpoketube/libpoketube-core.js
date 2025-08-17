/**
 * Poke is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

const { toJson } = require("xml2json");
const { curly } = require("node-libcurl");
const getdislikes = require("../libpoketube/libpoketube-dislikes.js");
const getColors = require("get-image-colors");
const config = require("../../config.json");

class InnerTubePokeVidious {
  constructor(config) {
    this.config = config;
    this.cache = {};
    this.language = "hl=en-US";
    this.param = "2AMB";
    this.param_legacy = "CgIIAdgDAQ%3D%3D";
    this.apikey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    this.ANDROID_API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
    this.ANDROID_APP_VERSION = "20.20.41";
    this.ANDROID_VERSION = "16";
    this.useragent = config.useragent || "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.INNERTUBE_CONTEXT_CLIENT_VERSION = "1";
    this.region = "region=US";
    this.sqp = "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";

    // Lazy-initialized undici pieces for connection reuse + pipelining
    this._fetch = null;
    this._agent = null;
    this._undiciInit = null;

    // Small LRU-ish caches to avoid redundant work within the same process lifespan
    this._channelCache = new Map(); // key: authorId -> {data, ts}
    this._commentsCache = new Map(); // key: videoId -> {data, ts}
  }

  async _ensureUndici() {
    if (this._undiciInit) return this._undiciInit;
    this._undiciInit = (async () => {
      const { fetch, Agent, setGlobalDispatcher } = await import("undici");
      // Aggressive keep-alive + pipelining to cut handshake latency
      const agent = new Agent({
        keepAliveTimeout: 60_000,
        keepAliveMaxTimeout: 60_000,
        connections: 16,
        pipelining: 1, // keep conservative; many APIs dislike >1
        maxRedirections: 2
      });
      setGlobalDispatcher(agent);
      this._fetch = fetch;
      this._agent = agent;
    })();
    return this._undiciInit;
  }

  getJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  checkUnexistingObject(obj) {
    return obj && "authorId" in obj;
  }

  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Faster, low-tail decorrelated jitter backoff
  // See AWS "Exponential Backoff And Jitter" — decorrelated variant
  backoffDelay(attempt, base = 80, cap = 2000) {
    const prev = attempt === 0 ? base : Math.min(cap, base * Math.pow(2, attempt - 1));
    const next = Math.min(cap, base + Math.floor(Math.random() * (prev * 3)));
    return next;
  }

  shouldRetryStatus(status) {
    if (!status) return true;
    if (status === 408 || status === 425 || status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    // hard no-retry statuses
    if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 410) return false;
    return false;
  }

  _mergeHeaders(a = {}, b = {}) {
    const o = { ...a };
    for (const k of Object.keys(b)) {
      o[k] = b[k];
    }
    return o;
  }

  // Ultra-lean fetch with:
  // - connection reuse (undici agent)
  // - short per-attempt timeouts (attempt-scaled)
  // - decorrelated jitter backoff
  // - minimal retries by default, but smart on 429/5xx
  async fetchWithRetry(url, options = {}, cfg = {}) {
    await this._ensureUndici();
    const fetch = this._fetch;

    const maxRetries = Number.isInteger(cfg.retries) ? Math.max(0, cfg.retries) : 5;
    const baseDelay = cfg.baseDelay ?? 80;
    const maxDelay = cfg.maxDelay ?? 2000;
    const hardCapMs = cfg.hardCapMs ?? 8000; // total time budget
    const extraRetryOn = cfg.retryOnStatuses || [];
    const started = Date.now();

    const uah = {
      "User-Agent": this.useragent,
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br"
    };

    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const elapsed = Date.now() - started;
      if (elapsed >= hardCapMs) break;

      const perAttemptBudget = Math.max(500, Math.min(2500, hardCapMs - elapsed));
      const ac = new AbortController();
      const tm = setTimeout(() => ac.abort(new Error("timeout")), perAttemptBudget);

      try {
        const res = await fetch(url, {
          ...options,
          signal: ac.signal,
          headers: this._mergeHeaders(options.headers, uah)
        });
        clearTimeout(tm);

        if (res.ok) return res;

        const should = this.shouldRetryStatus(res.status) || extraRetryOn.includes(res.status);
        if (!should || attempt === maxRetries) return res;
      } catch (e) {
        clearTimeout(tm);
        lastErr = e;
        if (attempt === maxRetries) throw e;
      }

      const backoff = this.backoffDelay(attempt, baseDelay, maxDelay);
      const remain = hardCapMs - (Date.now() - started);
      if (remain <= 0) break;
      await this.wait(Math.min(backoff, Math.max(0, remain - 50)));
    }

    if (lastErr) throw lastErr;
    throw new Error("fetchWithRetry failed");
  }

  // Hedged requests with early secondary, winner-takes-all, loser aborted.
  // Cuts tail latency when a backend is slow/spotty.
  async hedgedGetJsonFromBases(bases, path, query) {
    await this._ensureUndici();
    const fetch = this._fetch;

    const qs = query ? (query.startsWith("?") ? query : "?" + query) : "";
    const primary = `${bases[0]}${path}${qs}`;
    const secondary = bases[1] ? `${bases[1]}${path}${qs}` : null;

    const headers = {
      "User-Agent": this.useragent,
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br"
    };

    const attemptOnce = async (url, signal) => {
      const res = await this.fetchWithRetry(
        url,
        { headers, signal },
        { retries: 3, baseDelay: 80, maxDelay: 1200, hardCapMs: 4000 }
      );
      const tx = await res.text();
      return this.getJson(tx);
    };

    if (!secondary) return attemptOnce(primary);

    const acPrimary = new AbortController();
    const acSecondary = new AbortController();

    // Fire secondary quickly (200ms) to hedge
    const secondaryKick = (async () => {
      await this.wait(200);
      if (!acPrimary.signal.aborted) {
        return attemptOnce(secondary, acSecondary.signal);
      }
      throw new Error("secondary canceled");
    })();

    const primaryP = attemptOnce(primary, acPrimary.signal);

    try {
      const winner = await Promise.race([
        primaryP.then(v => ({ v, who: "p" })),
        secondaryKick.then(v => ({ v, who: "s" }))
      ]);

      // Abort the loser ASAP
      if (winner.who === "p") acSecondary.abort();
      else acPrimary.abort();

      if (winner.v) return winner.v;

      // Fallback: await the other if the winner returned null-ish
      const other = winner.who === "p" ? secondaryKick : primaryP;
      const v2 = await other.catch(() => null);
      return v2 || null;
    } catch {
      // Final fallback: try primary once more, fast budget
      try {
        return await attemptOnce(primary, acPrimary.signal);
      } catch {
        try {
          return await attemptOnce(secondary, acSecondary.signal);
        } catch {
          return null;
        }
      }
    } finally {
      acPrimary.abort();
      acSecondary.abort();
    }
  }

  async getColorsSafe(url) {
    for (let i = 0; i < 2; i++) {
      try {
        const c = await getColors(url);
        if (Array.isArray(c) && c[0] && c[1]) return [c[0].hex(), c[1].hex()];
      } catch {}
      await this.wait(this.backoffDelay(i, 80, 600));
    }
    return ["#0ea5e9", "#111827"];
  }

  // Fast libcurl retry: fewer attempts, tighter timeouts, early exit on non-retryable
  async curlGetWithRetry(url, httpHeader) {
    let lastErr = null;
    for (let i = 0; i <= 3; i++) {
      try {
        const res = await curly.get(url, { httpHeader, timeoutMs: 7000, acceptEncoding: "gzip, deflate, br" });
        if (res && res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && res.data) return res;
        if (res && res.statusCode && !this.shouldRetryStatus(res.statusCode)) return res;
      } catch (e) {
        lastErr = e;
      }
      await this.wait(this.backoffDelay(i, 80, 1500));
    }
    if (lastErr) throw lastErr;
    throw new Error("curlGetWithRetry failed");
  }

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    if (v == null) return "Gib ID";

    // 1h video-level cache
    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }

    const headersArr = Object.entries({
      "User-Agent": this.useragent,
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br"
    }).map(([k, v]) => `${k}: ${v}`);

    const bases = [this.config.invapi, this.config.invapi_alt];
    const b64ts = Buffer.from(String(Date.now())).toString("base64");
    const q = `hl=${contentlang}&region=${contentregion}&h=${b64ts}`;

    try {
      const [comments, vid, videoData] = await Promise.all([
        (async () => {
          const hit = this._commentsCache.get(v);
          if (hit && Date.now() - hit.ts < 300_000) return hit.data;
          const data = await this.hedgedGetJsonFromBases(bases, `/comments/${v}`, q);
          this._commentsCache.set(v, { data, ts: Date.now() });
          return data;
        })(),
        this.hedgedGetJsonFromBases(bases, `/videos/${v}`, q),
        (async () => {
          const res = await this.curlGetWithRetry(`${this.config.tubeApi}video?v=${v}`, headersArr);
          const str = Buffer.isBuffer(res.data) ? res.data.toString("utf8") : String(res.data || "");
          const jsonStr = toJson(str);
          const video = this.getJson(jsonStr);
          return { json: jsonStr, video };
        })()
      ]);

      let p = {};
      if (f === "true" && vid && vid.authorId) {
        const cKey = vid.authorId;
        const cached = this._channelCache.get(cKey);
        if (cached && Date.now() - cached.ts < 300_000) {
          p = cached.data;
        } else {
          p = await this.hedgedGetJsonFromBases(bases, `/channels/${vid.authorId}`, `hl=${contentlang}&region=${contentregion}`);
          this._channelCache.set(cKey, { data: p || {}, ts: Date.now() });
        }
      }

      if (!vid) {
        this.initError("Video JSON missing", new Error("no vid"));
        return null;
      }

      if (this.checkUnexistingObject(vid)) {
        let fe = { engagement: null };
        try {
          fe = await getdislikes(v);
        } catch {}

        const [c1, c2] = await this.getColorsSafe(`https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`);

        this.cache[v] = {
          result: {
            json: videoData?.json?.video,
            video: videoData?.video,
            vid,
            comments,
            channel_uploads: p || {},
            engagement: fe.engagement,
            wiki: "",
            desc: "",
            color: c1,
            color2: c2
          },
          timestamp: Date.now()
        };
        return this.cache[v].result;
      }
    } catch (error) {
      this.initError("Error getting video", error);
    }
  }

  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") {
      return /^([a-zA-Z0-9_-]{11})/.test(v);
    }
    return false;
  }

  initError(args, error) {
    console.error("[LIBPT CORE ERROR] " + args, error);
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  tubeApi: "https://inner-api.poketube.fun/api/",
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt: config.proxylocation === "EU" ? "https://invid-api.poketube.fun/api/v1" : "https://iv.ggtyler.dev/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
  useragent: config.useragent
});

module.exports = pokeTubeApiCore;
