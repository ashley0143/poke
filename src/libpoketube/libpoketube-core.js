/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2022 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */

const fetch = require("node-fetch");
const { toJson } = require("xml2json");

const fetcher = require("../libpoketube/libpoketube-fetcher.js");
const getColors = require("get-image-colors");

const wiki = require("wikipedia");

const config = {
  tubeApi: "https://tube.kuylar.dev/api/",
  invapi: "https://vid.puffyan.us/api/v1",
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

/*
 * Api functions
 */

async function channel(id, cnt) {
  if (id == null) return "Gib ID";

  const videos = await fetch(
    `${config.tubeApi}channel?id=${id}&tab=videos&continuation=${cnt || ""}`
  )
    .then((res) => res.text())
    .then((xml) => JSON.parse(toJson(xml)));

  const about = await fetch(`${config.tubeApi}channel?id=${id}&tab=about`)
    .then((res) => res.text())
    .then((xml) => JSON.parse(toJson(xml)));

  return { videos, about };
}

async function video(v) {
  if (v == null) return "Gib ID";

  let nightlyRes;

  for (let i = 0; i < 2; i++) {
    try {
      const nightly = await fetch(
        `https://lighttube-nightly.kuylar.dev/api/video?v=${v}`
      ).then((res) => res.text());

      nightlyRes = nightly;
      break;
    } catch (err) {
      if (err.status === 500)
        // Retry after a second.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      else return "";
    }
  }

  const video = await fetch(`${config.tubeApi}video?v=${v}`)
    .then((res) => res.text())
    .then((xml) => JSON.parse(toJson(xml)));

  var inv_comments = await fetch(`${config.invapi}/comments/${v}`).then((res) =>
    res.text()
  );

  var comments = await JSON.parse(inv_comments);
  
  
  var video_new_info = await fetch(`${config.invapi}/videos/${v}`).then((res) =>
    res.text()
  );

  var vid = await JSON.parse(video_new_info);

  const c = await fetch(
    `${config.tubeApi}channel?id=${video.Video.Channel.id}&tab=videos`
  )
    .then((res) => res.text())
    .then((xml) => JSON.parse(toJson(xml)));

  const a = await fetch(
    `${config.tubeApi}channel?id=${video.Video.Channel.id}&tab=about`
  )
    .then((res) => res.text())
    .then((xml) => JSON.parse(toJson(xml)));

  const summary = await wiki
    .summary(video.Video.Channel.Name + " ")
    .then((summary_) => (summary_.title !== "Not found." ? summary_ : "none"));

  const data = await fetcher(v);

  const nightlyJsonData = getJson(nightlyRes);

  return {
    json: data.video.Player,
    video,
    vid,
    channel: c,
    comments,
    engagement: data.engagement,
    wiki: summary,
    desc: a.Channel.Contents.ItemSection.About.Description,
    color: await getColors(
      `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`
    ).then((colors) => colors[0].hex()),
    };
}

async function search(query, cnt) {
  if (query == null) return "Gib Query";

  const data = await fetch(
    `${config.tubeApi}search?query=${query}&continuation=${cnt || ""}`
  )
    .then((res) => res.text())
    .then((xml) => JSON.parse(toJson(xml)));

  return data;
}

module.exports = {
  search,
  video,
  channel,
};
