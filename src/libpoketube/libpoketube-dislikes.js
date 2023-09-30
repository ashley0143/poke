/**
 * PokeTube is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

const { curly } = require("node-libcurl");
const { toJson } = require("xml2json");

const YOUTUBE_URL = "https://www.youtube.com/watch?v=";
const DISLIKE_API = "https://p.poketube.fun/api?v=";
const NEW_API_URL = "https://inner-api.poketube.fun/api/player";

/**
 * A class representing a PokeTube API instance for a specific video.
 */
class PokeTubeAPI {
  /**
   * Creates a new PokeTube API instance for the given video ID.
   * @param {string} videoId - The ID of the YouTube video.
   */
  constructor(videoId) {
    this.videoId = videoId;
    this.engagement = null;
    this.videoData = null;
    this.headers = {};
  }

  /**
   * Parses a JSON string and returns the resulting object.
   * @param {string} str - The JSON string to parse.
   * @returns {object|null} The parsed JSON object, or null if an error occurs.
   * @private
   */
  _getJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  /**
   * Retrieves engagement data for the YouTube video.
   * @returns {Promise<object|null>} A Promise that resolves with the engagement data, or null if an error occurs.
   * @private
   */
  async _getEngagementData(videoId) {
    const { fetch } = await import("undici");
    
    const apiUrl = `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${apiUrl}`);
      }

      const engagement = await response.json();
      return engagement;
    } catch (error) {
      console.error(error); // You might want to handle the error more gracefully
      return null; // Return null or another appropriate value in case of an error
    }
  }

  /**
   * Retrieves data about the YouTube video and its engagement.
   * @returns {Promise<object>} A Promise that resolves with an object containing video and engagement data.
   */
  async getData() {
    this.engagement = await this._getEngagementData();

    return {
      engagement: this.engagement,
      videoUrlYoutube: `${YOUTUBE_URL}${this.videoId}`,
    };
  }

  /**
   * Logs an error message to the console.
   * @param {string} args - The error message to log.
   * @private
   */
  _handleError(args) {
    console.error(`[LIBPT FETCHER ERROR] ${args}`);
  }
}

/*
Returns basic data about a given YouTube video using PokeTubeAPI.
@async
@function
@param {string} videoId - The YouTube video ID to get data for.
@returns {Promise<Object>} An object containing the  engagement data, as well as the YouTube URL for the video.
@throws {Error} If the video ID is invalid or the request fails.
*/

const getBasicPokeTubeData = async (videoId) => {
  const pokeTubeAPI = new PokeTubeAPI(videoId);
  return await pokeTubeAPI.getData();
};

module.exports = getBasicPokeTubeData;
