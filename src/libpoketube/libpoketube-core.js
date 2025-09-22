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


// Retries are allowed ONLY within a 5s window that starts after the first 500/502.
// Outside that, it returns immediately on non-trigger statuses or successes.
 const fetchWithRetry = async (url, options = {}, maxRetryTime = 5000) => {
  let lastError;

  // Window trigger: seeing these statuses starts the retry window
  const RETRY_WINDOW_TRIGGER = new Set([500, 502]);

  // Once armed, we consider these retryable (plus network errors)
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

  // Backoff parameters (decorrelated jitter style)
  const MIN_DELAY_MS = 150;      // mandatory minimum delay to avoid tight loops
  const BASE_DELAY_MS = 250;     // starting average delay
  const MAX_DELAY_MS = 2000;     // upper cap between attempts
  const JITTER_FACTOR = 3;       // larger -> more spread (per "decorrelated jitter")

  // Per-attempt timeout so a single hang doesn't hog the whole window
  const DEFAULT_PER_TRY_TIMEOUT = 2000;

  // Small helper
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Respect caller AbortSignal if provided
  const callerSignal = options?.signal || null;

  // Parse Retry-After: either delta-seconds or HTTP-date
  const parseRetryAfter = (hdr) => {
    if (!hdr) return null;
    const s = String(hdr).trim();
    const delta = Number(s);
    if (Number.isFinite(delta)) return Math.max(0, Math.round(delta * 1000));
    const when = Date.parse(s);
    if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
    return null;
  };

  // One attempt with an internal timeout + caller abort propagation
  const attemptWithTimeout = async (timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("Fetch attempt timed out")),
      Math.max(1, timeoutMs)
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
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          ...headers, // keep your global headers merge
        },
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
    }
  };

  // Decorrelated jitter backoff:
  // delay = min(MAX, random(MIN, prevDelay * JITTER_FACTOR))
  let delayMs = BASE_DELAY_MS;

  // First attempt: no window, no delay
  try {
    const firstRes = await attemptWithTimeout(DEFAULT_PER_TRY_TIMEOUT);
    if (firstRes.ok) return firstRes;

    // If not a trigger (500/502), return immediately (no window starts)
    if (!RETRY_WINDOW_TRIGGER.has(firstRes.status)) {
      return firstRes;
    }

    // Otherwise, arm the window and fall through to retry loop
    lastError = new Error(`Initial ${firstRes.status} from ${url}`);
  } catch (err) {
    // Network/timeout error before trigger -> do not start window; surface immediately
    lastError = err;
    this?.initError?.(`Fetch error for ${url}`, err);
    throw lastError;
  }

  // Retry loop: window ARMED because we saw a 500/502
  const retryStart = Date.now();
  let attempt = 1; // we already had one failed 500/502 attempt

  while (true) {
    const elapsed = Date.now() - retryStart;
    const remaining = maxRetryTime - elapsed;
    if (remaining <= 0) {
      throw lastError || new Error(`Fetch failed for ${url} after ${maxRetryTime}ms`);
    }

    // Per-try timeout safely bounded by remaining budget
    const perTryTimeout = Math.max(100, Math.min(DEFAULT_PER_TRY_TIMEOUT, remaining - 50));

    try {
      const res = await attemptWithTimeout(perTryTimeout);
      if (res.ok) {
        return res;
      }

      // If non-retryable within window, just return the response
      if (!RETRYABLE_STATUS.has(res.status)) {
        return res;
      }

      // Respect Retry-After if provided (helps not to spam when servers ask for space)
      const retryAfterMs = parseRetryAfter(res.headers.get("Retry-After"));
      let waitMs;
      if (retryAfterMs != null) {
        // Always respect a server-specified cooldown, but cap by remaining window
        waitMs = Math.max(MIN_DELAY_MS, Math.min(retryAfterMs, Math.max(0, remaining - 10)));
      } else {
        // Otherwise use decorrelated jitter backoff
        const next = Math.min(MAX_DELAY_MS, Math.random() * delayMs * JITTER_FACTOR);
        delayMs = Math.max(MIN_DELAY_MS, next);
        waitMs = Math.min(delayMs, Math.max(0, remaining - 10));
      }

      // Ensure we never busy-loop
      if (waitMs <= 0) {
        lastError = new Error(`Fetch failed for ${url} after ${maxRetryTime}ms (no window left)`);
        throw lastError;
      }

      this?.initError?.(`Retrying fetch for ${url}`, res.status);
      attempt += 1;
      await sleep(waitMs);
      continue;
    } catch (err) {
      // Caller abort? surface immediately
      if (callerSignal && callerSignal.aborted) throw err;

      lastError = err;

      // If no time left, stop
      const nowRemaining = maxRetryTime - (Date.now() - retryStart);
      if (nowRemaining <= 0) throw lastError;

      // Backoff after network/timeout errors, too
      const next = Math.min(MAX_DELAY_MS, Math.random() * delayMs * JITTER_FACTOR);
      delayMs = Math.max(MIN_DELAY_MS, next);
      const waitMs = Math.min(delayMs, Math.max(0, nowRemaining - 10));
      if (waitMs <= 0) throw lastError;

      this?.initError?.(`Fetch error for ${url}`, err);
      attempt += 1;
      await sleep(waitMs);
      continue;
    }
  }
};


    try {
      const [invComments, videoInfo] = await Promise.all([
        fetchWithRetry(
          `${this.config.invapi}/comments/${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(
            Date.now()
          )}`
        ).then((res) => res?.text()),
        fetchWithRetry(
          `${this.config.invapi}/videos/${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(
            Date.now()
          )}`
        ).then((res) => res?.text()),
      ]);

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
        let returnyoutubedislikesapi = { engagement: null };
        try {
          returnyoutubedislikesapi = await getdislikes(v);
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
            engagement: returnyoutubedislikesapi.engagement,
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
  useragent: config.useragent,
});

module.exports = pokeTubeApiCore;
