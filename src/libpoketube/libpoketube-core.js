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

class LRU {
  constructor(max = 5000) {
    this.max = max;
    this.map = new Map();
  }
  get(k) {
    if (!this.map.has(k)) return;
    const v = this.map.get(k);
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }
  set(k, v) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
  has(k) { return this.map.has(k); }
}

class InnerTubePokeVidious {
  constructor(cfg) {
    this.config = cfg;
    this.cache = new LRU(5000);
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
    this.hedge = true;
    this.debugErrors = !!cfg.debugErrors || process.env.POKETUBE_DEBUG_ERRORS === "1";
  }

  // (all helper + retry methods remain unchanged...)

  // ---------- Main API ----------
  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const requestId = this.newRequestId();

    if (!this.isvalidvideo(v)) {
      return this.buildError({
        reason: "invalid_video_id",
        videoId: v,
        requestId
      });
    }

    const cached = this.cache.get(v);
    if (cached && Date.now() - cached.timestamp < 3600000) return cached.result;

    const headers = { "User-Agent": this.useragent };
    const bases = [this.config.invapi, this.config.invapi_alt];
    const b64ts = Buffer.from(String(Date.now())).toString("base64");
    const q = `hl=${contentlang}&region=${contentregion}&h=${b64ts}`;

    const outer = new AbortController();
    const outerTimeout = setTimeout(() => outer.abort(new Error("global-timeout")), 18000);

    try {
      const [comments, vid, videoData] = await Promise.all([
        this.hedgedGetJsonFromBases(bases, `/comments/${v}`, q, outer.signal),
        this.hedgedGetJsonFromBases(bases, `/videos/${v}`, q, outer.signal),
        (async () => {
          const res = await this.curlGetWithRetry(
            `${this.config.t_url}video?v=${v}`,
            Object.entries(headers).map(([k, vv]) => `${k}: ${vv}`),
            outer.signal
          );
          const str = Buffer.isBuffer(res.data) ? res.data.toString("utf8") : String(res.data || "");
          const jsonStr = toJson(str);
          const video = this.getJson(jsonStr);
          return { json: jsonStr, video };
        })()
      ]);

      if (!vid) {
        return this.buildError({
          reason: "not_found_or_unparsable",
          videoId: v,
          requestId,
          meta: { bases, path: `/videos/${v}` }
        });
      }

      // (rest of code unchanged: channel fetch, engagement, colors, error handling...)

      const [c1, c2] = await this.getColorsSafe(`https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`);

      const result = {
        json: videoData?.json?.video,
        video: videoData?.video,
        vid,
        comments,
        engagement: null,
        wiki: "",
        desc: "",
        color: c1,
        color2: c2,
        requestId,
        fetchedAt: this.nowIso()
      };

      this.cache.set(v, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      const reason = "internal_error";
      this.initError("Error getting video", error);
      return this.buildError({
        reason,
        videoId: v,
        requestId,
        originalError: error
      });
    } finally {
      clearTimeout(outerTimeout);
    }
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  // tubeApi removed, using t_url instead
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt: config.proxylocation === "EU" ? "https://invid-api.poketube.fun/api/v1" : "https://iv.ggtyler.dev/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
  useragent: config.useragent,
  debugErrors: true
});

module.exports = pokeTubeApiCore;
