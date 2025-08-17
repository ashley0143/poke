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
const config = require("../../config.json")

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

  backoffDelay(attempt, base = 160, cap = 12000) {
    const exp = Math.min(cap, base * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * (base + 1));
    return Math.min(cap, exp + jitter);
  }

  shouldRetryStatus(status) {
    if (!status) return true;
    if (status === 408 || status === 425 || status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    return false;
  }

  async fetchWithRetry(url, options = {}, cfg = {}) {
    const { fetch } = await import("undici");
    const maxRetries = Number.isInteger(cfg.retries) ? Math.max(0, cfg.retries) : 8;
    const baseDelay = cfg.baseDelay ?? 160;
    const maxDelay = cfg.maxDelay ?? 12000;
    const perAttemptTimeout = cfg.timeout ?? 12000;
    const extraRetryOn = cfg.retryOnStatuses || [];
    const uah = {
      "User-Agent": this.useragent,
    };
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(new Error("timeout")), perAttemptTimeout);
      try {
        const res = await fetch(url, {
          ...options,
          signal: ac.signal,
          headers: { ...(options.headers || {}), ...uah }
        });
        clearTimeout(t);
        if (res.ok) return res;
        const should = this.shouldRetryStatus(res.status) || extraRetryOn.includes(res.status);
        if (!should || attempt === maxRetries) return res;
      } catch (e) {
        clearTimeout(t);
        lastErr = e;
        if (attempt === maxRetries) throw e;
      }
      await this.wait(this.backoffDelay(attempt, baseDelay, maxDelay));
    }
    if (lastErr) throw lastErr;
    throw new Error("fetchWithRetry failed");
  }

  async hedgedGetJsonFromBases(bases, path, query) {
    const qs = query ? (query.startsWith("?") ? query : "?" + query) : "";
    const primary = `${bases[0]}${path}${qs}`;
    const secondary = bases[1] ? `${bases[1]}${path}${qs}` : null;
    const attemptOnce = async (url) => {
      const r = await this.fetchWithRetry(url, {}, { retries: 4, baseDelay: 120, maxDelay: 6000, timeout: 10000 });
      const tx = await r.text();
      return this.getJson(tx);
    };
    if (!secondary) return attemptOnce(primary);
    let winner;
    let errorPrimary, errorSecondary;
    const delayedSecondary = (async () => {
      await this.wait(300);
      return attemptOnce(secondary);
    })();
    const primaryP = attemptOnce(primary);
    try {
      winner = await Promise.any([primaryP, delayedSecondary]);
    } catch {
      try {
        const a = await primaryP;
        if (a) return a;
      } catch (e) {
        errorPrimary = e;
      }
      try {
        const b = await delayedSecondary;
        if (b) return b;
      } catch (e) {
        errorSecondary = e;
      }
      if (errorPrimary) throw errorPrimary;
      if (errorSecondary) throw errorSecondary;
      return null;
    }
    return winner;
  }

  async getColorsSafe(url) {
    for (let i = 0; i < 3; i++) {
      try {
        const c = await getColors(url);
        if (Array.isArray(c) && c[0] && c[1]) return [c[0].hex(), c[1].hex()];
      } catch {}
      await this.wait(this.backoffDelay(i, 120, 4000));
    }
    return ["#0ea5e9", "#111827"];
  }

  async curlGetWithRetry(url, httpHeader) {
    let lastErr = null;
    for (let i = 0; i <= 4; i++) {
      try {
        const res = await curly.get(url, { httpHeader, timeoutMs: 12000 });
        if (res && res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && res.data) return res;
        if (res && res.statusCode && !this.shouldRetryStatus(res.statusCode)) return res;
      } catch (e) {
        lastErr = e;
      }
      await this.wait(this.backoffDelay(i, 160, 8000));
    }
    if (lastErr) throw lastErr;
    throw new Error("curlGetWithRetry failed");
  }

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const { fetch } = await import("undici");
    if (v == null) return "Gib ID";
    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }
    const headers = {
      "User-Agent": this.useragent,
    };
    const bases = [this.config.invapi, this.config.invapi_alt];
    const b64ts = Buffer.from(String(Date.now())).toString("base64");
    const q = `hl=${contentlang}&region=${contentregion}&h=${b64ts}`;
    try {
      const [comments, vid, videoData] = await Promise.all([
        this.hedgedGetJsonFromBases(bases, `/comments/${v}`, q),
        this.hedgedGetJsonFromBases(bases, `/videos/${v}`, q),
        (async () => {
          const res = await this.curlGetWithRetry(`${this.config.tubeApi}video?v=${v}`, Object.entries(headers).map(([k, v]) => `${k}: ${v}`));
          const str = Buffer.isBuffer(res.data) ? res.data.toString("utf8") : String(res.data || "");
          const jsonStr = toJson(str);
          const video = this.getJson(jsonStr);
          return { json: jsonStr, video };
        })()
      ]);
      let p = {};
      if (f === "true" && vid && vid.authorId) {
        p = await this.hedgedGetJsonFromBases(bases, `/channels/${vid.authorId}`, `hl=${contentlang}&region=${contentregion}`);
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
          timestamp: Date.now(),
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
  useragent: config.useragent,
});

module.exports = pokeTubeApiCore;
