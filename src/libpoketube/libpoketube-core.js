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

class LRU {
  constructor(max = 5000) {
    this.max = max;
    this.map = new Map();
  }
  get(k) {
    if (!this.map.has(k)) return;
    const v = this.map.get(k);
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }
  set(k, v) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
  has(k) { return this.map.has(k); }
}

class InnerTubePokeVidious {
  constructor(cfg) {
    this.config = cfg;
    this.cache = new LRU(5000);
    this.language = "hl=en-US";
    this.param = "2AMB";
    this.param_legacy = "CgIIAdgDAQ%3D%3D";
    this.apikey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    this.ANDROID_API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
    this.ANDROID_APP_VERSION = "20.20.41";
    this.ANDROID_VERSION = "16";
    this.useragent = cfg.useragent || "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.INNERTUBE_CONTEXT_CLIENT_VERSION = "1";
    this.region = "region=US";
    this.sqp = "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";
    this.hedge = true;
  }

  getJson(s) { try { return JSON.parse(s); } catch { return null; } }
  checkUnexistingObject(o) { return o && "authorId" in o; }
  wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  backoff(attempt, base = 160, cap = 12000) {
    const exp = Math.min(cap, base * Math.pow(2, attempt));
    const jit = Math.floor(Math.random() * (base + 1));
    return Math.min(cap, exp + jit);
  }
  shouldRetryStatus(st) {
    if (!st) return true;
    if (st === 408 || st === 425 || st === 429) return true;
    if (st >= 500 && st <= 599) return true;
    return false;
  }
  parseRetryAfter(v) {
    if (!v) return null;
    const secs = Number(v);
    if (!Number.isNaN(secs)) return Math.max(0, secs * 1000);
    const dt = Date.parse(v);
    if (!Number.isNaN(dt)) return Math.max(0, dt - Date.now());
    return null;
  }

  async fetchWithRetry(url, options = {}, cfg = {}, outerSignal) {
    const { fetch } = await import("undici");
    const maxRetries = Number.isInteger(cfg.retries) ? Math.max(0, cfg.retries) : 8;
    const baseDelay = cfg.baseDelay ?? 160;
    const maxDelay = cfg.maxDelay ?? 12000;
    const perAttemptTimeout = cfg.timeout ?? 12000;
    const extraRetryOn = cfg.retryOnStatuses || [];
    const uah = { "User-Agent": this.useragent };
    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const onOuterAbort = () => ac.abort(outerSignal.reason || new Error("aborted"));
      if (outerSignal) {
        if (outerSignal.aborted) throw outerSignal.reason || new Error("aborted");
        outerSignal.addEventListener("abort", onOuterAbort, { once: true });
      }
      const t = setTimeout(() => ac.abort(new Error("timeout")), perAttemptTimeout);
      try {
        const res = await fetch(url, {
          ...options,
          signal: ac.signal,
          headers: { ...(options.headers || {}), ...uah },
        });
        clearTimeout(t);
        if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
        if (res.ok) return res;
        const should = this.shouldRetryStatus(res.status) || extraRetryOn.includes(res.status);
        if (!should || attempt === maxRetries) return res;
        let delay = this.backoff(attempt, baseDelay, maxDelay);
        if (res.status === 429 || res.status === 503) {
          const ra = this.parseRetryAfter(res.headers.get("retry-after"));
          if (ra != null) delay = Math.min(Math.max(ra, baseDelay), maxDelay);
        }
        await this.wait(delay);
      } catch (e) {
        clearTimeout(t);
        if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
        lastErr = e;
        if (attempt === maxRetries) throw e;
        await this.wait(this.backoff(attempt, baseDelay, maxDelay));
      }
    }
    if (lastErr) throw lastErr;
    throw new Error("fetchWithRetry failed");
  }

  async hedgedGetJsonFromBases(bases, path, query, outerSignal) {
    const qs = query ? (query.startsWith("?") ? query : "?" + query) : "";
    const mk = (b) => `${b}${path}${qs}`;
    const attemptOnce = async (u) => {
      const r = await this.fetchWithRetry(u, {}, { retries: 4, baseDelay: 120, maxDelay: 6000, timeout: 10000 }, outerSignal);
      const tx = await r.text();
      return this.getJson(tx);
    };
    if (!this.hedge || !bases[1]) return attemptOnce(mk(bases[0]));
    let p1 = attemptOnce(mk(bases[0]));
    let p2 = (async () => { await this.wait(300); return attemptOnce(mk(bases[1])); })();
    try {
      return await Promise.any([p1, p2]);
    } catch {
      try { const a = await p1; if (a) return a; } catch {}
      try { const b = await p2; if (b) return b; } catch {}
      return null;
    }
  }

  async getColorsSafe(url) {
    for (let i = 0; i < 3; i++) {
      try {
        const c = await getColors(url);
        if (Array.isArray(c) && c[0] && c[1]) return [c[0].hex(), c[1].hex()];
      } catch {}
      await this.wait(this.backoff(i, 120, 4000));
    }
    return ["#0ea5e9", "#111827"];
  }

  async curlGetWithRetry(url, httpHeader, outerSignal) {
    let lastErr = null;
    for (let i = 0; i <= 4; i++) {
      if (outerSignal?.aborted) throw outerSignal.reason || new Error("aborted");
      try {
        const res = await curly.get(url, {
          httpHeader,
          timeoutMs: 12000,
          connectTimeoutMs: 6000,
        });
        const code = res?.statusCode;
        if (code >= 200 && code < 300 && res?.data) return res;
        if (!this.shouldRetryStatus(code)) return res;
      } catch (e) { lastErr = e; }
      await this.wait(this.backoff(i, 160, 8000));
    }
    if (lastErr) throw lastErr;
    throw new Error("curlGetWithRetry failed");
  }

  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") return /^([a-zA-Z0-9_-]{11})$/.test(v);
    return false;
  }

  initError(a, e) { console.error("[LIBPT CORE ERROR] " + a, e); }

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    if (!this.isvalidvideo(v)) return { error: true, reason: "invalid_video_id" };
    const cached = this.cache.get(v);
    if (cached && Date.now() - cached.timestamp < 3600000) return cached.result;

    const headers = { "User-Agent": this.useragent };
    const bases = [this.config.invapi, this.config.invapi_alt];
    const b64ts = Buffer.from(String(Date.now())).toString("base64");
    const q = `hl=${contentlang}&region=${contentregion}&h=${b64ts}`;

    const outer = new AbortController();
    const outerTimeout = setTimeout(() => outer.abort(new Error("global-timeout")), 18000);

    try {
      const [comments, vid, videoData] = await Promise.all([
        this.hedgedGetJsonFromBases(bases, `/comments/${v}`, q, outer.signal),
        this.hedgedGetJsonFromBases(bases, `/videos/${v}`, q, outer.signal),
        (async () => {
          const res = await this.curlGetWithRetry(
            `${this.config.tubeApi}video?v=${v}`,
            Object.entries(headers).map(([k, vv]) => `${k}: ${vv}`),
            outer.signal
          );
          const str = Buffer.isBuffer(res.data) ? res.data.toString("utf8") : String(res.data || "");
          const jsonStr = toJson(str);
          const video = this.getJson(jsonStr);
          return { json: jsonStr, video };
        })()
      ]);

      if (!vid) return { error: true, reason: "not_found_or_unparsable" };

      let p = {};
      if (f === "true" && vid.authorId) {
        p = await this.hedgedGetJsonFromBases(bases, `/channels/${vid.authorId}`, `hl=${contentlang}&region=${contentregion}`, outer.signal) || {};
      }

      if (!this.checkUnexistingObject(vid)) return { error: true, reason: "missing_author" };

      let fe = { engagement: null };
      try { fe = await getdislikes(v); } catch {}

      const [c1, c2] = await this.getColorsSafe(`https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`);

      const result = {
        json: videoData?.json?.video,
        video: videoData?.video,
        vid,
        comments,
        channel_uploads: p,
        engagement: fe.engagement,
        wiki: "",
        desc: "",
        color: c1,
        color2: c2
      };

      this.cache.set(v, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      this.initError("Error getting video", error);
      return { error: true, reason: "internal_error" };
    } finally {
      clearTimeout(outerTimeout);
    }
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  tubeApi: "https://inner-api.poketube.fun/api/",
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt: config.proxylocation === "EU" ? "https://invid-api.poketube.fun/api/v1" : "https://iv.ggtyler.dev/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
  useragent: config.useragent,
});

module.exports = pokeTubeApiCore;