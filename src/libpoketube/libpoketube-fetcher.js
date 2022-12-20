/*
  
    Copyright (C) 2021-2022 POKETUBE (https://github.com/iamashley0/poketube)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see https://www.gnu.org/licenses/.
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

  const engagement = await fetch(`${dislike_api}${video_id}`).then((res) =>
    res.json()
  );
  
 
  const headers = {};
  /*
   * Parses and fetches an xml
   */

  async function parsexml(id) {
    const player = await fetch(`${new_api_url}?v=${id}`, headers);
    var h = await player.text();
    var j = toJson(h);
    return getJson(j);
  }

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
