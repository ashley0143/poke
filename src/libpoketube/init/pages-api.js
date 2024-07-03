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
const os = require('os');
const cnf = require("../../../config.json");
const innertube = require("../libpoketube-youtubei-objects.json");
const { execSync } = require('child_process');

const verfull = "v24.1906-sho-MAJOR_UPDATE-stable-dev-nonLTS-git-MTcxODc5NDY3NQ==";
const versmol = "v24.1906-sho"
const branch = "dev/master";
const codename = "sho";
const versionnumber = "293";
const relaseunixdate = "MTcxODc5NDY3NQ=="
const updatequote = "pls fund vennie plush -Bims"


module.exports = function (app, config, renderTemplate) {
  app.get("/embed/:v", async function (req, res) {
    res.send("Disabled until Q1 2024");
  });

  app.get("/admin", async function (req, res) {
     if(req.hostname === "poketube.fun") {
      res.redirect("https://console.sudovanilla.com/")
     } else {
      res.redirect("/sex")
     }
  });
  
  app.get("/vi/:v/:t", async function (req, res) {
    var url = `https://vid.puffyan.us/vi/${req.params.v}/${req.params.t}`
    
       let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
    });

    f.body.pipe(res);

  });

app.get("/avatars/:v", async function (req, res) {
    var url = `https://vid.puffyan.us/ggpht/${req.params.v}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
    });

    f.body.pipe(res);
  });

  app.get("/ggpht/:v", async function (req, res) {
    var url = `https://vid.puffyan.us/ggpht/${req.params.v}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
    });

    f.body.pipe(res);
  });


  app.get("/avatars/ytc/:v", async function (req, res) {
    var url = `https://vid.puffyan.us/ggpht/ytc/${req.params.v.replace("ytc", "")}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
    });

    f.body.pipe(res);
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

    const url = `https://tube-nightly.kuylar.dev/proxy/media/${v}/${q}`;

    res.redirect(url);
  });

  app.get("/api/subtitles", async (req, res) => {
    const { fetch } = await import("undici");
    
    const id = req.query.v;
    const l = req.query.h;

    try {
      let url = `https://invid-api.poketube.fun/api/v1/captions/${id}?label=${l}`;

      let f = await fetch(url);
      const body = await f.text();

      res.send(body);
    } catch {}
  });
  
 
app.use("/sb/i/:v/:imagePath/:img", async function (req, res) {
  const { v, imagePath, img } = req.params;  
  const { sqp, xywh } = req.query;  
        const sighMatch = req.url.match(/&amp;sigh=([^&#]+)/);  
    const sigh = sighMatch ? sighMatch[1] : undefined;
 
 
  const url = `https://yt.miruku.cafe/sb/i/${v}/${imagePath}/${img}?sqp=${sqp}&sigh=${sigh}&xywh=${req.query.xywh}`;

  try {
    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
    });

    f.body.pipe(res);
    console.log(url)
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).send("Error fetching image");
  }
});
  
  app.get("/api/storyboards", async (req, res) => {
    const { fetch } = await import("undici");

    const id = req.query.v;
    const l = req.query.h;

    try {
        let url = `https://yt.miruku.cafe/api/v1/storyboards/${id}?width=320&height=180`;

        let f = await fetch(url);
        let body = await f.text();

         body = body.replace(/#xywh=(\d+),(\d+),(\d+),(\d+)/g, (match, x, y, w, h) => {
            return `&xywh=${x},${y},${w},${h}`;  
        });

        res.send(body);
    } catch {}
});

  app.get("/feeds/videos.xml", async (req, res) => {
    const id = req.query.channel_id;

    let url = `https://youtube.com/feeds/videos.xml?channel_id=${id}`;

    let f = await modules.fetch(url, {
      method: req.method,
    });

    f.body.pipe(res);
  });

 app.get("/api/improving-poke/getsugesstions", async (req, res) => {
    const query = req.query.q;

    let url = `https://invid-api.poketube.fun/api/v1/search/suggestions?q=${query}`;

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

  app.get("/api", async (req, res) => {
    res.redirect("/api/version.json");
  });

  app.get("/api/v1", async (req, res) => {
    res.redirect("https://invid-api.poketube.fun/api/v1/stats");
  });

  app.get("/api/version.json", async (req, res) => {
    let latestCommitHash;

    const invidious = await modules
      .fetch("https://invid-api.poketube.fun/api/v1/stats")
      .then((res) => res.text())
      .then((txt) => getJson(txt));
       
       const cpus = os.cpus();
       const totalMemory = os.totalmem() / (1024 * 1024 * 1024); 
       const roundedMemory = totalMemory.toFixed(2); 

execSync('git rev-list HEAD -n 1 --abbrev-commit', (error, stdout, stderr) => {
  if (error || stderr) {
    console.error(`Error executing command: ${error || stderr}`);
    return;
  }

   latestCommitHash = stdout.trim(); 
 }); 

    const response = {
      pt_version: {
       version:versmol,
       version_full:verfull,
       commit: latestCommitHash
      },
      branch,
      updatequote,
      relaseunixdate,
      vernum: versionnumber,
      codename,
      config:cnf,
      system:{
      ram:`${roundedMemory} GB`,
      cpu:cpus[0].model,
      },
      packages: {
        libpt: version,
        node: process.version,
        v8: process.versions.v8,
      },
      invidious,
      innertube,
      flac: {
        poketube_flac: "1.2a",
        apple_musickit: "1.2.3",
        poketube_normalize_volume: "1.2.23-yt",
      },
      piwik: "master",
      process: process.versions,
      dependencies: pkg.dependencies,
      poketubeapicode: btoa(Date.now() + invidious.software.version),
    };

    res.json(response);
  });

  app.get("/api/instances.json", async (req, res) => {
    const { fetch } = await import("undici");

    try {
      const url = `https://raw.githubusercontent.com/ashley0143/poke/main/instances.json`;

      let f = await fetch(url)
        .then((res) => res.text())
        .then((json) => JSON.parse(json));

      res.json(f);
    } catch {
      res.json("error while fetching instances");
    }
  });
};

module.exports.api = versionnumber;
