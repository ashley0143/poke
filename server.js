const path = require("path");
const templateDir = path.resolve(`${process.cwd()}${path.sep}html`);
var express = require("express");
var app = express();
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
const lyricsFinder = require("lyrics-finder");
 const renderTemplate = async (res, req, template, data = {}) => {
  res.render(path.resolve(`${templateDir}${path.sep}${template}`), Object.assign(data)
);
};
const ytSearch = require('youtube-search');
const fetch = require('node-fetch');
const search = require("youtube-search");

app.get("/watch", function(req, res) {
  var url = req.query.v;
  var uu = `https://www.youtube.com/watch?v=${url}`;
  var search = require("youtube-search");

  var opts = {
    maxResults: 1,
    key: process.env.yt
  };

   search(uu, opts, async (err, results) => {
  if (err != undefined)
    return console.error(err);
  if (results.length === 0) return;

  const video = results[0];

  const json = await fetch(`https://yt-proxy-api.herokuapp.com/get_player_info?v=${video.id}`)
    .then((res) => res.json());

  const lyrics = await lyricsFinder(video.title);
 
  if (lyrics == undefined) lyrics = "Lyrics not found";
   renderTemplate(res, req, 'youtube.ejs', {
    url: json.formats[1].url,
    title: video,
    video: json,
    date: json.upload_date,
    lyrics:lyrics.replace(/\n/g, ' <br> ')
  });
});
});
  app.get("/", function(req, res) {
        var url = req.query.url;

 if(url){
    var opts = {
      maxResults: 1,
      key: process.env.yt
    };

    search(url, opts, function(err, results) {
      var h = results[0].id;
     var lmao = results[0];
if(err) return
      res.redirect(`/watch?v=${h}&title=${lmao.title}&channel=${lmao.channelTitle}&searchquery=${url}`);
    });
 }
    if(!url){
     renderTemplate(res, req, "ytmain.ejs")
    }
 });
  
 
app.get('/youtube/ara', async (req, res) => {
    var url = req.query.query;
 
  if (!req.query.query) {
    return res.redirect(`/`);
  }

  var opts = {
    maxResults: 1,
    key: process.env.yt
  };

  search(req.query.query, opts, function(err, results) {
    var h = results[0].id;
    res.redirect(`/watch?v=${h}`);
  });
});

const listener = app.listen(3000);
