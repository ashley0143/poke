/*

    PokeTube is an Free/Libre youtube front-end !
    
    Copyright (C) 2021-2022 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
  */

const fetch = require("node-fetch");
const { toJson } = require("xml2json");

const fetcher = require("../src/fetcher.js");
const getColors = require("get-image-colors");

const wiki = require("wikipedia");

const config = {
  tubeApi: "https://tube.kuylar.dev/api/",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/", //  def matomo url
};

// Util functions
function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function convert(value) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
  }).format(value);
}

function getFirstLine(text) {
  var index = text.indexOf("<br> ");
  if (index === -1) index = undefined;
  return text.substring(0, index);
}

/*
 * Api functions
 */

async function channel(id, cnt) {
  if (!id) return "Gib ID";

  if (cnt) {
    var continuation = cnt;
  }
  if (!continuation) {
    var continuation = "";
  }

  // videos
  const channel = await fetch(
    config.tubeApi + `channel?id=${id}&tab=videos&continuation=${continuation}`
  );
  const c = await channel.text();
  const videos = JSON.parse(toJson(c));

  // about
  const abtchnl = await fetch(config.tubeApi + `channel?id=${id}&tab=about`);
  const ab = await abtchnl.text();
  const a = JSON.parse(toJson(ab));

  return {
    videos: videos,
    about: a,
  };
}

async function video(v) {
  if (!v) return "Gib ID";

  var badges = "";

  for (let i = 0; i < 2; i++) {
    try {
      const nightly = await fetch(
        `https://lighttube-nightly.kuylar.dev/api/video?v=${v}`
      );
      var n = await nightly.text();
    } catch (err) {
      if (err.status === 500) {
        // retry after a bit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        return (n = "");
      }
    }
  }

  var nn = "";
  var nnn = "";
  var comments = "";

  if (n == "") {
    badges, nnn, (comments = "");
  }

  if (IsJsonString(n)) {
    if (n != "") {
      nnn = JSON.parse(n);
      badges = nnn.channel.badges[0];
      comments = nnn.commentCount;
    }
  }

  const video = await fetch(config.tubeApi + `video?v=${v}`);

  const h = await video.text();
  const k = JSON.parse(toJson(h));

  const tj = await channel(k.Video.Channel.id).then((data) => data.videos);
  const a = await channel(k.Video.Channel.id).then((data) => data.about);

  const summary = await wiki.summary(k.Video.Channel.Name);

  var w = "";
  if (summary.title === "Not found.") {
    w = "none";
  }
  if (summary.title !== "Not found.") {
    w = summary;
  }

  var fetching = await fetcher(v);

  const json = fetching.video.Player;

  if (IsJsonString(n)) {
    if (n != "") {
      var returner = {
        json: json,
        video: k,
        beta: nnn,
        badges: badges,
        comments: comments,
        engagement: fetching.engagement,
        wiki: w,
        desc: a.Channel.Contents.ItemSection.About.Description,
        color: await getColors(
          `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`
        ).then((colors) => colors[0].hex()),
        channel: tj,
        b: true,
      };
    }
  }

  if (!IsJsonString(n)) {
    if (n == "") {
      var returner = {
        json: json,
        video: k,
        engagement: fetching.engagement,
        wiki: w,
        desc: a.Channel.Contents.ItemSection.About.Description,
        channel: tj,
        color: await getColors(
          `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`
        ).then((colors) => colors[0].hex()),
        b: false,
      };
    }
  }

  return returner;
}

async function search(query, cnt) {
  if (!query) return "Gib Query";

  if (cnt) {
    var continuation = cnt;
  }
  if (!cnt) {
    var continuation = "";
  }

  const search = await fetch(
    `https://tube.kuylar.dev/api/search?query=${query}&continuation=${continuation}`
  );

  const text = await search.text();
  const j = JSON.parse(toJson(text));

  return j;
}

module.exports = {
  search,
  video,
  channel,
};
