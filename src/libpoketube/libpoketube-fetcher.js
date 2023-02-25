/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2023 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */


const fetch = require("node-fetch"); //2.5.x
const { toJson } = require("xml2json");

const youtubeUrl = "https://www.youtube.com/watch?v=";
const dislikeApi = "https://p.poketube.fun/https://returnyoutubedislikeapi.com/votes?videoId=";
const newApiUrl = "https://tube-srv.ashley143.gay/api/player";

const parseXml = async (videoId, headers) => {
  const player = await fetch(`${newApiUrl}?v=${videoId}`, headers);
  const xml = await player.text();
  const json = toJson(xml);
  return getJson(json);
};

const getJson = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const getEngagement = async (videoId) => {
  const engagement = await fetch(`${dislikeApi}${videoId}`).then((res) => res.json());
  return engagement;
};

const getPokeTubeData = async (videoId) => {
  const headers = {};
  const videoData = await parseXml(videoId, headers);
  const engagement = await getEngagement(videoId);

  return {
    video: videoData,
    engagement,
    videoUrlYoutube: `${youtubeUrl}${videoId}`,
  };
};

module.exports = getPokeTubeData
 