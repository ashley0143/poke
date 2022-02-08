const path = require("path");
const templateDir = path.resolve(`${process.cwd()}${path.sep}html`);
var express = require("express");
var app = express();
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

const renderTemplate = async (res, req, template, data = {}) => {
  res.render(
    path.resolve(`${templateDir}${path.sep}${template}`),
    Object.assign(data)
  );
};
 
const search = require('youtube-search');
const fetch = require('node-fetch');

app.get("/watch", function(req, res) {
  var url = req.query.v;
  var uu = `https://www.youtube.com/watch?v=${url}`;

  var opts = {
    maxResults: 1,
    key: process.env.yt
  };
  
  search(uu, opts, function(err, results) {
    var i = results[0].id;
    fetch(`https://yt-proxy-api.herokuapp.com/get_player_info?v=${i}`)
      .then(res => res.json())
      .then(json => {
        var video = results[0];
        if (!video) return;
        if (err) console.log(err);
        const tarih = json.upload_date
        var h = json.formats[1].url;
        renderTemplate(res, req, "youtube.ejs", { url: h, title: video,video:json,date:tarih });
      });
  });
});
  app.get("/", function(req, res) {
        var url = req.query.url;
    var search = require("youtube-search");

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
