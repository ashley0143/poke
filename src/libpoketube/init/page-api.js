 const {  fetcher,core, wiki,musicInfo, modules, version, initlog, init,} = require("../libpoketube-initsys.js");
const {
  IsJsonString,
  convert,
  getFirstLine,
  capitalizeFirstLetter,
  turntomins,
  getRandomInt,
  getRandomArbitrary,
} = require("../ptutils/libpt-coreutils.js");

 module.exports = function (app, config, renderTemplate) {
 

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

  let f = await modules.fetch(url);
  const body = await f.text();

  res.send(body);
});

app.get("/api/redirect", async (req, res) => {
  const red_url = req.query.u;

  if (!red_url) {
    res.redirect("/");
  }

  res.redirect(red_url);
});

app.get("/api/opensearch", async (req, res) => {
  res.sendFile(__dirname + `/opensearch.xml`);
});

app.get("/api/instances.json", async (req, res) => {
  res.sendFile(__dirname + `/instances.json`);
});

 }