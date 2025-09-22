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

    // Retry window is armed ONLY after seeing a 500 or 502 response
    const fetchWithRetry = async (url, options = {}, maxRetryTime = 5000) => {
      let lastError;

      const RETRY_WINDOW_TRIGGER = new Set([500, 502]);
      const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

      const BASE_DELAY_MS = 120;
      const MAX_DELAY_MS = 1000;
      const MIN_DELAY_MS = 50;
      const JITTER_FRAC = 0.2;

      const DEFAULT_PER_TRY_TIMEOUT = 2000;

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const callerSignal = options?.signal || null;

      const attemptWithTimeout = async (timeoutMs) => {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(new Error("Fetch attempt timed out")),
          Math.max(1, timeoutMs)
        );

        const onCallerAbort = () =>
          controller.abort(
            callerSignal.reason || new Error("Aborted by caller")
          );

        if (callerSignal) {
          if (callerSignal.aborted) {
            controller.abort(
              callerSignal.reason || new Error("Aborted by caller")
            );
          } else {
            callerSignal.addEventListener("abort", onCallerAbort, {
              once: true,
            });
          }
        }

        try {
          const res = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              ...headers,
            },
            signal: controller.signal,
          });
          return res;
        } finally {
          clearTimeout(timer);
          if (callerSignal)
            callerSignal.removeEventListener("abort", onCallerAbort);
        }
      };

      // First attempt (no retry window yet)
      try {
        const firstRes = await attemptWithTimeout(DEFAULT_PER_TRY_TIMEOUT);
        if (firstRes.ok) return firstRes;

        if (!RETRY_WINDOW_TRIGGER.has(firstRes.status)) {
          return firstRes;
        }

        lastError = new Error(`Initial ${firstRes.status} from ${url}`);
      } catch (err) {
        lastError = err;
        this?.initError?.(`Fetch error for ${url}`, err);
        throw lastError;
      }

      // Retry loop: window is ARMED due to 500/502
      const retryStart = Date.now();
      let attempt = 1;

      while (true) {
        const elapsed = Date.now() - retryStart;
        const remaining = maxRetryTime - elapsed;

        if (remaining <= 0) {
          throw (
            lastError ||
            new Error(`Fetch failed for ${url} after ${maxRetryTime}ms`)
          );
        }

        const perTryTimeout = Math.max(
          50,
          Math.min(DEFAULT_PER_TRY_TIMEOUT, remaining - 25)
        );

        try {
          const res = await attemptWithTimeout(perTryTimeout);

          if (res.ok) {
            return res;
          }

          if (!RETRYABLE_STATUS.has(res.status)) {
            return res;
          }

          this?.initError?.(`Retrying fetch for ${url}`, res.status);

          const raw = Math.min(
            MAX_DELAY_MS,
            BASE_DELAY_MS * Math.pow(2, attempt)
          );
          const jitter = raw * JITTER_FRAC;
          let delay = raw + (Math.random() * 2 * jitter - jitter);
          delay = Math.max(
            MIN_DELAY_MS,
            Math.min(delay, Math.max(0, remaining - 10))
          );

          if (delay <= 0) {
            lastError = new Error(
              `Fetch failed for ${url} after ${maxRetryTime}ms (no window left)`
            );
            throw lastError;
          }

          attempt += 1;
          await sleep(delay);
          continue;
        } catch (err) {
          lastError = err;

          if (callerSignal && callerSignal.aborted) {
            throw lastError;
          }

          const nowRemaining = maxRetryTime - (Date.now() - retryStart);
          if (nowRemaining <= 0) {
            throw lastError;
          }

          const raw = Math.min(
            MAX_DELAY_MS,
            BASE_DELAY_MS * Math.pow(2, attempt)
          );
          const jitter = raw * JITTER_FRAC;
          let delay = raw + (Math.random() * 2 * jitter - jitter);
          delay = Math.max(
            MIN_DELAY_MS,
            Math.min(delay, Math.max(0, nowRemaining - 10))
          );

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
