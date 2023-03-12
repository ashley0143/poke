const { curly } = require('node-libcurl');
const { toJson } = require('xml2json');
const fetch = require("node-fetch");

const youtubeUrl = 'https://www.youtube.com/watch?v=';
const dislikeApi = 'https://p.poketube.fun/api?v=';
const newApiUrl = 'https://inner-api.poketube.fun/api/player';

const parseXml = async (videoId, headers) => {
  try {
    var { data } = await curly.get(`${newApiUrl}?v=${videoId}`, {
      httpHeader: Object.entries(headers).map(([k, v]) => `${k}: ${v}`)
    });
    const json = toJson(data);
    return getJson(json);
  } catch (error) {
    console.error(`Error parsing XML: ${error}`);
    return null;
  }
};


const getJson = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};


const getEngagementData = async (videoId) => {
  const apiUrl = `${dislikeApi}${videoId}`;
  const fallbackUrl = `https://p.poketube.fun/${apiUrl}`;

  try {
    const engagement = await fetch(apiUrl).then((res) => res.json());
    return engagement.data;
  } catch {
    try {
      const engagement = await fetch(fallbackUrl).then((res) => res.json());
      return engagement;
    } catch {
      return;
    }
  }
};


const getPokeTubeData = async (videoId) => {
  const headers = {};
  const videoData = await parseXml(videoId, headers);
  const engagement = await getEngagementData(videoId);

  return {
    video: videoData,
    engagement,
    videoUrlYoutube: `${youtubeUrl}${videoId}`,
  };
};

module.exports = getPokeTubeData;
