/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2023 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */


const fetch = require("node-fetch"); //2.5.x
const { toJson } = require("xml2json");

var youtube_url = `https://www.youtube.com/watch?v=`;
var dislike_api = `https://returnyoutubedislikeapi.com/votes?videoId=`;
var new_api_url = `https://tube-srv.ashley143.gay/api/player`;

module.exports = async function (video_id) {
  function getJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  const headers = {};
  /*
   * Parses and fetches an xml
   */

  async function parsexml(id) {
    
    
    async function fetchxmlvideo() {
      try {
        const player = await fetch(`${new_api_url}?v=${id}`, headers);
        var h = await player.text();
        var j = toJson(h);
        return getJson(j);
      } catch {}
    }

    const a = await fetchxmlvideo();
    return a;
  }

  async function ryd() {
    try {
      const engagement = await fetch(`${dislike_api}${video_id}`).then((res) =>
        res.json()
      );
      return engagement;
    } catch {}
  }

  const engagement = await ryd();

  /*
   * Returner object
   */
  const returner = {
    video: await parsexml(video_id),
    engagement,
    video_url_youtube: `${youtube_url}${video_id}`,
  };

  return returner;
};
