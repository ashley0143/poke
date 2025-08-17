/**
 * Poke is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

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
    this.debugErrors = !!cfg.debugErrors || process.env.POKETUBE_DEBUG_ERRORS === "1";
  }

  // ---------- Utilities ----------
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
  nowIso() { return new Date().toISOString(); }
  newRequestId() { return Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64url"); }

  buildFriendlyMessage(reason, videoId) {
    const common = " If this keeps happening, please try again later or check the video link.";
    switch (reason) {
      case "invalid_video_id":
        return `Sorry nya, that doesn't look like a valid YouTube video ID (needs 11 letters/numbers). qwq Please double-check the link.${common}`;
      case "not_found_or_unparsable":
        return `Sorry nya, we couldn't load details for this video right now. qwq It may be unavailable or upstream returned something we couldn't read.${common}`;
      case "missing_author":
        return `Sorry nya, this video's channel info was missing so we couldn't finish loading it. qwq${common}`;
      case "upstream_http_error":
        return `Sorry nya, an upstream service returned an error while fetching this video. qwq${common}`;
      case "upstream_timeout":
        return `Sorry nya, the request took too long and timed out while getting video info. qwq${common}`;
      case "aborted":
        return `Sorry nya, the request was canceled before we finished. qwq${common}`;
      case "internal_error":
      default:
        return `Sorry nya, something went wrong while loading this video. qwq Our bad!${common}`;
    }
  }

  buildError({ reason, status, url, videoId, requestId, retryAfterMs, originalError, meta }) {
    const retryable = this.shouldRetryStatus(status) || reason === "upstream_timeout";
    const message = this.buildFriendlyMessage(reason, videoId);
    const err = {
      error: true,
      reason,
      message,
      status: status ?? null,
      retryable,
      recommendedWaitMs: retryAfterMs || (retryable ? 1500 : 0),
      url: url || null,
      videoId: videoId || null,
      requestId: requestId || this.newRequestId(),
      timestamp: this.nowIso(),
      hints: [
        "Check that the video ID has exactly 11 characters (letters, numbers, '-' or '_').",
        "The video may be private, region-locked, age-gated, or removed.",
        "Try again in a minute (rate limits/temporary errors happen)."
      ],
      meta: meta || {}
    };
    if (this.debugErrors && originalError) {
      err.debug = {
        name: originalError.name || "Error",
        message: String(originalError.message || originalError),
        stack: typeof originalError.stack === "string" ? originalError.stack : null
      };
    }
    return err;
  }

  initError(a, e) {
    console.error("[LIBPT CORE ERROR]", a, e && e.stack ? e.stack : e);
  }

  // ---------- HTTP helpers ----------
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
      const res = await this.fetchWithRetry(u, {}, { retries: 4, baseDelay: 120, maxDelay: 6000, timeout: 10000 }, outerSignal);
      const tx = await res.text();
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} while fetching ${u}`);
        err.name = "HTTPError";
        err.status = res.status;
        err.url = u;
        err.bodySnippet = tx.slice(0, 800);
        throw err;
      }
      const js = this.getJson(tx);
      if (!js) {
        const err = new Error(`Unparsable JSON from ${u}`);
        err.name = "ParseError";
        err.url = u;
        err.bodySnippet = tx.slice(0, 800);
        throw err;
      }
      return js;
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

  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") return /^([a-zA-Z0-9_-]{11})$/.test(v);
    return false;
  }

  // ---------- Main API ----------
  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const requestId = this.newRequestId();
    if (!this.isvalidvideo(v)) {
      return this.buildError({ reason: "invalid_video_id", videoId: v, requestId });
    }
    const cached = this.cache.get(v);
    if (cached && Date.now() - cached.timestamp < 3600000) return cached.result;
    const bases = [this.config.invapi, this.config.invapi_alt];
    const b64ts = Buffer.from(String(Date.now())).toString("base64");
    const q = `hl=${contentlang}&region=${contentregion}&h=${b64ts}`;
    const outer = new AbortController();
    const outerTimeout = setTimeout(() => outer.abort(new Error("global-timeout")), 18000);
    try {
      const [comments, vid] = await Promise.all([
        this.hedgedGetJsonFromBases(bases, `/comments/${v}`, q, outer.signal),
        this.hedgedGetJsonFromBases(bases, `/videos/${v}`, q, outer.signal)
      ]);
      if (!vid) {
        return this.buildError({ reason: "not_found_or_unparsable", videoId: v, requestId, meta: { bases, path: `/videos/${v}` } });
      }
      let channelUploads = {};
      if (f === "true" && vid.authorId) {
        try {
          channelUploads = await this.hedgedGetJsonFromBases(bases, `/channels/${vid.authorId}`, `hl=${contentlang}&region=${contentregion}`, outer.signal) || {};
        } catch (e) {
          if (this.debugErrors) channelUploads = { _error: { name: e.name, message: e.message } };
        }
      }
      if (!this.checkUnexistingObject(vid)) {
        return this.buildError({ reason: "missing_author", videoId: v, requestId, meta: { gotKeys: Object.keys(vid || {}) } });
      }
      let fe = { engagement: null };
      try { fe = await getdislikes(v); } catch (e) {
        if (this.debugErrors) fe = { engagement: null, _error: { name: e.name, message: e.message } };
      }
      const [c1, c2] = await this.getColorsSafe(`https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`);
      const result = {
        vid,
        comments,
        channel_uploads: channelUploads,
        engagement: fe.engagement,
        wiki: "",
        desc: "",
        color: c1,
        color2: c2,
        requestId,
        fetchedAt: this.nowIso()
      };
      this.cache.set(v, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      const isAbort = (error && (error.name === "AbortError" || error.message === "aborted" || error.message === "global-timeout" || error.message === "timeout"));
      const reason = isAbort ? (error.message === "timeout" || error.message === "global-timeout" ? "upstream_timeout" : "aborted") : "internal_error";
      this.initError("Error getting video", error);
      return this.buildError({ reason, videoId: v, requestId, originalError: error });
    } finally {
      clearTimeout(outerTimeout);
    }
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt: config.proxylocation === "EU" ? "https://invid-api.poketube.fun/api/v1" : "https://iv.ggtyler.dev/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
  useragent: config.useragent,
  debugErrors: true
});

module.exports = pokeTubeApiCore;
