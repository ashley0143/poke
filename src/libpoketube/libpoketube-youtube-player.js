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
    this.useragent =
      config.useragent ||
      "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.INNERTUBE_CONTEXT_CLIENT_VERSION = "1";
    this.region = "region=US";
    this.sqp =
      "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";

    // rate protection state (initialized here so no new constructor is needed)
    // small, simple tokens per host to avoid spamming either API
    this._rl = {
      // host keys mapped to token buckets
      // capacity: max tokens, rate: tokens per second
      primary: { cap: 8, tokens: 8, rate: 1.0, last: Date.now(), cooldownUntil: 0, backoffMs: 0 },
      fallback: { cap: 8, tokens: 8, rate: 1.0, last: Date.now(), cooldownUntil: 0, backoffMs: 0 },
      // quick switch limit: how long to wait when both are depleted (ms)
      waitIfEmptyMs: 300,
    };
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

  // safe base64 helper so btoa isn't required in Node
  toBase64(str) {
    if (typeof btoa !== "undefined") return btoa(str);
    return Buffer.from(String(str)).toString("base64");
  }

  // refill tokens for a bucket
  _refill(bucket) {
    const now = Date.now();
    const elapsed = Math.max(0, (now - bucket.last) / 1000);
    if (elapsed <= 0) return;
    const add = elapsed * bucket.rate;
    if (add > 0) {
      bucket.tokens = Math.min(bucket.cap, bucket.tokens + add);
      bucket.last = now;
    }
  }

  // try to acquire a token from a named bucket; returns true if acquired
  _takeToken(name) {
    const b = this._rl[name];
    this._refill(b);
    if (b.tokens >= 1) {
      b.tokens = b.tokens - 1;
      return true;
    }
    return false;
  }

  // mark a host as having had a 429/soft-fail and put it on short cooldown
  _setCooldown(name, ms) {
    const b = this._rl[name];
    b.cooldownUntil = Date.now() + ms;
    // increase backoff a bit (capped)
    b.backoffMs = Math.min(60_000, (b.backoffMs || 0) ? Math.max(200, b.backoffMs * 1.5) : 200);
    console.log(`[LIBPT RL] ${name} cooldown ${ms}ms backoff ${b.backoffMs}ms`);
  }

  // clear backoff when host responds well
  _clearCooldown(name) {
    const b = this._rl[name];
    b.cooldownUntil = 0;
    b.backoffMs = 0;
  }

  // kill-switch check: returns true if host is allowed to be used now
  _hostAvailable(name) {
    const b = this._rl[name];
    if (!b) return true;
    if (Date.now() < (b.cooldownUntil || 0)) return false;
    return true;
  }

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const { fetch } = await import("undici");

    if (!v) {
      this.initError("Missing video ID", null);
      return { error: true, message: "No video ID provided" };
    }

    // simple 1-hour cache
    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }

    const headers = {
      "User-Agent": this.useragent,
    };

    // - short per-try timeout
    // - small fixed sleep between tries
    // - honors Retry-After if provided
    const fetchWithRetry = async (url, options = {}, maxRetryTime = 5000, hostName = "primary") => {
      const RETRYABLE = new Set([429, 500, 502, 503, 504]);
      const PER_TRY_TIMEOUT_MS = 1200; // fail fast
      const FIXED_RETRY_DELAY_MS = 120; // quick retry gap
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const parseRetryAfter = (hdr) => {
        if (!hdr) return null;
        const s = String(hdr).trim();
        const numeric = Number(s);
        if (Number.isFinite(numeric)) return Math.max(0, numeric * 1000 | 0);
        const when = Date.parse(s);
        if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
        return null;
      };

      const callerSignal = options?.signal || null;

      const attemptFetch = async (timeoutMs) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error("Fetch attempt timed out")), timeoutMs > 0 ? timeoutMs : 1);
        const onCallerAbort = () => controller.abort(callerSignal?.reason || new Error("Aborted by caller"));
        if (callerSignal) {
          if (callerSignal.aborted) {
            controller.abort(callerSignal.reason || new Error("Aborted by caller"));
          } else {
            callerSignal.addEventListener("abort", onCallerAbort, { once: true });
          }
        }
        try {
          return await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              ...headers,
            },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
          if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
        }
      };

      const start = Date.now();
      let lastErr = null;

      while (true) {
        const elapsed = Date.now() - start;
        const remaining = maxRetryTime - elapsed;
        if (remaining <= 0) {
          const err = new Error(`Fetch failed for ${url} after ${maxRetryTime}ms`);
          err.cause = lastErr;
          throw err;
        }

        const perTryTimeout = Math.min(PER_TRY_TIMEOUT_MS, Math.max(100, remaining - 50));

        try {
          const res = await attemptFetch(perTryTimeout);
          if (res.ok) {
            // good response: reset backoff for host
            if (hostName) this._clearCooldown(hostName);
            return res;
          }
          if (!RETRYABLE.has(res.status)) return res;

          // retryable status -> respect Retry-After if present, otherwise short fixed delay
          const ra = parseRetryAfter(res.headers.get("Retry-After"));
          const waitMs = ra != null ? Math.max(50, Math.min(ra, remaining - 10)) : Math.min(FIXED_RETRY_DELAY_MS, Math.max(0, remaining - 10));
          if (waitMs <= 0) throw new Error(`Fetch failed for ${url} after ${maxRetryTime}ms (window depleted)`);

          // if 429, put that host on short cooldown to reduce spam
          if (res.status === 429 && hostName) {
            // safe, short cooldown
            this._setCooldown(hostName, Math.max(300, this._rl[hostName].backoffMs || 300));
          }

          console.log(`Retrying fetch for ${url} status=${res.status}`);
          await sleep(waitMs);
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        } catch (err) {
          if (callerSignal && callerSignal.aborted) throw err;
          lastErr = err;
          const remaining2 = maxRetryTime - (Date.now() - start);
          if (remaining2 <= 0) throw lastErr;
          // short fixed pause, then retry quickly
          await sleep(Math.min(FIXED_RETRY_DELAY_MS, Math.max(20, remaining2 - 10)));
          continue;
        }
      }
    };

    const minute = new Date().getMinutes();
    const hour = new Date().getHours();

    const pattern = ["fallback", "normal", "fallback", "normal", "normal", "fallback"];
    const twoHourIndex = Math.floor(hour / 2) % pattern.length;
    const currentPreference = pattern[twoHourIndex];

    const inFallbackWindow = minute >= 20 && minute < 30;

    const primaryUrl = `${this.config.invapi}/videos/${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`;
    const fallbackUrl = `${this.config.inv_fallback}${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`;

    const preferFallbackPrimary = currentPreference === "fallback";
    const chooseFirst = preferFallbackPrimary ? (inFallbackWindow ? fallbackUrl : primaryUrl) : (inFallbackWindow ? primaryUrl : fallbackUrl);
    const chooseSecond = chooseFirst === primaryUrl ? fallbackUrl : primaryUrl;

    // map url -> short name for RL logic
    const urlName = (u) => (u === primaryUrl ? "primary" : "fallback");

    // Race strategy adjusted to respect tokens and cooldowns
    const fetchPrefer = async (urlA, urlB, maxRetryTime = 5000) => {
      const nameA = urlName(urlA);
      const nameB = urlName(urlB);

      // helper to decide whether to start a request immediately or pick the other host
      const chooseOrder = () => {
        // if preferred host is in cooldown or has no token, try the other first
        const aOK = this._hostAvailable(nameA);
        const bOK = this._hostAvailable(nameB);

        const aTok = this._takeToken(nameA);
        if (aTok) {
          // token taken for A
          return [{ url: urlA, name: nameA, tokenAcquired: true }, { url: urlB, name: nameB, tokenAcquired: false }];
        }

        // couldn't get token for A; try B
        const bTok = this._takeToken(nameB);
        if (bTok) {
          return [{ url: urlB, name: nameB, tokenAcquired: true }, { url: urlA, name: nameA, tokenAcquired: false }];
        }

        // both empty: small wait to allow refill, but don't stall users too long
        return null;
      };

      let order = chooseOrder();
      if (!order) {
        // both were empty, wait a tiny bit to allow refill
        await new Promise((r) => setTimeout(r, this._rl.waitIfEmptyMs));
        order = chooseOrder();
        if (!order) {
          // still empty -> fall back to starting both immediately without token assumption
          order = [{ url: urlA, name: nameA, tokenAcquired: false }, { url: urlB, name: nameB, tokenAcquired: false }];
        }
      }

      // controllers so we can abort the loser
      const acA = new AbortController();
      const acB = new AbortController();

      const wrapped = (url, ac, hostName) =>
        fetchWithRetry(url, { signal: ac.signal }, maxRetryTime, hostName)
          .then((res) => ({ url, res, hostName }))
          .catch((err) => ({ url, err, hostName }));

      // start both in parallel (fast). If token was taken for one, we prefer its result.
      const p1 = wrapped(order[0].url, acA, order[0].name);
      const p2 = wrapped(order[1].url, acB, order[1].name);

      const settled = await Promise.allSettled([p1, p2]);

      // 1) prefer an OK response from whichever host we actually took a token for
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.res && s.value.res.ok) {
          // abort other
          if (s.value.url === order[0].url) acB.abort();
          else acA.abort();
          // clear any small cooldown if it served ok
          this._clearCooldown(s.value.hostName);
          return s.value.res;
        }
      }

      // 2) prefer any OK response
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.res && s.value.res.ok) {
          if (s.value.url === order[0].url) acB.abort();
          else acA.abort();
          this._clearCooldown(s.value.hostName);
          return s.value.res;
        }
      }

      // 3) prefer any fulfilled response (non-OK)
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.res) {
          if (s.value.url === order[0].url) acB.abort();
          else acA.abort();
          // if it's 429, set cooldown
          try {
            const st = s.value.res.status;
            if (st === 429) this._setCooldown(s.value.hostName, Math.max(300, this._rl[s.value.hostName].backoffMs || 300));
          } catch (e) {}
          return s.value.res;
        }
      }

      // 4) throw first error
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.err) {
          // if error looks like a timeout, put small backoff on that host
          this._setCooldown(s.value.hostName, 200);
          throw s.value.err;
        }
        if (s.status === "rejected" && s.reason) {
          throw s.reason;
        }
      }

      throw new Error("Both fetches failed");
    };

    try {
      // fetch comments in parallel with a smaller window
      const invCommentsPromise = fetchWithRetry(
        `${this.config.invapi}/comments/${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`,
        {},
        2500,
        "primary"
      )
        .then((r) => r?.text())
        .catch((err) => {
          this.initError("Comments fetch error", err);
          return null;
        });

      // video info: pick whichever responds first (primary/fallback ordering preserved)
      const videoInfoPromise = (async () => {
        const r = await fetchPrefer(chooseFirst, chooseSecond, 5000);
        return await r.text();
      })();

      const [invComments, videoInfo] = await Promise.all([invCommentsPromise, videoInfoPromise]);

      const comments = this.getJson(invComments);
      const vid = this.getJson(videoInfo);

      if (!vid) {
        this.initError("Video info missing/unparsable", v);
        return {
          error: true,
          message:
            "Sorry nya, we couldn't find any information about that video qwq",
        };
      }

      if (this.checkUnexistingObject(vid)) {
        // Run dislikes and color extraction in parallel with short internal timeouts
        const dislikePromise = (async () => {
          try {
            return await getdislikes(v);
          } catch (err) {
            this.initError("Dislike API error", err);
            return { engagement: null };
          }
        })();

        const colorPromise = (async () => {
          try {
            const imgUrl = `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`;
            const p = getColors(imgUrl);
            const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Color extraction timeout")), 1000));
            const palette = await Promise.race([p, timeout]);
            if (Array.isArray(palette) && palette[0] && palette[1]) {
              return [palette[0].hex(), palette[1].hex()];
            }
            return null;
          } catch (err) {
            this.initError("Thumbnail color extraction error", err);
            return null;
          }
        })();

        const [returnyoutubedislikesapi, paletteResult] = await Promise.all([dislikePromise, colorPromise]);

        let color = "#0ea5e9";
        let color2 = "#111827";
        if (Array.isArray(paletteResult) && paletteResult[0]) {
          color = paletteResult[0] || color;
          color2 = paletteResult[1] || color2;
        }

        this.cache[v] = {
          result: {
            vid,
            comments,
            channel_uploads: " ",
            engagement: returnyoutubedislikesapi?.engagement ?? null,
            wiki: "",
            desc: "",
            color,
            color2,
          },
          timestamp: Date.now(),
        };

        return this.cache[v].result;
      } else {
        this.initError(vid, `ID: ${v}`);
      }
    } catch (error) {
      this.initError(`Error getting video ${v}`, error);
      return { error: true, message: "Fetch error", detail: String(error) };
    }
  }

  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") {
      return /^([a-zA-Z0-9_-]{11})$/.test(v);
    }
    return false;
  }

  initError(context, error) {
    console.log("[LIBPT CORE ERROR]", context, error?.stack || error || "");
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  inv_fallback: "https://poketube.duti.dev/api/v1/videos/",
  useragent: config.useragent,
});

module.exports = pokeTubeApiCore;
