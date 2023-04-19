const { curly } = require('node-libcurl');
const { toJson } = require('xml2json');
const fetch = require("node-fetch");

const youtubeUrl = 'https://www.youtube.com/watch?v=';
const dislikeApi = 'https://p.poketube.fun/api?v=';
const newApiUrl = 'https://inner-api.poketube.fun/api/player';

function initerr(args){
  console.error("[LIBPT FETCHER ERROR]" + args) 
}

const getInnerTubeData = async (videoId, headers) => {
  try {
    var { data } = await curly.get(`${newApiUrl}?v=${videoId}`, {
      httpHeader: Object.entries(headers).map(([k, v]) => `${k}: ${v}`)
    });
    
    const json = toJson(data);
    return getJson(json);
  
  } catch (error) {
    initerr(`Error parsing XML: ${error}`);
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
  // return youtube dislike api - https://www.returnyoutubedislike.com/
  const apiUrl = `${dislikeApi}${videoId}`;
  const fallbackUrl = `https://p.poketube.fun/${apiUrl}`;

  try {
    const engagement = await fetch(apiUrl).then((res) => res.json());
    return engagement.data;
    // if an error occurs - try the fallback url 
  } catch {
    try {
      const engagement = await fetch(fallbackUrl).then((res) => res.json());
      return engagement;
    } catch {
      // if that also doesnt work do nothing lol
      return;
    }
  }
};

const getBasicPokeTubeData = async (videoId) => {
  const headers = {};
  const InnerTubeData = await getInnerTubeData(videoId, headers);
  const engagement = await getEngagementData(videoId);

  return {
    video: InnerTubeData,
    engagement,
    videoUrlYoutube: `${youtubeUrl}${videoId}`,
  };
};

module.exports = getBasicPokeTubeData;
