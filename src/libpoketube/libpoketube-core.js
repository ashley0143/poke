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
const { Innertube } = require("youtubei.js"); // youtubei.js client

class InnerTubePokeVidious {
  constructor(config) {
    this.config = config;
    this.cache = {};
    this.language = "hl=en-US";
    this.param = "2AMB";
    this.param_legacy = "CgIIAdgDAQ%3D%3D";
    this.apikey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    this.ANDROID_API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
    this.ANDROID_APP_VERSION = "19.14.42";
    this.ANDROID_VERSION = "13";
    this.useragent =
      config.useragent ||
      "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.region = "region=US";
    this.sqp =
      "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";
    this.youtubeClient = null;
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

  // Lazy-init the Innertube client
  async _initYouTube() {
    if (!this.youtubeClient) {
      this.youtubeClient = await Innertube.create({
        lang: this.language.split("=")[1],   // "en-US"
        location: this.region.split("=")[1], // "US"
      });
    }
    return this.youtubeClient;
  }

  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    const { fetch } = await import("undici");
    if (v == null) return "Gib ID";

    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }

    const headers = { "User-Agent": this.useragent };
    const youtube = await this._initYouTube();

    try {
       const [commentsResponse, info, videoData] = await Promise.all([
        youtube.getComments(v),
        youtube.getInfo(v),
        curly
          .get(`${this.config.tubeApi}video?v=${v}`, {
            httpHeader: Object.entries(headers).map(
              ([k, val]) => `${k}: ${val}`
            ),
          })
          .then((res) => {
            const json = toJson(res.data);
            return { json, video: this.getJson(json) };
          }),
      ]);

      const vid = { ...info, authorId: info.channel_id };

      let p = {};
      if (f === "true") {
        const uploadsRes = await fetch(
          `${this.config.invapi}/channels/${vid.authorId}?hl=${contentlang}&region=${contentregion}`,
          { headers }
        );
        p = await uploadsRes.json();
      }

      const fe = await getdislikes(v);

      this.cache[v] = {
        result: {
          json: videoData.json,
          video: videoData.video,
          vid,
          comments: commentsResponse,
          channel_uploads: p,
          engagement: fe.engagement,
          wiki: "",
          desc: info.description,
          color: await getColors(
            `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`
          ).then((cols) => cols[0].hex()),
          color2: await getColors(
            `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`
          ).then((cols) => cols[1].hex()),
        },
        timestamp: Date.now(),
      };

      return this.cache[v].result;
    } catch (error) {
      this.initError("Error getting video", error);
    }
  }

  isvalidvideo(v) {
    return v !== "assets" && v !== "cdn-cgi" && v !== "404"
      ? /^([a-zA-Z0-9_-]{11})/.test(v)
      : false;
  }

  initError(args, error) {
    console.error("[LIBPT CORE ERROR] " + args, error);
  }
}

const pokeTubeApiCore = new InnerTubePokeVidious({
  tubeApi: "https://inner-api.poketube.fun/api/",
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt:
    config.proxylocation === "EU"
      ? "https://invid-api.poketube.fun/api/v1"
      : "https://iv.ggtyler.dev/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
  useragent: config.useragent,
});

module.exports = pokeTubeApiCore;
