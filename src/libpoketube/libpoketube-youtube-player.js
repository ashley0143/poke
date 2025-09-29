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

  // safe base64 helper so btoa isn't required in Node
  toBase64(str) {
    if (typeof btoa !== "undefined") return btoa(str);
    return Buffer.from(String(str)).toString("base64");
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

   
    const fetchWithRetry = async (url, options = {}, maxRetryTime = 5000) => {
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
          if (res.ok) return res;
          if (!RETRYABLE.has(res.status)) return res;

          // retryable status -> respect Retry-After if present, otherwise short fixed delay
          const ra = parseRetryAfter(res.headers.get("Retry-After"));
          const waitMs = ra != null ? Math.max(50, Math.min(ra, remaining - 10)) : Math.min(FIXED_RETRY_DELAY_MS, Math.max(0, remaining - 10));
          if (waitMs <= 0) throw new Error(`Fetch failed for ${url} after ${maxRetryTime}ms (window depleted)`);

          this?.initError?.(`Retrying fetch for ${url}`, res.status);
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

    // Race strategy: start both quickly; return the first OK response and abort the other.
    const fetchPrefer = async (urlA, urlB, maxRetryTime = 5000) => {
      // controllers so we can abort the loser
      const acA = new AbortController();
      const acB = new AbortController();

      // wrapped fetches return an object { url, res } on success or { url, err } on failure
      const wrapped = (url, ac) =>
        fetchWithRetry(url, { signal: ac.signal }, maxRetryTime)
          .then((res) => ({ url, res }))
          .catch((err) => ({ url, err }));

      // start both in parallel immediately (fast path)
      const pA = wrapped(urlA, acA);
      const pB = wrapped(urlB, acB);

      // Wait for either to succeed with ok; otherwise prefer the first fulfilled response.
      // We'll poll settled promises as they arrive instead of waiting both.
      const settled = await Promise.allSettled([pA, pB]);

      // 1) prefer an OK response
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.res && s.value.res.ok) {
          if (s.value.url === urlA) acB.abort();
          else acA.abort();
          return s.value.res;
        }
      }

      // 2) prefer any fulfilled response (even non-OK)
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.res) {
          if (s.value.url === urlA) acB.abort();
          else acA.abort();
          return s.value.res;
        }
      }

      // 3) otherwise throw first error we have
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value && s.value.err) throw s.value.err;
      }

      throw new Error("Both fetches failed");
    };

    try {
      // fetch comments in parallel with a smaller window
      const invCommentsPromise = fetchWithRetry(
        `${this.config.invapi}/comments/${v}?hl=${contentlang}&region=${contentregion}&h=${this.toBase64(Date.now())}`,
        {},
        2500
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
            // sqp is a URL parameter used by YouTube thumbnail/image servers 
            // to request a specific scale, crop or quality profile (base64-encoded), 
            // controlling how the thumbnail is sized or compressed.
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
