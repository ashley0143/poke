/*
    Copyright (C) 2021-2022 POKETUBE & LIGHTTUBE CONTRUBUTORS (https://gitlab.com/kuylar/lighttube,https://github.com/iamashley0/poketube.)
    
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
const path = require("path");
const templateDir = path.resolve(`${process.cwd()}${path.sep}html`);
var express = require("express");
var app = express();
app.engine("html", require("ejs").renderFile);
var dislike_api = `https://returnyoutubedislikeapi.com/votes?videoId=`
app.set("view engine", "html");
const lyricsFinder = require("lyrics-finder");
const renderTemplate = async (res, req, template, data = {}) => {
  res.render(
    path.resolve(`${templateDir}${path.sep}${template}`),
    Object.assign(data)
  );
};
const fetch = require("node-fetch");
const fetcher = require("./src/fetcher.js");

app.get("/watchnew", async function (req, res) {
  var url = req.query.v;
  var uu = `https://www.youtube.com/watch?v=${url}`;

  const json = await fetch(
    `https://yt-proxy-api.herokuapp.com/get_player_info?v=${url}`
  ).then((res) => res.json());

  const lyrics = await lyricsFinder(json.title);
  if (lyrics == undefined) lyrics = "Lyrics not found";
  renderTemplate(res, req, "youtubenew.ejs", {
    url: json.formats[1].url,
    title: json,
    video: json,
    date: json.upload_date,
    lyrics: lyrics.replace(/\n/g, " <br> "),
  });
});
app.get("/watch", async function (req, res) {
  var url = req.query.v;
  var e = req.query.e;

  var uu = `https://www.youtube.com/watch?v=${url}`;

  var opts = {
    maxResults: 1,
    key: process.env.yt,
  };

  const json = await fetch(
    `https://yt-proxy-api.herokuapp.com/get_player_info?v=${url}`
  ).then((res) => res.json());
    const newapi = await fetch(
    `https://yt-proxy-api.herokuapp.com/video?v=${url}`
  ).then((res) => res.json());
   const dislike = await fetch(`${dislike_api}${url}`).then((res) => res.json());
  const dislikes = dislike.dislikes
  
 
  var s = json.formats
  const lastItem = s[s.length - 1];
  
  const lyrics = await lyricsFinder(json.title);
  if (lyrics == undefined) lyrics = "Lyrics not found";
  renderTemplate(res, req, "youtubenew.ejs", {
    url: lastItem.url,
    dislikes:dislikes,
    title: json,
    a:newapi,
    video: json,
    date: json.upload_date,
    e:e,
    lyrics: lyrics.replace(/\n/g, " <br> "),
  });
});
app.get("/", function (req, res) {
  renderTemplate(res, req, "ytmain.ejs");
});

app.get("/youtube/ara", async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.redirect("/");
  }

  const result = await fetch(
    `https://yt-proxy-api.herokuapp.com/search?q=${query}`
  ).then((res) => res.json());
  for (item of result.results) {
    if (item.type == "video") {
      const videoid = item.item.id;
      return res.redirect(`/watch?v=${videoid}`);
    }
  }
});

app.get("/js/:id", (req, res) => {
  var id = req.params.id;
  if (id === "vendor.chunk.js") {
    res.redirect(
      "https://global-assets.iamashley.xyz/assets/vendor.004560fb.js"
    );
  }
  res.sendFile(__dirname + `/js/${id}`);
});

app.get("/css/:id", (req, res) => {
  res.sendFile(__dirname + `/css/${req.params.id}`);
});
app.get("/search/:id", (req, res) => {
  res.sendFile(__dirname + `/search/${req.params.id}`);
});
/* WIP 
app.get("/proxy", async function (req, res){
  var url = req.query.v;
 
const options = {
  url: `https://watch.poketalebot.com/fetch?v=${url}`,
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:96.0) Gecko/20100101 Firefox/96.0'
  }
};
  const json = await fetch(
    `https://yt-proxy-api.herokuapp.com/get_player_info?v=${url}`
  ).then((res) => res.json());
   var s = json.formats
  const lastItem = s[s.length - 1];
 var request = require('request');
  var newurl = `https://watch.poketalebot.com/fetch?v=${url}`;
  request(options).pipe(res);
 });

 app.get("/fetch", async function (req, res) {
  var url = req.query.v;
  const js = await fetch(
    `https://yt-proxy-api.herokuapp.com/get_player_info?v=${url}`
  ).then((res) => res.json());
  var s = js.formats
  const lastItem = s[s.length - 1];
  res.json(lastItem.url)
 });
 */
 app.get("/video/upload", (req, res) => {
           res.redirect("https://youtube.com/upload?from=poketube_utc");

 });
const listener = app.listen(3000);
