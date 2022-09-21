/*

    PokeTube is an Free/Libre youtube front-end. this is our main file.
  
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

///////////// DEFINITONS /////////////
const path = require("path");
const htmlParser = require("node-html-parser");
const getColors = require("get-image-colors");

const moment = require("moment");
const lyricsFinder = require("./src/lyrics.js");
const fetch = require("node-fetch");

const { toJson } = require("xml2json");
const fetcher = require("./src/fetcher.js");
const templateDir = path.resolve(`${process.cwd()}${path.sep}html`);

var express = require("express");
var useragent = require("express-useragent");

// hash
const sha384 = require("js-sha512").sha384;

const musicInfo = require("music-info");
const wiki = require("wikipedia");

var http = require("http");
var https = require("https");

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;

var app = express();
app.engine("html", require("ejs").renderFile);
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(useragent.express());

app.set("view engine", "html");
const renderTemplate = async (res, req, template, data = {}) => {
  res.render(
    path.resolve(`${templateDir}${path.sep}${template}`),
    Object.assign(data)
  );
};

const random_words = [
  "banana pie",
  "how to buy an atom bomb",
  "is love just an illusion",
  "things to do if ur face becomes benjamin frenklin",
  "how do defeat an pasta",
  "can you go to space?",
  "how to become a god?",
  "is a panda a panda if pandas???",
  "Minecraft movie trailer",
  "monke",
];

/*
this is our config file,you can change stuff here
*/
const config = {
  tubeApi: "https://tube.kuylar.dev/api/",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/", //  def matomo url
};

///////////// PAGES /////////////

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");

  next();
});

app.get("/encryption", async function (req, res) {
  var v = req.query.v;

  const video = await fetch(config.tubeApi + `video?v=${v}`);
  var fetching = await fetcher(v);

  const json = fetching.video.Player;
  const h = await video.text();
  const k = JSON.parse(toJson(h));
  if (!v) res.redirect("/");

  //video
  const j = fetching.video.Player.Formats.Format,
    j_ = Array.isArray(j) ? j[j.length - 1] : j;
  let url;
  if (j_.URL != undefined) url = j_.URL;

  // json response
  const re = {
    main: {
      video_id: sha384(json.id),
      channel: sha384(json.Channel.Name),
      title: sha384(json.Title),
      date: sha384(btoa(Date.now()).toString()),
    },
    info: {
      desc: sha384(json.Description),
    },
    video: {
      title: sha384(json.Title),
      url: sha384(url),
    },
  };

  res.json(re);
});

///////////// VIDEO PAGES ETC. /////////////
app.get("/watch", async function (req, res) {
  /*
   * QUERYS
   * v = Video ID
   * e = Embed
   * r = Recommended videos
   * f = Recent videos from channel
   * t = Piwik OptOut
   * q = quality obv
   */
  var v = req.query.v;
  var e = req.query.e;
  var r = req.query.r;
  var f = req.query.f;
  var t = req.query.t;
  var q = req.query.quality;

  const video = await fetch(config.tubeApi + `video?v=${v}`);

  const info = await fetch("http://ip-api.com/json/");
  const jj = await info.text();
  const ip = JSON.parse(jj);
  var badges = "";

  for (let i = 0; i < 3; i++) {
    try {
      const nightly = await fetch(
        `https://lighttube-nightly.kuylar.dev/api/video?v=${v}`
      );
      var n = await nightly.text();
    } catch (err) {
      if (err.status === 503) {
        // retry after a bit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        return (n = "none");
      }
    }
  }

  var nn = "";

  if (n === "none") {
    badges = "";
  }
  if (IsJsonString(n)) {
    if (n !== "none") {
      badges = JSON.parse(n).channel.badges[0];
    }
  }

  var comments = "";
  if (n === "none") {
    comments = "";
  }
  if (IsJsonString(n)) {
    if (n !== "none") {
      comments = JSON.parse(n).commentCount;
    }
  }

  var fetching = await fetcher(v);

  const json = fetching.video.Player;
  const h = await video.text();
  const k = JSON.parse(toJson(h));
  if (!v) res.redirect("/");

  //video
  if (!q) url = `https://tube.kuylar.dev/proxy/media/${v}/22`;
  if (q === "medium") {
    var url = `https://tube.kuylar.dev/proxy/media/${v}/18`;
  }

  // encryption
  const url_e =
    url +
    "?e=" +
    sha384(k.Video.Channel.id) +
    sha384(k.Video.Channel.id) +
    "Piwik" +
    sha384(config.t_url);

  // channel info
  const engagement = fetching.engagement;
  const channel = await fetch(
    config.tubeApi + `channel?id=${k.Video.Channel.id}&tab=videos`
  );
  const c = await channel.text();
  const tj = JSON.parse(toJson(c));

  // lyrics
  //  const lyrics = await lyricsFinder(json.Title);

  const summary = await wiki.summary(k.Video.Channel.Name);

  var w = "";
  if (summary.title === "Not found.") {
    w = "none";
  }
  if (summary.title !== "Not found.") {
    w = summary;
  }

  renderTemplate(res, req, "poketube.ejs", {
    url: url_e,
    color: await getColors(
      `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`
    ).then((colors) => colors[0].hex()),
    engagement: engagement,
    video: json,
    date: moment(k.Video.uploadDate).format("LL"),
    e: e,
    k: k,
    process: process,
    sha384: sha384,
    isMobile: req.useragent.isMobile,
    tj: tj,
    r: r,
    qua: q,
    ip: ip,
    wiki: w,
    f: f,
    t: config.t_url,
    optout: t,
    badges: badges,
    comments: comments,
    lyrics: "",
  });
});

app.get("/music", async function (req, res) {
  /*
   * QUERYS
   * v = Video ID
   * e = Embed
   * r = Recommended videos
   * f = Recent videos from channel
   * t = Piwik OptOut
   * q = quality obv
   */
  var v = req.query.v;
  var e = req.query.e;
  var r = req.query.r;
  var f = req.query.f;
  var t = req.query.t;

  const info = await fetch("http://ip-api.com/json/");
  const n = await info.text();
  const ip = JSON.parse(n);

  if (!v) res.redirect("/");

  const video = await fetch(config.tubeApi + `video?v=${v}`);
  var fetching = await fetcher(v);

  const json = fetching.video.Player;
  const h = await video.text();
  const k = JSON.parse(toJson(h));

  if (!json.Channel.Name.endsWith(" - Topic")) {
    res.redirect(`/watch?v=${v}`);
  }

  //video
  var url = `https://tube.kuylar.dev/proxy/media/${v}/18`;

  // encryption
  const url_e =
    url +
    "?e=" +
    sha384(json.id) +
    sha384(json.Title) +
    sha384(json.Channel.id) +
    sha384(json.Channel.id) +
    "Piwik" +
    sha384(config.t_url);

  // channel info
  const engagement = fetching.engagement;
  const channel = await fetch(
    config.tubeApi + `channel?id=${json.Channel.id}&tab=videos`
  );
  const c = await channel.text();
  const tj = JSON.parse(toJson(c));

  // info
  const song = await musicInfo.searchSong(
    { title: json.Title, artist: json.Channel.Name.replace("- Topic", "") },
    1000
  );

  if (!song) {
    res.redirect(`/watch?v=${v}`);
  }
  var lyrics = await musicInfo
    .searchLyrics({ title: song.title, artist: song.artist })
    .catch(() => null);

  var ly = "";

  if (lyrics === null) {
    ly = "This Is Where I'd Put The songs lyrics. IF IT HAD ONE ";
  }

  if (lyrics) {
    ly = lyrics.lyrics.replace(/\n/g, " <br> ");
  }

  renderTemplate(res, req, "poketube-music.ejs", {
    url: url_e,
    info: song,
    color: await getColors(
      `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`
    ).then((colors) => colors[0].hex()),
    engagement: engagement,
    process: process,
    ip: ip,
    video: json,
    date: moment(k.Video.uploadDate).format("LL"),
    e: e,
    k: k,
    sha384: sha384,
    isMobile: req.useragent.isMobile,
    tj: tj,
    r: r,
    f: f,
    t: config.t_url,
    optout: t,
    lyrics: ly,
  });
});

app.get("/download", async function (req, res) {
  var v = req.query.v;

  // video
  const video = await fetch(config.tubeApi + `video?v=${v}`);
  const h = await video.text();
  const k = JSON.parse(toJson(h));

  if (!v) res.redirect("/");

  var fetching = await fetcher(v);
  const j = fetching.video.Player.Formats.Format,
    j_ = Array.isArray(j) ? j[j.length - 1] : j;
  let url;
  if (j_.URL != undefined) url = j_.URL;

  const json = fetching.video.Player;
  const engagement = fetching.engagement;

  renderTemplate(res, req, "download.ejs", {
    url: url,
    engagement: engagement,
    k: k,
    video: json,
    date: k.Video.uploadDate,
    color: await getColors(
      `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`
    ).then((colors) => colors[0].hex()),
  });
});

app.get("/old/watch", async function (req, res) {
  var v = req.query.v;
  var e = req.query.e;
  if (!v) res.redirect("/");

  res.redirect(`/watch?v=${v}`);
});

app.get("/search", async (req, res) => {
  const { toJson } = require("xml2json");
  const query = req.query.query;
  const search = await fetch(
    `https://tube.kuylar.dev/api/search?query=${query}`
  );

  const text = await search.text();
  const j = JSON.parse(toJson(text));

  if (!query) {
    return res.redirect("/");
  }

  renderTemplate(res, req, "search.ejs", {
    j: j,
    q: query,
  });
});

app.get("/channel/", async (req, res) => {
  const ID = req.query.id;
  const tab = req.query.tab;
  
  // about
  const bout = await fetch(config.tubeApi + `channel?id=${ID}&tab=about`);
  const h = await bout.text();
  const k = JSON.parse(toJson(h));

  //videos
  const channel = await fetch(config.tubeApi + `channel?id=${ID}&tab=videos`);
  const c = await channel.text();
  const tj = JSON.parse(toJson(c));
  
  const summary = await wiki.summary(k.Channel.Metadata.Name);

  var w = "";
  if (summary.title === "Not found.") {
    w = "none";
  }
  if (summary.title !== "Not found.") {
    w = summary;
  }
  
  const { Subscribers: subscribers } = k.Channel.Metadata;
  const description =  k.Channel.Contents.ItemSection.About.Description
  
    var d = description.toString().replace(/\n/g, " <br> ")
    if(d === "[object Object]"){
      var d = ""
    }
   
  renderTemplate(res, req, "channel.ejs", {
    ID: ID,
    tab: tab,
    j: k,
    tj: tj,
    wiki: w,
    isMobile: req.useragent.isMobile,
    about: k.Channel.Contents.ItemSection.About,
    subs:
      typeof subscribers === "string"
        ? subscribers.replace("subscribers", "")
        : "Private",
    desc: d
  });
});

/////////////  STATIC /////////////
app.get("/privacy", function (req, res) {
  renderTemplate(res, req, "priv.ejs");
});

app.get("/143", function (req, res) {
  renderTemplate(res, req, "143.ejs");
});

app.get("/domains", function (req, res) {
  renderTemplate(res, req, "domains.ejs");
});

app.get("/license", function (req, res) {
  renderTemplate(res, req, "license.ejs");
});

app.get("/css/:id", (req, res) => {
  res.sendFile(__dirname + `/css/${req.params.id}`);
});

app.get("/js/:id", (req, res) => {
  res.sendFile(__dirname + `/js/${req.params.id}`);
});

app.get("/video/upload", (req, res) => {
  res.redirect("https://youtube.com/upload");
});

///////////// API /////////////

app.get("/embed/:v", async function (req, res) {
  var v = req.params.v;

  res.redirect(`https://tube.kuylar.dev/proxy/media/${v}/18`);
});

app.get("/api/search", async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.redirect("/");
  }
  return res.redirect(`/search?query=${query}`);
});

app.get("/api/video/download", async function (req, res) {
  var v = req.query.v;

  var format = "mp4";
  var q = "22";
  if (req.query.q) q = req.query.q;
  if (req.query.f) {
    var format = "mp3";
  }
  var fetching = await fetcher(v);

  const json = fetching.video.Player;

  const url = `https://tube.kuylar.dev/proxy/download/${v}/${q}/${json.Title}.${format}`;

  res.redirect(url);
});

app.get("/api/video/downloadjson", async function (req, res) {
  var v = req.query.v;
  var fetching = await fetcher(v);
  const url = fetching.video.Player.Formats.Format[1].URL;
  res.json(url);
});

app.get("/api/subtitles", async (req, res) => {
  const id = req.query.v;
  const l = req.query.h;

  const url = `https://tube.kuylar.dev/proxy/caption/${id}/${l}/`;

  let f = await fetch(url);
  const body = await f.text();

  res.send(body);
});

app.get("/api/opensearch", async (req, res) => {
  res.sendFile(__dirname + `/opensearch.xml`);
});
///////////// REDIRECTS / DEPRACATED  /////////////

app.get("/discover", async function (req, res) {
  res.redirect("/");
});

app.get("/video/upload", (req, res) => {
  res.redirect("https://youtube.com/upload");
});



///////////// 404 AND MAIN PAGES ETC /////////////
app.get("/", async function (req, res) {
  const trends = await fetch(config.tubeApi + `trending`);
  const h = await trends.text();
  const k = JSON.parse(toJson(h));
  renderTemplate(res, req, "main.ejs", {
    k: k,
    isMobile: req.useragent.isMobile,
  });
});
 

app.get("*", function (req, res) {
  const things = random_words[Math.floor(Math.random() * random_words.length)];
  renderTemplate(res, req, "404.ejs", {
    random: things,
  });
});

 ////////////////////////////////////////////////////

// listen

app.listen("3000", () => {});
