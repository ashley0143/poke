/**
 * PokeTube is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

const fetch = require("node-fetch");
const { toJson } = require("xml2json");
const { curly } = require("node-libcurl");
const fetcher = require("../libpoketube/libpoketube-fetcher.js");
const getColors = require("get-image-colors");
const wiki = require("wikipedia");

/**
 * Class representing PokeTube's core functionality.
 */
class PokeTubeCore {
  /**
   * Create an instance of PokeTubeCore.
   * @param {object} config - Configuration object for PokeTubeCore.
   * @param {string} config.tubeApi - Tube API URL.
   * @param {string} config.invapi - Invid API URL.
   * @param {string} config.dislikes - Dislikes API URL.
   * @param {string} config.t_url - Matomo URL.
   */
  constructor(config) {
    this.config = config;
    this.cache = {};
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
  async video(v) {
    if (v == null) return "Gib ID";

    // Check if result is already cached
    if (this.cache[v] && Date.now() - this.cache[v].timestamp < 3600000) {
      console.log("Returning cached result");
      return this.cache[v].result;
    }

    let desc = "";

    try {
      const inv_comments = await fetch(`${this.config.invapi}/comments/${v}`).then((res) =>
        res.text()
      );
      var comments = await this.getJson(inv_comments);
    } catch (error) {
      this.initError("Error getting comments", error);
      var comments = "";
    }

    let vid;

    try {
      const videoInfo = await fetch(`${this.config.invapi}/videos/${v}`).then((res) =>
        res.text()
      );
      vid = await this.getJson(videoInfo);
    } catch (error) {
      this.initError("Error getting video info", error);
    }

    if (!vid) {
      console.log(`Sorry nya, we couldn't find any information about that video qwq`);
    }

    if (this.checkUnexistingObject(vid)) {
      let a;

      try {
        a = await fetch(`${this.config.tubeApi}channel?id=${vid.authorId}&tab=about`)
          .then((res) => res.text())
          .then((xml) => this.getJson(toJson(xml)));
      } catch (error) {
        this.initError("Error getting channel info", error);
        a = "";
      }

      desc = a.Channel?.Contents?.ItemSection?.About?.Description;
      const fe = await fetcher(v);

      try {
        const summary = await wiki
          .summary(vid.author + " ")
          .then((summary_) =>
            summary_.title !== "Not found." ? summary_ : "none"
          );

        const headers = {};

        const { data } = await curly.get(`${this.config.tubeApi}video?v=${v}`, {
          httpHeader: Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        });
        const json = toJson(data);
        const video = this.getJson(json);

        // Store result in cache
        this.cache[v] = {
          result: {
            json: json?.video,
            video,
            vid,
            comments,
            engagement: fe.engagement,
            wiki: summary,
            desc: desc,
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
  }

  /**
   * Check if a video ID is valid.
   * @param {string} v - Video ID.
   * @returns {boolean} True if the video ID is valid, false otherwise.
   */
  isvalidvideo(v) {
    if (v != "assets" && v != "cdn-cgi" && v != "404") {
      return true;
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

// Create an instance of PokeTubeCore with the provided config
const pokeTubeApiCore = new PokeTubeCore({
  tubeApi: "https://inner-api.poketube.fun/api/",
  invapi: "https://invid-api.poketube.fun/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/",
});

module.exports = pokeTubeApiCore;
