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
    // sqp is YouTube’s thumbnail param blob; pass-through here
    this.sqp =
      "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";

    // host state: light leaky gaps + backoff/cooldown per host
    this.hosts = {
      primary: {
        name: "primary",
        // base for /videos/:id and /comments/:id
        base: this.config.invapi,
        minGapMs: 150, // soft gap between calls
        lastAt: 0,
        cooldownUntil: 0,
        backoffMs: 2000, // grows on 429/5xx; shrinks on success
      },
      fallback: {
        name: "fallback",
        // this one already points to /api/v1/videos/… so video path differs
        base: this.config.inv_fallback,
        minGapMs: 150,
        lastAt: 0,
        cooldownUntil: 0,
        backoffMs: 2000,
      },
    };
  }

  // small helpers
  now() {
    return Date.now();
  }
  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  // jitter adds a tiny spread so bursts don’t align
  jitter(ms, spread = 90) {
    return ms + Math.floor(Math.random() * spread);
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

  // wait until a host is ready based on gap + cooldown
  async waitSlot(h) {
    const t = this.now();
    const nextByGap = h.lastAt + h.minGapMs;
    const nextByCool = h.cooldownUntil;
    const at = Math.max(nextByGap, nextByCool);
    const wait = Math.max(0, at - t);
    if (wait > 0) await this.sleep(this.jitter(wait));
  }

  markSuccess(h) {
    // success relaxes backoff a bit
    h.backoffMs = Math.max(800, Math.floor(h.backoffMs * 0.6));
    h.cooldownUntil = 0;
    h.lastAt = this.now();
  }

  markSoftFail(h, reasonMs = null) {
    // soft server hint (Retry-After) or local timeout => short cooldown
    const base = reasonMs != null ? reasonMs : h.backoffMs;
    h.cooldownUntil = this.now() + this.jitter(Math.min(base, 20000));
    // keep backoff steady on hinted waits
    h.lastAt = this.now();
  }

  markHardFail(h) {
    // hard fail widens backoff
    h.backoffMs = Math.min(20000, Math.max(1500, Math.floor(h.backoffMs * 1.6)));
    h.cooldownUntil = this.now() + this.jitter(h.backoffMs);
    h.lastAt = this.now();
  }

  hostReady(h) {
    const t = this.now();
    return t >= h.cooldownUntil && t >= h.lastAt + h.minGapMs;
  }

  // choose the better host at this moment without parallel fire
  pickHost(prefer = "primary") {
    const a = this.hosts.primary;
    const b = this.hosts.fallback;

    const aReady = this.hostReady(a);
    const bReady = this.hostReady(b);

    if (aReady && bReady) {
      // both ready: pick the one that idled longer to even out load
      const idleA = this.now() - Math.max(a.lastAt, a.cooldownUntil);
      const idleB = this.now() - Math.max(b.lastAt, b.cooldownUntil);
      if (prefer === "primary" && idleA >= idleB) return a;
      if (prefer === "fallback" && idleB >= idleA) return b;
      return idleA >= idleB ? a : b;
    }
    if (aReady) return a;
    if (bReady) return b;
    // none ready: pick the one that comes back first
    const nextA = Math.max(a.cooldownUntil, a.lastAt + a.minGapMs);
    const nextB = Math.max(b.cooldownUntil, b.lastAt + b.minGapMs);
    return nextA <= nextB ? a : b;
  }

  // single fetch attempt with timeout; no parallel to other host
  async oneFetch(url, headers, timeoutMs = 1500, signal = null) {
    const { fetch } = await import("undici");
    const ac = new AbortController();
    const onAbort = () => ac.abort(signal?.reason || new Error("Aborted"));
    if (signal) {
      if (signal.aborted) ac.abort(signal.reason || new Error("Aborted"));
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(
      () => ac.abort(new Error("Timeout")),
      timeoutMs > 0 ? timeoutMs : 1
    );
    try {
      return await fetch(url, { headers, signal: ac.signal });
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  // build URLs per host type
  buildVideoUrl(h, v, lang, reg) {
    const hParam = this.toBase64(this.now());
    if (h.name === "primary") {
      return `${h.base}/videos/${v}?hl=${lang}&region=${reg}&h=${hParam}`;
    }
    // fallback already includes /api/v1/videos/
    return `${h.base}${v}?hl=${lang}&region=${reg}&h=${hParam}`;
  }

  buildCommentsUrl(h, v, lang, reg) {
    // both endpoints support comments path in /api/v1 in most deployments
    // if fallback path is videos-only, this call will fail fast and be skipped
    const hParam = this.toBase64(this.now());
    if (h.name === "primary") {
      return `${h.base}/comments/${v}?hl=${lang}&region=${reg}&h=${hParam}`;
    }
    // try fallback comments as well; if not present it will 404 and be ignored
    return `${h.base.replace(/videos\/?$/i, "")}comments/${v}?hl=${lang}&region=${reg}&h=${hParam}`;
  }

  parseRetryAfter(hdr) {
    if (!hdr) return null;
    const s = String(hdr).trim();
    const n = Number(s);
    if (Number.isFinite(n)) return Math.max(0, (n | 0) * 1000);
    const when = Date.parse(s);
    if (!Number.isNaN(when)) return Math.max(0, when - this.now());
    return null;
  }

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const headers = { "User-Agent": this.useragent };

    if (!v) {
      this.initError("Missing video ID", null);
      return { error: true, message: "No video ID provided" };
    }

    // simple 1-hour cache
    if (this.cache[v] && this.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }

    // prefer primary by default; selection may flip based on cooldowns
    let host = this.pickHost("primary");

    const tryHost = async (h) => {
      await this.waitSlot(h);
      const url = this.buildVideoUrl(h, v, contentlang, contentregion);
      let res;
      try {
        res = await this.oneFetch(url, headers, 1500);
      } catch (e) {
        // timeout/network
        this.initError(`Fetch timeout/net for ${h.name}`, e);
        this.markHardFail(h);
        return { ok: false, status: 0, body: null, host: h };
      }

      if (res.ok) {
        const text = await res.text();
        this.markSuccess(h);
        return { ok: true, status: res.status, body: text, host: h };
      }

      // 429/5xx: apply cooldowns; 4xx others return as-is
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        const ra = this.parseRetryAfter(res.headers.get("Retry-After"));
        if (ra != null) this.markSoftFail(h, Math.min(ra, 20000));
        else this.markHardFail(h);
      } else {
        // 4xx non-429 => do not hammer
        this.markSoftFail(h, 800);
      }

      const body = await res.text().catch(() => null);
      return { ok: false, status: res.status, body, host: h };
    };

    // first attempt on picked host
    let first = await tryHost(host);

    // switch rules:
    // - timeout/net or 429/5xx -> flip once to the other host
    // - 4xx non-429 -> flip once as well (video may exist on mirror)
    if (!first.ok) {
      const other = host.name === "primary" ? this.hosts.fallback : this.hosts.primary;

      // if both are cooling, wait the shorter one a tiny bit to avoid spam
      if (!this.hostReady(other)) {
        const nextA = Math.max(other.cooldownUntil, other.lastAt + other.minGapMs);
        const wait = Math.max(0, nextA - this.now());
        if (wait > 0 && wait <= 500) await this.sleep(this.jitter(wait));
      }

      const second = await tryHost(other);

      // if second worked, use it; else return best info we have
      if (second.ok) first = second;
      else {
        // prefer the response body if any (helps surface server message)
        const msg =
          first.body || second.body
            ? "Remote error"
            : "Fetch error";
        this.initError(`Video fetch failed on both`, `${first.status}/${second.status}`);
        return { error: true, message: msg, detail: `${first.status}/${second.status}` };
      }
    }

    // parse video info
    const vid = this.getJson(first.body);
    if (!vid) {
      this.initError("Video info missing/unparsable", v);
      return {
        error: true,
        message: "Sorry nya, we couldn't find any information about that video qwq",
      };
    }

    if (!this.checkUnexistingObject(vid)) {
      this.initError(vid, `ID: ${v}`);
      return { error: true, message: "Bad video payload" };
    }

    // comments are nice-to-have; run on the same host first
    const commentsHost = first.host; // try where video succeeded
    const tryComments = async () => {
      // if the host is cooling, skip to avoid pressure
      if (!this.hostReady(commentsHost)) return null;

      // light attempt with short timeout
      try {
        await this.waitSlot(commentsHost);
        const cu = this.buildCommentsUrl(commentsHost, v, contentlang, contentregion);
        const r = await this.oneFetch(cu, headers, 1200);
        if (!r.ok) {
          // if this was a 429/5xx, cool this host a bit for comments path only
          if (r.status === 429 || (r.status >= 500 && r.status <= 599)) {
            const ra = this.parseRetryAfter(r.headers.get("Retry-After"));
            if (ra != null) this.markSoftFail(commentsHost, Math.min(ra, 8000));
            else this.markSoftFail(commentsHost, 1200);
          }
          return null;
        }
        this.markSuccess(commentsHost);
        return this.getJson(await r.text());
      } catch (e) {
        this.initError("Comments fetch error", e);
        this.markSoftFail(commentsHost, 1000);
        return null;
      }
    };

    // start helpers while dislikes/colors run
    const commentsPromise = tryComments();

    // dislikes + colors in parallel with tight caps
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
        const t = new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Color extraction timeout")), 1000)
        );
        const palette = await Promise.race([p, t]);
        if (Array.isArray(palette) && palette[0] && palette[1]) {
          return [palette[0].hex(), palette[1].hex()];
        }
        return null;
      } catch (err) {
        this.initError("Thumbnail color extraction error", err);
        return null;
      }
    })();

    const [comments, returnyoutubedislikesapi, paletteResult] = await Promise.all([
      commentsPromise,
      dislikePromise,
      colorPromise,
    ]);

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
      timestamp: this.now(),
    };

    return this.cache[v].result;
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
