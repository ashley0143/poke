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

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const { fetch } = await import("undici");

    if (!v) {
      this.initError("Missing video ID", null);
      return { error: true, message: "No video ID provided" };
    }

    // If cached result exists and is less than 1 hour old, return it
    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }

    const headers = {
      "User-Agent": this.useragent,
    };

    const fetchWithRetry = async (url, options = {}, maxRetryTime = 8000) => {
      let lastError;

      // Trigger statuses that arm the retry window
      const isTrigger = (s) => (s === 500 || s === 502);

      // Once armed, these are retryable (plus network errors)
      const RETRYABLE = new Set([429, 500, 502, 503, 504]);

      // Backoff (decorrelated jitter) — gentle defaults
      const MIN_DELAY_MS = 150;
      const BASE_DELAY_MS = 250;
      const MAX_DELAY_MS = 2000;
      const JITTER_FACTOR = 3;

      // Per-attempt timeout (only used after window is armed)
      const PER_TRY_TIMEOUT_MS = 2000;

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      // Parse Retry-After (delta-seconds or HTTP-date)
      const parseRetryAfter = (hdr) => {
        if (!hdr) return null;
        const s = String(hdr).trim();
        const delta = Number(s);
        if (Number.isFinite(delta)) return Math.max(0, (delta * 1000) | 0);
        const when = Date.parse(s);
        if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
        return null;
      };

      // FAST PATH: single plain fetch (no AbortController, no timeout, no extra work)
      let res;
      try {
        res = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            ...headers,
          },
        });
      } catch (err) {
        // Network error BEFORE any 500/502 trigger → surface immediately (no retries)
        this?.initError?.(`Fetch error for ${url}`, err);
        throw err;
      }

      if (res.ok) return res;

      // Not a trigger? return immediately (no retry window, no delays)
      if (!isTrigger(res.status)) return res;

      // SLOW PATH (only after a 500/502): arm the retry window
      const retryStart = Date.now();
      let delayMs = BASE_DELAY_MS; // backoff seed
      let attempt = 1;
      const callerSignal = options?.signal || null;

      // Helper: one attempt with internal timeout that respects caller aborts
      const attemptWithTimeout = async (timeoutMs) => {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(new Error("Fetch attempt timed out")),
          timeoutMs > 0 ? timeoutMs : 1
        );

        const onCallerAbort = () =>
          controller.abort(callerSignal?.reason || new Error("Aborted by caller"));

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

      // Retry loop within the maxRetryTime window
      while (true) {
        const elapsed = Date.now() - retryStart;
        const remaining = maxRetryTime - elapsed;
        if (remaining <= 0) {
          throw new Error(`Fetch failed for ${url} after ${maxRetryTime}ms`);
        }

        const perTryTimeout = Math.min(PER_TRY_TIMEOUT_MS, Math.max(100, remaining - 50));

        try {
          const r = await attemptWithTimeout(perTryTimeout);
          if (r.ok) return r;

          if (!RETRYABLE.has(r.status)) {
            // Non-retryable after window armed → return immediately
            return r;
          }

          // Respect server cooldown if provided
          const retryAfterMs = parseRetryAfter(r.headers.get("Retry-After"));
          let waitMs;
          if (retryAfterMs != null) {
            waitMs = Math.max(MIN_DELAY_MS, Math.min(retryAfterMs, Math.max(0, remaining - 10)));
          } else {
            // Decorrelated jitter: min(MAX, random(MIN, prev*factor))
            const next = Math.min(MAX_DELAY_MS, Math.random() * delayMs * JITTER_FACTOR);
            delayMs = next < MIN_DELAY_MS ? MIN_DELAY_MS : next;
            waitMs = Math.min(delayMs, Math.max(0, remaining - 10));
          }

          if (waitMs <= 0) {
            throw new Error(`Fetch failed for ${url} after ${maxRetryTime}ms (window depleted)`);
          }

          this?.initError?.(`Retrying fetch for ${url}`, r.status);
          attempt++;
          await sleep(waitMs);
          continue;
        } catch (err) {
          // Caller aborted → surface immediately
          if (callerSignal && callerSignal.aborted) throw err;

          lastError = err;

          const remaining2 = maxRetryTime - (Date.now() - retryStart);
          if (remaining2 <= 0) throw lastError;

          // Backoff after network/timeout errors, too
          const next = Math.min(MAX_DELAY_MS, Math.random() * delayMs * JITTER_FACTOR);
          delayMs = next < MIN_DELAY_MS ? MIN_DELAY_MS : next;
          const waitMs = Math.min(delayMs, Math.max(0, remaining2 - 10));
          if (waitMs <= 0) throw lastError;

          this?.initError?.(`Fetch error for ${url}`, err);
          attempt++;
          await sleep(waitMs);
          continue;
        }
      }
    };

    //
    // - Use 10-minute slots inside the hour (0-9,10-19,...,50-59) -> 6 slots per hour
    // - A 6-step pattern determines which API to prefer in each slot:
    //     ['fallback','normal','fallback','normal','normal','fallback']
    // - Every 2-hour block we invert the pattern (so it becomes the opposite),
    // - If the chosen API fails we immediately attempt the other API as a backup.
    //

    // pattern: index 0..5 correspond to minutes 0-9,10-19,...50-59
    const pattern = ["fallback", "normal", "fallback", "normal", "normal", "fallback"];

    // get current time info
    const now = new Date();
    const minute = now.getMinutes();
    const slotIndex = Math.floor(minute / 10) % 6; // 0..5

    // determine if we should invert the pattern for the current 2-hour block
    // Math.floor(hours / 2) gives 0 for 0-1, 1 for 2-3, 2 for 4-5, etc.
    // flip every other 2-hour block -> when blockIndex % 2 === 1 we invert
    const twoHourBlockIndex = Math.floor(now.getHours() / 2);
    const shouldInvert = (twoHourBlockIndex % 2) === 1;

    const slotDecision = pattern[slotIndex];
    // resolvedDecision is 'fallback' or 'normal' after possible inversion
    const resolvedDecision = shouldInvert ? (slotDecision === "fallback" ? "normal" : "fallback") : slotDecision;

    const primaryUrl = `${this.config.invapi}/videos/${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(
      Date.now()
    )}`;
    const fallbackUrl = `${this.config.inv_fallback}${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(
      Date.now()
    )}`;

    // chooseFirst is the one we try first based on the resolved decision
    const chooseFirst = resolvedDecision === "fallback" ? fallbackUrl : primaryUrl;
    const chooseSecond = resolvedDecision === "fallback" ? primaryUrl : fallbackUrl;

    try {
      const [invComments, videoInfo] = await Promise.all([
        // comments always hit the main invapi (unchanged)
        fetchWithRetry(
          `${this.config.invapi}/comments/${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(
            Date.now()
          )}`
        ).then((res) => res?.text()),
        // video info: try chosen API first, on failure try the other immediately
        (async () => {
          try {
            const r = await fetchWithRetry(chooseFirst);
            if (r.ok) return await r.text();
            // if we get here it means response not ok but not thrown (non-trigger or status)
            throw new Error(`First API ${chooseFirst} failed with ${r.status}`);
          } catch (err) {
            this.initError("Preferred API failed, trying backup", err);
            // immediate attempt to the other endpoint
            const r2 = await fetchWithRetry(chooseSecond);
            return await r2.text();
          }
        })(),
      ]);

      const comments = this.getJson(invComments);
      const vid = this.getJson(videoInfo);

      if (!vid) {
        this.initError("Video info missing/unparsable", v);
        return {
          error: true,
          message: "Sorry nya, we couldn't find any information about that video qwq",
        };
      }

      if (this.checkUnexistingObject(vid)) {
        let returnyoutubedislikesapi = { engagement: null };
        try {
          returnyoutubedisapi = await getdislikes(v);
        } catch (err) {
          this.initError("Dislike API error", err);
        }

        let color = "#0ea5e9";
        let color2 = "#111827";
        try {
          // `sqp` is a URL parameter used by YouTube thumbnail/image servers
          // to request a specific scale, crop or quality profile (base64-encoded),
          // controlling how the thumbnail is sized or compressed.
          const palette = await getColors(
            `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`
          );
          if (Array.isArray(palette) && palette[0] && palette[1]) {
            color = palette[0].hex();
            color2 = palette[1].hex();
          }
        } catch (err) {
          this.initError("Thumbnail color extraction error", err);
        }

        this.cache[v] = {
          result: {
            vid,
            comments,
            channel_uploads: " ",
            engagement: returnyoutubedisapi.engagement,
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
