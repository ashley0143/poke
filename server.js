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
const fetch = require('node-fetch');

app.get("/watch", async function(req, res) {
  var url = req.query.v;
  var uu = `https://www.youtube.com/watch?v=${url}`;

  const json = await fetch(`https://yt-proxy-api.herokuapp.com/get_player_info?v=${url}`)
    .then((res) => res.json());

  const lyrics = await lyricsFinder(json.title);
 
  if (lyrics == undefined) lyrics = "Lyrics not found";
   renderTemplate(res, req, 'youtube.ejs', {
    url: json.formats[1].url,
    title: json,
    video: json,
    date: json.upload_date,
    lyrics:lyrics.replace(/\n/g, ' <br> ')
   
});
});
  app.get("/", function(req, res) {
     renderTemplate(res, req, "ytmain.ejs")
 });
app.get("/youtube/ara", async (req, res) => {
  const query = req.query.query

  if (!query) {
    return res.redirect("/")
  }

  const result = await fetch(`https://yt-proxy-api.herokuapp.com/search?q=${query}`).then(res => res.json())
  for (item of result.results) {
    if (item.type == "video") {
      const id = item.item.id
      return res.redirect(`/watch?v=${id}`)
    }
  }
})

const listener = app.listen(3000);
