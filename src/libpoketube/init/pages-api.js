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

const pkg = require("../../../package.json");

const ver = "v23.0205-cMAarEbA-stable-git";
const versionnumber = "202";

const response = {
  pt_version: ver,
  vernum: versionnumber,
  packages: {
    libpt: version,
    node: process.version,
    v8: process.versions.v8,
  },
  flac : {
    poketube_flac: "1.0a",
    apple_musickit:"1.2.1",
    poketube_normalize_volume:"1.2.23-yt",
  },
  piwik:"master",
  process: process.versions,
  dependencies: pkg.dependencies,
};

module.exports = function (app, config, renderTemplate) {
  app.get("/embed/:v", async function (req, res) {
    var e = req.query.e;
    var f = req.query.f;
    var t = req.query.t;
    var q = req.query.quality;
    var v = req.params.v;

    var fetching = await fetcher(v);
    const video = await modules.fetch(config.tubeApi + `video?v=${v}`);

    const json = fetching.video.Player;
    const h = await video.text();
    const k = JSON.parse(modules.toJson(h));
    const engagement = fetching.engagement;

    if (!v) res.redirect("/");

    //video
    if (!q) url = `https://tube.kuylar.dev/proxy/media/${v}/22`;
    if (q === "medium") {
      var url = `https://tube.kuylar.dev/proxy/media/${v}/18`;
    }

    renderTemplate(res, req, "poketube-iframe.ejs", {
      video: json,
      url: url,
      sha384: modules.hash,
      qua: q,
      engagement: engagement,
      k: k,
      optout: t,
      t: config.t_url,
    });
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

    const url = `https://tube.kuylar.dev/proxy/media/${v}/${q}`;

    res.redirect(url);
  });

  app.get("/api/subtitles", async (req, res) => {
    const id = req.query.v;
    const l = req.query.h;

    let url = `https://tube-srv.ashley143.gay/proxy/caption/${id}/${l}/`;

    let f = await modules.fetch(url);
    const body = await f.text();

    res.send(body);
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
    const red_url = req.query.u;

    if (!red_url) {
      res.redirect("/");
    }

    res.redirect(red_url);
  });

  app.get("/api/version.json", async (req, res) => {
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
