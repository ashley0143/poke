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
const config = require("../../config.json")


/**
 * Class representing PokeTube's core functionality.
 */
class InnerTubePokeVidious {
  /**
   * Create an instance of InnerTubePokeVidious.
   * @param {object} config - Configuration object for InnerTubePokeVidious.
   * @param {string} config.tubeApi - Tube API URL.
   * @param {string} config.invapi - Invid API URL.
   * @param {string} config.invapi_alt - Invid API URL - ALT .
   * @param {string} config.dislikes - Dislikes API URL.
   * @param {string} config.t_url - Matomo URL.
   */
  constructor(config) {
    this.config = config;
    this.cache = {};
    this.language = "hl=en-US";
    this.param = "2AMB"
    this.param_legacy = "CgIIAdgDAQ%3D%3D"
    this.apikey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
    this.ANDROID_API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w"
    this.ANDROID_APP_VERSION = "19.14.42"
    this.ANDROID_VERSION = "13"
    this.useragent = "com.google.android.youtube/19.14.42 (Linux; U; Android 12; US) gzip"
    this.INNERTUBE_CONTEXT_CLIENT_VERSION = "1"
    this.region = "region=US";
    this.sqp = "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";
  }

  /**
   * Fetch JSON from API response.
   * @param {string} str - String response from the API.
   * @returns {object|null} Parsed JSON object or null if parsing failed.
   */
  getJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  /**
   * Check if the provided object has the required properties.
   * @param {object} obj - Object to check.
   * @returns {boolean} True if the object has the required properties, false otherwise.
   */
  checkUnexistingObject(obj) {
    if (obj) {
      if ("authorId" in obj) {
        return true;
      }
    }
  }

  /**
   * Fetch video information.
   * @param {string} v - Video ID.
   * @returns {Promise<object>} Promise resolving to the video information.
   */
  async getYouTubeApiVideo(f, v, contentlang, contentregion) {
    
    const { fetch } = await import("undici");
 
    if (v == null) return "Gib ID";

    // Check if result is already cached
    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      return this.cache[v].result;
    }
    const headers = {};

    let desc = "";
    
    try {
    const [invComments, videoInfo, videoData] = await Promise.all([
      fetch(`${this.config.invapi}/comments/${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(Date.now())}`).then((res) => res.text()),
      fetch(`${this.config.invapi}/videos/${v}?hl=${contentlang}&region=${contentregion}&h=${btoa(Date.now())}`).then((res) => res.text()),
      curly
        .get(`${this.config.tubeApi}video?v=${v}`, {
          httpHeader: Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        })
        .then((res) => {
          const json = toJson(res.data);
          const video = this.getJson(json);
          return { json, video };
        }),
    ]);

   
    const comments = await this.getJson(invComments);
  
    const vid = await this.getJson(videoInfo);
    const { json, video } = videoData;

    var channel_uploads = { };
    if (f == "true") {
      channel_uploads = await fetch(
        `${this.config.invapi}/channels/${vid.authorId}?hl=${contentlang}&region=${contentregion}`
      );
     var p = this.getJson(await channel_uploads.text());
    }

    if (!vid) {
      console.log(
        `Sorry nya, we couldn't find any information about that video qwq`
      );
    }

    if (this.checkUnexistingObject(vid)) {
      const fe = await getdislikes(v);

      try {
        const headers = {};

        // Store result in cache
        this.cache[v] = {
          result: {
            json: json?.video,
            video,
            vid,
            comments,
            channel_uploads: p,
            engagement: fe.engagement,
            wiki: "",
            desc: "",
            color: await getColors(
              `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`
            ).then((colors) => colors[0].hex()),
            color2: await getColors(
              `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${this.sqp}`
            ).then((colors) => colors[1].hex()),
          },
          timestamp: Date.now(),
        };

        return this.cache[v].result;
      } catch (error) {
        this.initError("Error getting video", error);
      }
    }
    } catch {
      
    }
    }


  /**
   * Check if a video ID is valid.
   * @param {string} v - Video ID.
   * @returns {boolean} True if the video ID is valid, false otherwise.
   */
  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") {
      const regex = new RegExp("^([a-zA-Z0-9_-]{11})");
      const isMatch = regex.test(v);
      return isMatch;
    } else {
      return false;
    }
  }

  /**
   * Initialize an error.
   * @param {string} args - Error message.
   * @param {Error} error - Error object.
   */
  initError(args, error) {
    console.error("[LIBPT CORE ERROR]" + args, error);
  }
}

// Create an instance of InnerTubePokeVidious with the provided config
const pokeTubeApiCore = new InnerTubePokeVidious({
  tubeApi: "https://inner-api.poketube.fun/api/",
  invapi: "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt: config.proxylocation === "EU" ? "https://invid-api.poketube.fun/api/v1" : "https://iv.ggtyler.dev/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
});

module.exports = pokeTubeApiCore;
