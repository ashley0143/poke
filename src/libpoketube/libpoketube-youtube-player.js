/**
 * Poke is a Free/Libre YouTube front-end!
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

const getdislikes = require("../libpoketube/libpoketube-dislikes.js");
const getColors = require("get-image-colors");
const config = require("../../config.json");

class BackendScheduler {
  constructor(opts = {}) {
    this.buckets = new Map(); // key -> {tokens, lastRefill, rate, burst, cooldownUntil}
    this.queues = new Map(); // key -> [resolveFns]
    this.opts = {
      defaultRatePerSec: opts.defaultRatePerSec || 4, // default steady rate
      defaultBurst: opts.defaultBurst || 8, // allowed burst
      refillIntervalMs: opts.refillIntervalMs || 250,
      cooldownDefaultMs: opts.cooldownDefaultMs || 2000,
      maxQueueSize: opts.maxQueueSize || 200,
      ...opts,
    };

    // periodic refill
    this._refillTimer = setInterval(() => this._refillAll(), this.opts.refillIntervalMs);
    this._refillTimer.unref?.();
  }

  _getBucket(key) {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: this.opts.defaultBurst,
        lastRefill: Date.now(),
        rate: this.opts.defaultRatePerSec,
        burst: this.opts.defaultBurst,
        cooldownUntil: 0,
      });
    }
    return this.buckets.get(key);
  }

  _refillAll() {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (b.cooldownUntil > now) continue;
      const elapsed = now - b.lastRefill;
      if (elapsed <= 0) continue;
      const add = (elapsed / 1000) * b.rate;
      if (add > 0) {
        b.tokens = Math.min(b.burst, b.tokens + add);
        b.lastRefill = now;
      }
    }
    // drain small queues if tokens available
    for (const [k, q] of this.queues) {
      const b = this.buckets.get(k);
      if (!b) continue;
      while (q.length && b.tokens >= 1 && b.cooldownUntil <= now) {
        b.tokens -= 1;
        const fn = q.shift();
        fn(); // resolve queued waiter
      }
    }
  }

  // request permission to call backend `key` within `timeoutMs`.
  // resolves when caller may proceed, or rejects on timeout.
  acquire(key, timeoutMs = 1000) {
    const bucket = this._getBucket(key);
    const now = Date.now();

    // if in cooldown, wait until cooldown passes (or timeout)
    if (bucket.cooldownUntil > now) {
      return new Promise((res, rej) => {
        const wait = bucket.cooldownUntil - now;
        if (wait > timeoutMs) return rej(new Error("acquire timeout (cooldown)"));
        const t = setTimeout(() => res(), wait);
        // no further cleanup here; caller will proceed after resolve
      });
    }

    // if token available, take one immediately
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return Promise.resolve();
    }

    // otherwise enqueue up to maxQueueSize
    const q = this.queues.get(key) || [];
    if (q.length >= this.opts.maxQueueSize) {
      return Promise.reject(new Error("acquire queue full"));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // remove from queue if still present
        const arr = this.queues.get(key);
        if (arr) {
          const idx = arr.indexOf(fn);
          if (idx !== -1) arr.splice(idx, 1);
        }
        reject(new Error("acquire timeout"));
      }, timeoutMs);

      const fn = () => {
        clearTimeout(timer);
        resolve();
      };

      q.push(fn);
      this.queues.set(key, q);
    });
  }

  // flag backend into cooldown (on 429). Accepts ms or parsed Retry-After
  setCooldown(key, ms) {
    const b = this._getBucket(key);
    const until = Date.now() + Math.max(0, ms || this.opts.cooldownDefaultMs);
    // progressively increase if already in cooldown
    b.cooldownUntil = Math.max(b.cooldownUntil, until);
    // reduce tokens to zero to avoid immediate retries
    b.tokens = 0;
  }

  // convenience: adjust rate/burst for a backend
  configure(key, { ratePerSec, burst } = {}) {
    const b = this._getBucket(key);
    if (ratePerSec != null) b.rate = ratePerSec;
    if (burst != null) { b.burst = burst; b.tokens = Math.min(b.tokens, b.burst); }
  }

  stop() {
    clearInterval(this._refillTimer);
    this.buckets.clear();
    this.queues.clear();
  }
}

class InnerTubePokeVidious {
  constructor(config) {
    this.config = config;
    this.cache = {};
    this.inflight = new Map(); // dedupe in-flight video requests by id
    this.language = "hl=en-US";
    this.param = "2AMB";
    this.param_legacy = "CgIIAdgDAQ%3D%3D";
    this.apikey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    this.ANDROID_API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
    this.ANDROID_APP_VERSION = "20.20.41";
    this.ANDROID_VERSION = "16";
    this.useragent =
      config.useragent ||
      "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.INNERTUBE_CONTEXT_CLIENT_VERSION = "1";
    this.region = "region=US";
    this.sqp =
      "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";

    // scheduler instance shared across calls
    this.scheduler = new BackendScheduler({
      // tune rates here if needed
      defaultRatePerSec: (config.backendRatePerSec) || 6,
      defaultBurst: (config.backendBurst) || 12,
      refillIntervalMs: 200,
      cooldownDefaultMs: 2200,
      maxQueueSize: 400,
    });

    // small stagger when trying fallback to avoid simultaneous double hits
    this.fallbackStaggerMs = config.fallbackStaggerMs ?? 80;
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

  toBase64(str) {
    if (typeof btoa !== "undefined") return btoa(str);
    return Buffer.from(String(str)).toString("base64");
  }

  // parse Retry-After header to ms
  _parseRetryAfterMs(hdr) {
    if (!hdr) return null;
    const s = String(hdr).trim();
    const n = Number(s);
    if (Number.isFinite(n)) return Math.max(0, n * 1000 | 0);
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return Math.max(0, t - Date.now());
    return null;
  }

  // streamlined fetch-with-retry that consults scheduler before calling.
  // - always respects an overall maxRetryTime (ms)
  async _fetchWithRetryAndSchedule(url, backendKey, options = {}, maxRetryTime = 5000) {
    const { fetch } = await import("undici");
    const RETRYABLE = new Set([429, 500, 502, 503, 504]);
    const PER_TRY_TIMEOUT_MS = 1100;
    const QUICK_RETRY_MS = 80;

    const start = Date.now();
    let lastError = null;

    while (true) {
      const elapsed = Date.now() - start;
      const remaining = maxRetryTime - elapsed;
      if (remaining <= 0) {
        const e = new Error(`fetch ${url} failed after ${maxRetryTime}ms`);
        e.cause = lastError;
        throw e;
      }

      // acquire slot for backend (short timeout to bail quickly)
      try {
        await this.scheduler.acquire(backendKey, Math.min(600, remaining));
      } catch (err) {
        // scheduler blocked; retry loop until overall window exhausted
        lastError = err;
        await new Promise((r) => setTimeout(r, Math.min(QUICK_RETRY_MS, Math.max(10, remaining - 20))));
        continue;
      }

      // make attempt with small per-try timeout
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(new Error("attempt timeout")), Math.min(PER_TRY_TIMEOUT_MS, Math.max(80, remaining - 50)));
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            ...(options?.headers || {}),
            "User-Agent": this.useragent,
          },
          signal: ac.signal,
        });
        if (res.ok) {
          clearTimeout(timer);
          return res;
        }

        // handle 429 specially: put backend into cooldown based on Retry-After or quick default
        if (res.status === 429) {
          const ra = this._parseRetryAfterMs(res.headers.get("Retry-After")) || 1500;
          this.scheduler.setCooldown(backendKey, ra);
          lastError = new Error(`HTTP 429`);
          // small delay then retry loop
          await new Promise((r) => setTimeout(r, Math.min(ra, Math.max(60, remaining - 20))));
          clearTimeout(timer);
          continue;
        }

        // non-retryable pass-through
        if (!RETRYABLE.has(res.status)) {
          clearTimeout(timer);
          return res;
        }

        // retryable status: quick wait then retry
        lastError = new Error(`HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, Math.min(QUICK_RETRY_MS, Math.max(20, remaining - 20))));
        clearTimeout(timer);
        continue;
      } catch (err) {
        // aborted by signal or network error
        lastError = err;
        // if fetch was aborted because scheduler aborts, treat as retryable
        await new Promise((r) => setTimeout(r, Math.min(QUICK_RETRY_MS, Math.max(10, remaining - 20))));
        clearTimeout(timer);
        continue;
      }
    }
  }

  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") {
      return /^([a-zA-Z0-9_-]{11})$/.test(v);
    }
    return false;
  }

  initError(context, error) {
    // log with context
    console.log("[LIBPT CORE ERROR]", context, error?.stack || error || "");
  }

  // main public method
  async getYouTubeApiVideo(f, v, contentlang = "en-US", contentregion = "US") {
    // quick validation
    if (!v) {
      this.initError("Missing video ID", null);
      return { error: true, message: "No video ID provided" };
    }
    if (!this.isvalidvideo(v)) {
      this.initError("Invalid video id", v);
      return { error: true, message: "Invalid video id" };
    }

    // cache hit
    const cached = this.cache[v];
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.result;
    }

    // dedupe simultaneous requests for same id
    if (this.inflight.has(v)) {
      return this.inflight.get(v);
    }

    const promise = (async () => {
      const { fetch } = await import("undici");

      const minute = new Date().getMinutes();
      const hour = new Date().getHours();

      // pattern to bias primary vs fallback across 2-hour blocks
      const pattern = ["fallback", "normal", "fallback", "normal", "normal", "fallback"];
      const twoHourIndex = Math.floor(hour / 2) % pattern.length;
      const currentPreference = pattern[twoHourIndex];

      // explicit fallback window on :20 - :29
      const inFallbackWindow = minute >= 20 && minute < 30;

      const primaryUrl = `${this.config.invapi}/videos/${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`;
      const fallbackUrl = `${this.config.inv_fallback}${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`;

      const preferFallbackPrimary = currentPreference === "fallback";
      const chooseFirst = preferFallbackPrimary ? (inFallbackWindow ? fallbackUrl : primaryUrl) : (inFallbackWindow ? primaryUrl : fallbackUrl);
      const chooseSecond = chooseFirst === primaryUrl ? fallbackUrl : primaryUrl;

      const backendKeyA = new URL(chooseFirst).origin;
      const backendKeyB = new URL(chooseSecond).origin;

      // comments fetch started in parallel but with small window
      const commentsPromise = this._fetchWithRetryAndSchedule(
        `${this.config.invapi}/comments/${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`,
        new URL(this.config.invapi).origin,
        {},
        2500
      )
        .then((r) => r?.text())
        .catch((err) => {
          this.initError("Comments fetch error", err);
          return null;
        });

      // strategy: start primary immediately. start fallback after fallbackStaggerMs if primary still pending.
      // both flows use scheduler to avoid rate spikes.
      const startPrimary = async () => {
        try {
          const r = await this._fetchWithRetryAndSchedule(chooseFirst, backendKeyA, {}, 5000);
          return { res: r, url: chooseFirst };
        } catch (err) {
          return { err, url: chooseFirst };
        }
      };

      const startFallback = async () => {
        try {
          const r = await this._fetchWithRetryAndSchedule(chooseSecond, backendKeyB, {}, 5000);
          return { res: r, url: chooseSecond };
        } catch (err) {
          return { err, url: chooseSecond };
        }
      };

      // kick off primary
      const pPrimary = startPrimary();

      // schedule fallback with a small stagger
      const fallbackTimer = new Promise((res) =>
        setTimeout(() => res(true), this.fallbackStaggerMs)
      );

      // race logic: wait for whichever returns OK first, but prefer not to fire fallback if primary finished.
      const raceResult = await (async () => {
        // wait for either primary to finish quickly, or stagger timeout
        const first = await Promise.race([pPrimary, fallbackTimer]);

        if (first && first.res === undefined && first.err === undefined) {
          // reached fallback timer: start fallback while primary may still be running
          const pFallback = startFallback();
          // wait for first successful OK from either
          const settled = await Promise.allSettled([pPrimary, pFallback]);
          // prefer OK
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value && s.value.res && s.value.res.ok) return s.value;
          }
          // otherwise pick first fulfilled with res
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value && s.value.res) return s.value;
          }
          // otherwise return first error
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value && s.value.err) return s.value;
          }
          // if still nothing, throw aggregate
          throw new Error("Both upstreams failed");
        } else {
          // primary finished before fallback timer
          if (first && first.res) {
            return first;
          }
          // primary returned error object
          // start fallback immediately
          const pFallback = startFallback();
          const settled = await Promise.allSettled([pPrimary, pFallback]);
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value && s.value.res && s.value.res.ok) return s.value;
          }
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value && s.value.res) return s.value;
          }
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value && s.value.err) return s.value;
          }
          throw new Error("Both upstreams failed");
        }
      })();

      // if result is an error object, surface small message
      if (raceResult.err) {
        this.initError("Primary+Fallback fetch error", raceResult.err);
        throw raceResult.err;
      }

      // got a Response-like object
      const r = raceResult.res;
      const videoInfoText = await r.text().catch((e) => {
        this.initError("Reading response text failed", e);
        return null;
      });

      const commentsText = await commentsPromise;
      const comments = this.getJson(commentsText);
      const vid = this.getJson(videoInfoText);

      if (!vid) {
        this.initError("Video info missing/unparsable", v);
        return {
          error: true,
          message: "Couldn't parse video info",
        };
      }

      if (this.checkUnexistingObject(vid)) {
        // fill cache quickly with defaults so response is fast
        const baseResult = {
          vid,
          comments,
          channel_uploads: " ",
          engagement: null,
          wiki: "",
          desc: "",
          color: "#0ea5e9",
          color2: "#111827",
        };

        this.cache[v] = {
          result: baseResult,
          timestamp: Date.now(),
        };

        // run heavy/slow tasks async: dislikes + color extraction update cache when done
        (async () => {
          try {
            // dislikes (may be slow)
            let dislikesRes = { engagement: null };
            try {
              dislikesRes = await getdislikes(v);
            } catch (err) {
              this.initError("Dislike API error (async)", err);
            }

            // color extraction with short timeout
            try {
              const imgUrl = `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`;
              const p = getColors(imgUrl);
              const to = new Promise((_, rej) => setTimeout(() => rej(new Error("color timeout")), 1000));
              const palette = await Promise.race([p, to]).catch(() => null);
              if (Array.isArray(palette) && palette[0] && palette[1]) {
                baseResult.color = palette[0].hex();
                baseResult.color2 = palette[1].hex();
              }
            } catch (err) {
              this.initError("Color extraction error (async)", err);
            }

            // update engagement & cache timestamp
            baseResult.engagement = dislikesRes?.engagement ?? baseResult.engagement;
            this.cache[v] = {
              result: baseResult,
              timestamp: Date.now(),
            };
          } catch (err) {
            this.initError("Async post-processing error", err);
          }
        })();

        return baseResult;
      } else {
        this.initError(vid, `ID: ${v}`);
      }
    })();

    // store and clear inflight when done
    this.inflight.set(v, promise);
    try {
      const res = await promise;
      return res;
    } finally {
      this.inflight.delete(v);
    }
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  inv_fallback: "https://poketube.duti.dev/api/v1/videos/",
  useragent: config.useragent,
});

module.exports = pokeTubeApiCore;
