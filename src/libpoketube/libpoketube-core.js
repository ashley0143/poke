/**
 * Poke is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
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


 // retry indefinitely but with a 5-second max retry window to avoid spam
const fetchWithRetry = async (url, options = {}, maxRetryTime = 5000) => {
  const startTime = Date.now();
  let lastError;

  // Retryable HTTP statuses
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

  // Backoff settings
  const BASE_DELAY_MS = 120;            // initial backoff base
  const MAX_DELAY_MS = 1000;            // cap between attempts
  const MIN_DELAY_MS = 50;              // never spin
  const JITTER_FRAC = 0.2;              // +/- 20% jitter

  // Per-attempt timeout (capped by remaining retry window)
  const DEFAULT_PER_TRY_TIMEOUT = 2000; // soft cap per attempt

  // Respect caller's AbortSignal if provided
  const callerSignal = options.signal;

  // Merge caller signal with a per-attempt timeout signal
  const withTimeoutSignal = (ms) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("Fetch attempt timed out")), ms);

    // If caller aborts, propagate to controller
    const onCallerAbort = () => controller.abort(callerSignal.reason || new Error("Aborted by caller"));
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason || new Error("Aborted by caller"));
      } else {
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
    }

    // Cleanup hook for the attempt
    const cleanup = () => {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
    };

    return { signal: controller.signal, cleanup };
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let attempt = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remaining = maxRetryTime - elapsed;
    if (remaining <= 0) {
      throw lastError || new Error(`Fetch failed for ${url} after ${maxRetryTime}ms`);
    }

    // Per-attempt timeout is the lesser of DEFAULT and remaining (leave a small buffer)
    const perTryTimeout = Math.max(1, Math.min(DEFAULT_PER_TRY_TIMEOUT, remaining - 10));
    const { signal, cleanup } = withTimeoutSignal(perTryTimeout);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...headers,  
        },
        signal,
      });

      if (res.ok) {
        cleanup();
        return res;
      }

      if (!RETRYABLE_STATUS.has(res.status)) {
        cleanup();
        return res;
      }

      this?.initError?.(`Retrying fetch for ${url}`, res.status);

      // Decide next delay with exponential backoff + jitter, but keep within remaining window
      const rawDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
      const jitter = rawDelay * JITTER_FRAC;
      let delay = rawDelay + (Math.random() * 2 * jitter - jitter);
      delay = Math.max(MIN_DELAY_MS, Math.min(delay, remaining - 1));

      cleanup();

      // If no time left for a meaningful delay+retry, bail with lastError-like info
      if (delay <= 0) {
        throw new Error(`Fetch failed for ${url} after ${maxRetryTime}ms (no window left)`);
      }

      attempt += 1;
      await sleep(delay);
      continue;
    } catch (err) {
      cleanup();
      lastError = err;

      // If caller aborted, surface immediately
      if (callerSignal && callerSignal.aborted) {
        throw lastError;
      }

      // Network/timeout errors are retryable while we have time
      const nowElapsed = Date.now() - startTime;
      const nowRemaining = maxRetryTime - nowElapsed;
      if (nowRemaining <= 0) {
        throw lastError;
      }

      // Backoff before retrying network errors as well
      const rawDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
      const jitter = rawDelay * JITTER_FRAC;
      let delay = rawDelay + (Math.random() * 2 * jitter - jitter);
      delay = Math.max(MIN_DELAY_MS, Math.min(delay, nowRemaining - 1));

      // If no time left to wait, throw
      if (delay <= 0) {
        throw lastError;
      }

      this?.initError?.(`Fetch error for ${url}`, err);

      attempt += 1;
      await sleep(delay);
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
          message: "Sorry nya, we couldn't find any information about that video qwq",
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
          // `sqp` is a URL parameter used by YouTube thumbnail/image servers to request a specific scale, crop or quality profile (base64-encoded), controlling how the thumbnail is sized or compressed. 
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
        this.initError( vid,`ID: ${v}` );
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
