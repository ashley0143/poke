/**
 * PokeTube is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

/**
 * A class representing a PokeTube API instance for a specific video.
 */
class PokeTubeDislikesAPIManager  {
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
 async _getEngagementData() {
    const apiUrl = `https://ryd-proxy.kavin.rocks/votes/${this.videoId}&hash=d0550b6e28c8f93533a569c314d5b4e2`;
  
    const { fetch } = await import("undici");

    const engagement = await fetch(apiUrl).then((res) => res.json());
    return engagement;

  }



  /**
   * Retrieves data about the YouTube video and its engagement.
   * @returns {Promise<object>} A Promise that resolves with an object containing video and engagement data.
   */
  async getData() {
    this.engagement = await this._getEngagementData();

    return {
      engagement: this.engagement,
     };
  }

  /**
   * Logs an error message to the console.
   * @param {string} args - The error message to log.
   * @private
   */
  _handleError(args) {
    console.error(`[LIBPT DISLIKES ERROR] ${args}`);
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

const getDislikesData = async (videoId) => {
  const pokeTubeAPI = new PokeTubeDislikesAPIManager(videoId);
  return await pokeTubeAPI.getData();
};

module.exports = getDislikesData;
