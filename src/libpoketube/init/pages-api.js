const { modules, version } = require("../libpoketube-initsys.js");

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

const { execSync } = require('child_process'); // DO NOT ABBRV THIS :SOB:

const verfull = "v25.2705-luna-MAJOR_UPDATE-stable-dev-nonLTS-git-MTc0NTcwNjc4MA==";
const versmol = "v25.2705-luna";
const branch = "dev/master";
const codename = "luna";
const versionnumber = "294";
const relaseunixdate = "MTc0NTcwNjc4MA==";
const updatequote = "i created this world.....to feel some control...";

module.exports = function (app, config, renderTemplate) {

  const headers = {
    'User-Agent': config.useragent,  
  };

  app.get("/vi/:v/:t", async function (req, res) {
    var url = `https://i.ytimg.com/vi/${req.params.v}/${req.params.t}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

  app.get("/avatars/:v", async function (req, res) {
    var url = `https://yt3.ggpht.com/${req.params.v}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

  app.get("/ggpht/:v", async function (req, res) {
    var url = `https://yt3.ggpht.com/${req.params.v}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

  app.get("s/player/:playerid/player_ias.vflset/en_US/base.js", async function (req, res) {
    var url = `https://www.youtube.com/s/player/${req.params.playerid}/player_ias.vflset/en_US/base.js`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

  app.get("/avatars/ytc/:v", async function (req, res) {
    var url = `https://yt3.googleusercontent.com/ytc/${req.params.v.replace("ytc", "")}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers, 
    });

    f.body.pipe(res);
  });

  app.get("/api/video/download", async function (req, res) {
    var v = req.query.v;

    var q = "18";
    if (req.query.q) q = req.query.q;

    const url = `${config.videourl}/companion/latest_version?id=${v}&itag=${q}&local=true`;

    res.redirect(url);
  });

  app.get("/api/subtitles", async (req, res) => {
    const { fetch } = await import("undici");

    const id = req.query.v;
    const l = req.query.h;

    try {
      let url = `${config.videourl}/api/v1/captions/${id}?label=${l}`;

      let f = await fetch(url, {
        headers: headers, 
      });

      const body = await f.text();

      res.send(body);
    } catch {}
  });
  
app.get("/api/weather", async (req, res) => {
  try {
     const url = new URL("https://api.open-meteo.com/v1/forecast");
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      return res.status(response.status).json({ error: "Upstream error" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Proxy error" });
  }
});

  app.get("/api/getEngagementData", async (req, res) => {
    const { fetch } = await import("undici");

    const id = req.query.v;

    try {
      if (id) {
        const apiUrl = `https://ryd-proxy.kavin.rocks/votes/${id}&hash=d0550b6e28c8f93533a569c314d5b4e2`;

        const response = await fetch(apiUrl, {
          headers: headers,
        });

        if (response.status === 400) {
          const error = await response.json();
          return res.status(400).send(error);
        }

        const engagement = await response.json();

        const likes = parseInt(engagement.likes) || 0;
        const dislikes = parseInt(engagement.dislikes) || 0;
        const total = likes + dislikes;

        const likePercentage = total > 0 ? ((likes / total) * 100).toFixed(2) : 0;
        const dislikePercentage = total > 0 ? ((dislikes / total) * 100).toFixed(2) : 0;

        const getLikePercentageColor = (percentage) => {
          if (percentage >= 80) {
            return "green";
          } else if (percentage >= 50) {
            return "orange";
          } else {
            return "red";
          }
        };

        const getDislikePercentageColor = (percentage) => {
          if (percentage >= 50) {
            return "red";
          } else if (percentage >= 20) {
            return "orange";
          } else {
            return "green";
          }
        };

        const likeColor = getLikePercentageColor(likePercentage);
        const dislikeColor = getDislikePercentageColor(dislikePercentage);

        const userScore = (
          parseFloat(likePercentage) -
          parseFloat(dislikePercentage) / 2
        ).toFixed(2);

        const getUserScoreLabel = (score) => {
          if (score >= 98) {
            return "Masterpiece Video";
          } else if (score >= 80) {
            return "Overwhelmingly Positive";
          } else if (score >= 60) {
            return "Positive";
          } else if (score >= 40) {
            return "Mixed";
          } else if (score >= 20) {
            return "Negative";
          } else {
            return "Overwhelmingly Negative";
          }
        };

        const userScoreLabel = getUserScoreLabel(userScore);
        const userScoreColor =
          userScore >= 80 ? "green" : userScore >= 50 ? "orange" : "red";

        const respon = {
          like_count: likes,
          dislike_count: dislikes,
          rating: engagement.rating,
          userScore: {
            label: userScoreLabel,
            score: userScore,
            color: userScoreColor,
          },
          engagement: {
            likeColor: likeColor,
            dislikeColor: dislikeColor,
            percentage: {
              likePercentage: `${likePercentage}%`,
              dislikePercentage: `${dislikePercentage}%`,
            },
          },
          ReturnYouTubeDislikesApiRawResponse: engagement,
        };

        res.send(respon);
      } else {
        res.status(400).json("pls gib ID :3");
      }
    } catch (error) {
      res.status(500).json("whoops (error 500) >~<");
    }
  });

  app.get("/feeds/videos.xml", async (req, res) => {
    const id = req.query.channel_id;

    let url = `https://youtube.com/feeds/videos.xml?channel_id=${id}`;

    let f = await modules.fetch(url, {
      method: req.method,
      headers: headers, // Add headers to the fetch request
    });

    f.body.pipe(res);
  });

  app.get("/api/manifest/dash/id/:id", async (req, res) => {
    const id = req.params.id;

    let url = `https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/manifest/dash/id/${id}`;

    let f = await modules.fetch(url, {
      method: req.method,
      headers: headers, 
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
      .fetch("https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1/stats", {
        headers: headers, 
      })
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
const { useragent, ...configWithoutUA } = cnf;

    const response = {
      pt_version: {
        version: versmol,
        version_full: verfull,
        commit: latestCommitHash,
      },
      branch,
      updatequote,
      relaseunixdate,
      vernum: versionnumber,
      codename,
      config: configWithoutUA,
      system: {
        ram: `${roundedMemory} GB`,
        cpu: cpus[0].model,
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

      let f = await fetch(url, {
        headers: headers, 
      })
        .then((res) => res.text())
        .then((json) => JSON.parse(json));

      res.json(f);
    } catch {
      res.json("error while fetching instances");
    }
  });
};

module.exports.api = versionnumber;
