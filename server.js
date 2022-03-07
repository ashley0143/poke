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
const moment = require("moment");
const templateDir = path.resolve(`${process.cwd()}${path.sep}html`);
var express = require("express");
var app = express();
app.engine("html", require("ejs").renderFile);
var dislike_api = `https://returnyoutubedislikeapi.com/votes?videoId=`
app.set("view engine", "html");
const lyricsFinder = require("./src/lyrics.js");
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
   var fetching = await fetcher(url)
  
   const dislike = await fetch(`${dislike_api}${url}`).then((res) => res.json());
  const dislikes = dislike.dislikes
  
  const j = fetching.video.Player.Formats.Format
   
    if(j[1].URL){
    var url = j[1].URL
   } else if(j[1].URL){
    var s = j.formats
    const lastItem = s[s.length - 1];
    var url = lastItem.URL
   }
 
  const json = fetching.video.Player
   const engagement = fetching.engagement
   const lyrics = await lyricsFinder(json.Title);
  if (lyrics == undefined) lyrics = "Lyrics not found";
  renderTemplate(res, req, "youtubenew.ejs", {
    url: url,
    engagement:engagement,
    title: json,
    a:json,
    video: json,
    date: moment(json.uploadDate).format("LL"),
    e:e,
    lyrics: lyrics.replace(/\n/g, " <br> "),
  });
});
app.get("/", function (req, res) {
  renderTemplate(res, req, "ytmain.ejs");
});
app.get("/channel", function (req, res) {
  renderTemplate(res, req, "channel.ejs");
});
app.get("/domains", function (req, res) {
  renderTemplate(res, req, "domains.ejs");
});
app.get("/api/search", async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.redirect("/");
  }
  fetcher.searcher(query,res)
});
app.get("/css/:id", (req, res) => {
  res.sendFile(__dirname + `/css/${req.params.id}`);
});
app.get("/video/upload", (req, res) => {
           res.redirect("https://youtube.com/upload?from=poketube_utc");

 });
app.get("*", function (req, res) {
        renderTemplate(res, req, "404.ejs");
});
const listener = app.listen(3000);
