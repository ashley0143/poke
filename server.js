/*
    Copyright (C) 2021-2022 POKETUBE & LIGTHTUBE CONTRUBUTORS (https://gitlab.com/kuylar/lighttube,https://github.com/iamashley0/poketube.)
    
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
app.set("view engine", "html");
const lyricsFinder = require("lyrics-finder");
const renderTemplate = async (res, req, template, data = {}) => {
  res.render(
    path.resolve(`${templateDir}${path.sep}${template}`),
    Object.assign(data)
  );
};
const fetch = require("node-fetch");
 
app.get("/watch", async function (req, res) {
  var url = req.query.v;
  var uu = `https://www.youtube.com/watch?v=${url}`;

  var opts = {
    maxResults: 1,
    key: process.env.yt,
  };
  //https://gitlab.com/kuylar/lighttube/-/blob/master/YTProxy/Models/YoutubePlayer.cs
  const json = await fetch(
    `https://yt-proxy-api.herokuapp.com/get_player_info?v=${url}`
  ).then((res) => res.json());
  //https://gitlab.com/kuylar/lighttube/-/blob/master/YTProxy/Youtube.cs
    const newapi = await fetch(
    `https://yt-proxy-api.herokuapp.com/video?v=${url}`
  ).then((res) => res.json());
  console.log(newapi)
  const lyrics = await lyricsFinder(json.title);
  if (lyrics == undefined) lyrics = "Lyrics not found";
  renderTemplate(res, req, "youtubenew.ejs", {
    url: json.formats[1].url,
    title: json,
    a:newapi,
    video: json,
    date: json.upload_date,
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

app.get("/css/:id", (req, res) => {
  res.sendFile(__dirname + `/css/${req.params.id}`);
});

const listener = app.listen(3000);
