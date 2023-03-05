 /*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2023 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */

const fetch = require("node-fetch");
const { toJson } = require("xml2json");

const fetcher = require("../libpoketube/libpoketube-fetcher.js");
const getColors = require("get-image-colors");

const wiki = require("wikipedia");
const sqp =
  "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";

const config = {
  tubeApi: "https://api.poketube.fun/api/",
  invapi: "https://yt.oelrichsgarcia.de/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/", //  def matomo url
};

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
  if (cache[v] && (Date.now() - cache[v].timestamp) < 3600000) {
    console.log("Returning cached result");
    return cache[v].result;
  }

  let nightlyRes;
  var desc = "";
 
  try {
    var inv_comments = await fetch(`${config.invapi}/comments/${v}?region=US`).then(
      (res) => res.text()
    );

    var comments = await getJson(inv_comments);
  } catch {
    var comments = "";
  }
  
  let vid;

      try {
      const videoInfo = await fetch(`https://inv.vern.cc/api/v1/videos/${v}?region=US`).then(res => res.text());
      vid = await getJson(videoInfo);
     } catch (error) {
       
     }
   
  
  if (!vid) {
    console.log(`Sorry nya, we couldn't find any information about that video qwq`);
  }

  if (checkUnexistingObject(vid)) {
    var a;

    try {
      var a = await fetch(
        `${config.tubeApi}channel?id=${vid.authorId}&tab=about`
      )
        .then((res) => res.text())
        .then((xml) => getJson(toJson(xml)));
    } catch {
      var a = "";
    }

    const summary = await wiki
      .summary(vid.author + " ")
      .then((summary_) =>
        summary_.title !== "Not found." ? summary_ : "none"
      );

    desc = a.Channel?.Contents?.ItemSection?.About?.Description;

    const data = await fetcher(v);

    const nightlyJsonData = getJson(nightlyRes);
    const video =  await fetch(`${config.tubeApi}video?v=${v}`)
          .then((res) => res.text())
          .then((xml) => getJson(toJson(xml)))
          .catch(" ")
    
    
    // Store result in cache
    cache[v] = {
      result: {
        json: data?.video?.Player,
        video,
        vid,
        comments,
        engagement: data.engagement,
        wiki: summary,
        desc: desc,
        color: await getColors(
          `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${sqp}`
        ).then((colors) => colors[0].hex()),
        color2: await getColors(
          `https://i.ytimg.com/vi/${v}/hqdefault.jpg?sqp=${sqp}`
        ).then((colors) => colors[1].hex()),
      },
      timestamp: Date.now()
    };

    return cache[v].result;
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
    var status;

    async function ryd() {
      try {
        const engagement = await fetch(`${config.dislikes}${v}`).then((res) =>
          res.json()
        );
        return engagement;
      } catch {}
    }

    if (ryd.status) {
      status = await ryd.status();
    } else {
      status = "200";
    }

    if (status == 400) {
      return false;
    } else {
      return true;
    }
  }
}

module.exports = {
  search,
  video,
  isvalidvideo,
  channel,
};
