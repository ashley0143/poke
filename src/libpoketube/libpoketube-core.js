/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2023 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */

const fetch = require("node-fetch");
const { toJson } = require("xml2json");
const { curly } = require("node-libcurl");

const fetcher = require("../libpoketube/libpoketube-fetcher.js");
const getColors = require("get-image-colors");

const wiki = require("wikipedia");
const sqp = "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";

const config = {
  tubeApi: "https://inner-api.poketube.fun/api/",
  invapi: "https://invid-api.poketube.fun/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/", //  def matomo url
};

function initerr(args){
  console.error("[LIBPT CORE ERROR]" + args) 
}


// Util functions
function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function checkUnexistingObject(obj) {
  if (obj) {
    if ("authorId" in obj) {
      return true;
    }
  }
}

/*
 * Api functions
 */

async function channel(id, cnt) {
  if (id == null) return "Gib ID";

  const videos = await fetch(
    `${config.tubeApi}channel?id=${id}&tab=videos&continuation=${cnt || ""}`
  )
    .then((res) => res.text())
    .then((xml) => getJson(toJson(xml)));

  const about = await fetch(`${config.tubeApi}channel?id=${id}&tab=about`)
    .then((res) => res.text())
    .then((xml) => getJson(toJson(xml)));

  return { videos, about };
}

const cache = {};

async function video(v) {
  if (v == null) return "Gib ID";

  // Check if result is already cached
  if (cache[v] && Date.now() - cache[v].timestamp < 3600000) {
    console.log("Returning cached result");
    return cache[v].result;
  }

  let nightlyRes;
  var desc = "";

  try {
    var inv_comments = await fetch(`${config.invapi}/comments/${v}`).then(
      (res) => res.text()
    );

    var comments = await getJson(inv_comments);
  } catch (error) {
    initerr("Error getting comments", error);
    var comments = "";
  }

  let vid;

  try {
    const videoInfo = await fetch(`${config.invapi}/videos/${v}`).then((res) =>
      res.text()
    );
    vid = await getJson(videoInfo);
  } catch (error) {
    initerr("Error getting video info", error);
  }

  if (!vid) {
    console.log(
      `Sorry nya, we couldn't find any information about that video qwq`
    );
  }

  if (checkUnexistingObject(vid)) {
    var a;

    try {
      var a = await fetch(
        `${config.tubeApi}channel?id=${vid.authorId}&tab=about`
      )
        .then((res) => res.text())
        .then((xml) => getJson(toJson(xml)));
    } catch (error) {
      initerr("Error getting channel info", error);
      var a = "";
    }


    desc = a.Channel?.Contents?.ItemSection?.About?.Description;

    const fe = await fetcher(v);

    const nightlyJsonData = getJson(nightlyRes);

    try {
      
    const summary = await wiki
      .summary(vid.author + " ")
      .then((summary_) =>
        summary_.title !== "Not found." ? summary_ : "none"
      );
      
      const headers = {};

      var { data } = await curly.get(`${config.tubeApi}video?v=${v}`, {
        httpHeader: Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
      });
      var json = toJson(data);
      const video = getJson(json);

      // Store result in cache
      cache[v] = {
        result: {
          json: fe?.video?.Player,
          video,
          vid,
          comments,
          engagement: fe.engagement,
          wiki: summary,
          desc: desc,
          color: await getColors(
            `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${sqp}`
          ).then((colors) => colors[0].hex()),
          color2: await getColors(
            `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${sqp}`
          ).then((colors) => colors[1].hex()),
        },
        timestamp: Date.now(),
      };

      return cache[v].result;
    } catch (error) {
      initerr("Error getting video", error);
    }
  }
}

async function search(query, cnt) {
  if (query == null) return "Gib Query";

  const data = await fetch(
    `${config.tubeApi}search?query=${query}&continuation=${cnt || ""}`
  )
    .then((res) => res.text())
    .then((xml) => getJson(toJson(xml)));

  return data;
}

async function isvalidvideo(v) {
    if (v != "assets") {
      return true;
    } else {
    return false;
    }
 }

module.exports = {
  search,
  video,
  isvalidvideo,
  channel,
};
