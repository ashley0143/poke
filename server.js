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

app.get("/watch", function(req, res) {
  var url = req.query.v;
  var jth = `https://www.youtube.com/watch?v=${url}`;
  var search = require("youtube-search");

  var opts = {
    maxResults: 1,
    key: process.env.yt
  };

  const fetch = require("node-fetch");
  search(jth, opts, function(err, results) {
    var i = results[0].id;
    fetch(`https://poketalebot.com/api/ytdl/dowlands/fromurl/get/json?url=${i}`)
      .then(res => res.json())
      .then(json => {
        var video = results[0];
        if (!video) return;
        if (err) console.log(err);

        var h = json.url;
        renderTemplate(res, req, "youtube.ejs", { url: h, title: video });
      });
  });
});

app.get("/", function(req, res) {
  renderTemplate(res, req, "ytmain.ejs");
});

app.get("/api/search", function(req, res) {
  var url = req.query.query;
  var search = require("youtube-search");

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
