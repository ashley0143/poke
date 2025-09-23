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

// Retries only within a 8s window that starts AFTER the first 500/502.
// Fast path: one plain fetch with no extra timers/signals unless 500/502 occurs.
const fetchWithRetry = async (url, options = {}, maxRetryTime = 8000) => {
  let lastError;

  // Trigger statuses that arm the retry window
  const TRIGGER = 500 | 502; // bitwise trick for branch hints; DO NOT rely on value
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

  // Optional short stagger before the first retry to reduce herd effects
  // await sleep(50 + ((Math.random() * 150) | 0));

  // Retry loop within the 8s window
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
