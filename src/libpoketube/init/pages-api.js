const {
  fetcher,
  core,
  wiki,
  musicInfo,
  modules,
  version,
  initlog,
  init,
} = require("../libpoketube-initsys.js");
const {
  IsJsonString,
  convert,
  getFirstLine,
  capitalizeFirstLetter,
  turntomins,
  getRandomInt,
  getRandomArbitrary,
} = require("../ptutils/libpt-coreutils.js");

function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

const pkg = require("../../../package.json");
const ver = "v23.0206-aStfl-MAJOR-stable-nonLTS-git-MTY4MzU2MzMxNQ==";
const branch = "master";
const codename = "astolfo-2";
const versionnumber = "244";
const relaseunixdate = "MTY4NTcxNzAzOQ==";

module.exports = function (app, config, renderTemplate) {
  app.get("/embed/:v", async function (req, res) { 
    res.send("Disabled until further notice")
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
 
    const url = `https://tube.kuylar.dev/proxy/media/${v}/${q}`;

    res.redirect(url);
  });

  app.get("/api/subtitles", async (req, res) => {
    const id = req.query.v;
    const l = req.query.h;

        try {

    let url = `https://invid-api.poketube.fun/api/v1/captions/${id}?label=${l}`;

    let f = await modules.fetch(url);
    const body = await f.text();

    res.send(body);
          
        } catch {
          
        }
  });

  app.get("/feeds/videos.xml", async (req, res) => {
    const id = req.query.channel_id;

    let url = `https://youtube.com/feeds/videos.xml?channel_id=${id}`;

    let f = await modules.fetch(url, {
      method: req.method,
    });

    f.body.pipe(res);
  });

  app.get("/api/redirect", async (req, res) => {
    const red_url = atob(req.query.u);

    if (!red_url) {
      res.redirect("/");
    }

    res.redirect(red_url + "?f=" + req.query.u);
  });

  app.get("/api/version.json", async (req, res) => {
    const invidious = await modules
      .fetch("https://invid-api.poketube.fun/api/v1/stats")
      .then((res) => res.text())
      .then((txt) => getJson(txt));

    const response = {
      pt_version: ver,
      branch,
      relaseunixdate,
      vernum: versionnumber,
      codename,
      packages: {
        libpt: version,
        node: process.version,
        v8: process.versions.v8,
      },
      invidious,
      flac: {
        poketube_flac: "1.2a",
        apple_musickit: "1.2.3",
        poketube_normalize_volume: "1.2.23-yt",
      },
      piwik: "master",
      process: process.versions,
      dependencies: pkg.dependencies,
      poketubeapicode: btoa(Date.now() + invidious.software.version)
    };

    res.json(response);
  });

  app.get("/api/instances.json", async (req, res) => {
    try {
      const url = `https://codeberg.org/Ashley/poketube/raw/branch/main/instances.json`;

      let f = await modules
        .fetch(url)
        .then((res) => res.text())
        .then((json) => JSON.parse(json));

      res.json(f);
    } catch {
      res.json("error while fetching instances");
    }
  });
};

module.exports.api = versionnumber;
