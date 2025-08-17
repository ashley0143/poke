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
  constructor(cfg) {
    this.config = cfg;
    this.cache = {}; // 1h video-level cache
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

    // undici primitives (lazy)
    this._fetch = null;
    this._agent = null;
    this._undiciInit = null;

    // Micro-caches (short TTLs)
    this._commentsCache = new Map(); // videoId -> {data, ts}
    this._channelCache = new Map();  // authorId -> {data, ts}

    // In-flight de-dup (so concurrent identical asks share one network trip)
    this._inflight = new Map();      // key -> Promise

    // Per-host circuit breaker state
    this._cb = new Map(); // host -> {fail: number, openUntil: number}
  }

  async _ensureUndici() {
    if (this._undiciInit) return this._undiciInit;
    this._undiciInit = (async () => {
      const { fetch, Agent, setGlobalDispatcher } = await import("undici");
      const agent = new Agent({
        keepAliveTimeout: 60_000,
        keepAliveMaxTimeout: 60_000,
        connections: 24, // push a bit harder
        pipelining: 1,
        maxRedirections: 2
      });
      setGlobalDispatcher(agent);
      this._fetch = fetch;
      this._agent = agent;
    })();
    return this._undiciInit;
  }

  getJson(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  checkUnexistingObject(obj) {
    return obj && "authorId" in obj;
  }

  async wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Decorrelated jitter backoff (fast caps)
  backoffDelay(attempt, base = 60, cap = 1600) {
    const prev = attempt === 0 ? base : Math.min(cap, base * Math.pow(2, attempt - 1));
    const next = Math.min(cap, base + Math.floor(Math.random() * (prev * 3)));
    return next;
  }

  shouldRetryStatus(status) {
    if (!status) return true;
    if (status === 408 || status === 425 || status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    // do not retry on common hard errors
    if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 410) return false;
    return false;
  }

  _mergeHeaders(a = {}, b = {}) {
    const o = { ...a };
    for (const k of Object.keys(b)) o[k] = b[k];
    return o;
  }

  _hostFromUrl(u) {
    try { return new URL(u).host; } catch { return ""; }
  }

  _cbIsOpen(host) {
    const s = this._cb.get(host);
    return s && s.openUntil && Date.now() < s.openUntil;
  }

  _cbReport(host, ok) {
    const s = this._cb.get(host) || { fail: 0, openUntil: 0 };
    if (ok) {
      s.fail = 0;
      s.openUntil = 0;
    } else {
      s.fail += 1;
      if (s.fail >= 3) {
        // open for a short period; we hedge to other bases meanwhile
        s.openUntil = Date.now() + 15_000;
      }
    }
    this._cb.set(host, s);
  }

  async fetchWithRetry(url, options = {}, cfg = {}) {
    await this._ensureUndici();
    const fetch = this._fetch;

    const maxRetries = Number.isInteger(cfg.retries) ? Math.max(0, cfg.retries) : 6;
    const baseDelay = cfg.baseDelay ?? 60;
    const maxDelay = cfg.maxDelay ?? 1600;
    const hardCapMs = cfg.hardCapMs ?? 7000; // aggressive total budget
    const extraRetryOn = cfg.retryOnStatuses || [];
    const started = Date.now();
    const host = this._hostFromUrl(url);

    const uah = {
      "User-Agent": this.useragent,
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br"
    };

    // If breaker open, we still *try* once quickly (in case it recovered),
    // but with tiny per-attempt budget to fail fast.
    const breakerPenalty = this._cbIsOpen(host) ? 300 : 0;

    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const elapsed = Date.now() - started;
      if (elapsed >= hardCapMs) break;

      const perAttemptBudget = Math.max(
        350 - breakerPenalty,
        Math.min(2000, hardCapMs - elapsed)
      );

      const ac = new AbortController();
      const tm = setTimeout(() => ac.abort(new Error("timeout")), perAttemptBudget);

      try {
        const res = await fetch(url, {
          ...options,
          signal: ac.signal,
          headers: this._mergeHeaders(options.headers, uah)
        });
        clearTimeout(tm);

        if (res.ok) {
          this._cbReport(host, true);
          return res;
        }

        const retryable = this.shouldRetryStatus(res.status) || extraRetryOn.includes(res.status);
        if (!retryable || attempt === maxRetries) {
          this._cbReport(host, false);
          return res;
        }

        // Honor Retry-After if present (429/503)
        const ra = res.headers.get("retry-after");
        if (ra) {
          let delay = 0;
          if (/^\d+$/.test(ra)) delay = parseInt(ra, 10) * 1000;
          else {
            const when = Date.parse(ra);
            if (!Number.isNaN(when)) delay = Math.max(0, when - Date.now());
          }
          if (delay > 0) {
            // cap to our budget but still respect server intent
            const cap = Math.min(delay, 3000);
            await this.wait(cap);
          }
        }
      } catch (e) {
        clearTimeout(tm);
        lastErr = e;
        if (attempt === maxRetries) {
          this._cbReport(host, false);
          throw e;
        }
      }

      const backoff = this.backoffDelay(attempt, baseDelay, maxDelay);
      const remain = hardCapMs - (Date.now()
