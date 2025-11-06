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
const ip2c = require("../../modules/ipapi");
const innertube = require("../libpoketube-youtubei-objects.json");

const { execSync } = require('child_process'); // DO NOT ABBRV THIS :SOB:
const fs = require('fs');

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
 const telemetryConfig = { telemetry: true }

 const path = require("path")

const statsFile = path.join(__dirname, "stats.json")

if (!fs.existsSync(statsFile)) {
  fs.writeFileSync(
    statsFile,
    JSON.stringify({ videos: {}, browsers: {}, os: {}, users: {} }, null, 2)
  )
}

function parseUA(ua) {
  let browser = "unknown"
  let os = "unknown"

  if (/firefox/i.test(ua)) browser = "firefox"
  else if (/chrome|chromium|crios/i.test(ua)) browser = "chrome"
  else if (/safari/i.test(ua)) browser = "safari"
  else if (/edge/i.test(ua)) browser = "edge"

  if (/windows/i.test(ua)) os = "windows"
  else if (/android/i.test(ua)) os = "android"
  else if (/mac os|macintosh/i.test(ua)) os = "macos"
  else if (/linux/i.test(ua)) os = "gnu-linux"
  else if (/iphone|ipad|ios/i.test(ua)) os = "ios"

  return { browser, os }
}

 app.post("/api/stats", (req, res) => {
  if (!telemetryConfig.telemetry) return res.status(200).json({ ok: true })

  const { videoId, userId } = req.body
  if (!videoId) return res.status(400).json({ error: "missing videoId" })
  if (!userId) return res.status(400).json({ error: "missing userId" })

  const ua = req.headers["user-agent"] || ""
  const { browser, os } = parseUA(ua)

  const raw = fs.readFileSync(statsFile, "utf8")
  const data = JSON.parse(raw)
if (!data.users) data.users = {}

  if (!data.videos[videoId]) data.videos[videoId] = 0
  data.videos[videoId]++

  if (!data.browsers[browser]) data.browsers[browser] = 0
  data.browsers[browser]++

  if (!data.os[os]) data.os[os] = 0
  data.os[os]++

  if (!data.users[userId]) data.users[userId] = true

  fs.writeFileSync(statsFile, JSON.stringify(data, null, 2))
  res.json({ ok: true })
})
app.get("/api/stats/optout", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Poke – Opt out of stats</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <style>
    :root{color-scheme:dark}
    body{color:#fff}
    body {
      background:#1c1b22;
      margin:0;
    }
    :visited{color:#00c0ff}
    a{color:#0ab7f0}
    .app{max-width:1000px;margin:0 auto;padding:24px}
    p{
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans", sans-serif;
      line-height:1.6;
    }
    ul{
      font-family:"poketube flex";
      font-weight:500;
      font-stretch:extra-expanded;
      padding-left:1.2rem;
    }
    h2 {
      font-family:"poketube flex", sans-serif;
      font-weight:700;
      font-stretch:extra-expanded;
      margin-top:1.5rem;
      margin-bottom:.3rem;
    }
    h1 {
      font-family:"poketube flex", sans-serif;
      font-weight:1000;
      font-stretch:ultra-expanded;
      margin-top:0;
      margin-bottom:.3rem;
    }
    .note{color:#bbb;font-size:.95rem}
    .btn{
      display:inline-block;
      margin-top:1rem;
      padding:.5rem 1rem;
      border-radius:999px;
      border:1px solid #2a2a35;
      background:#252432;
      color:#fff;
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans", sans-serif;
      text-decoration:none;
      font-size:.95rem;
    }
    .btn:hover{
      background:#2f2e3d;
    }
    .status{
      margin-top:.5rem;
      font-size:.95rem;
    }
  </style>
</head>
<body>
  <div class="app">
    <h1>Stats opt-out</h1>
    <p>
      This page lets you turn off <strong>anonymous usage stats</strong> for this browser.
      Poke will remember this choice using <code>localStorage</code> only (no cookies).
    </p>

    <p class="note">
      Anonymous stats help us understand which videos are popular and which platforms people use —
      without collecting personal data. You can read the full details here:
      <a href="/policies/privacy#stats">/policies/privacy#stats</a>.
    </p>

    <a href="#" id="optout-btn" class="btn">Opt out of anonymous stats</a>
    <div id="status" class="status note"></div>

    <p class="note" style="margin-top:1.5rem;">
      • To see the stats UI (if enabled on this instance), visit
      <code><a href="/api/stats?view=human">/api/stats?view=human</a></code>.<br>
      • For raw JSON, use <code><a href="/api/stats?view=json">/api/stats?view=json</a></code>.
    </p>
  </div>

  <script>
    (function () {
      var KEY = "poke_stats_optout";
      var btn = document.getElementById("optout-btn");
      var status = document.getElementById("status");

      function updateStatus() {
        try {
          var v = localStorage.getItem(KEY);
          if (v === "1") {
            status.textContent = "Anonymous stats are currently DISABLED in this browser.";
          } else {
            status.textContent = "Anonymous stats are currently ENABLED in this browser.";
          }
        } catch (e) {
          status.textContent = "Your browser blocked localStorage, so we cannot store your opt-out choice.";
        }
      }

      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        try {
          localStorage.setItem(KEY, "1");
          updateStatus();
        } catch (e) {
          status.textContent = "Could not save opt-out preference (localStorage error).";
        }
      });

      updateStatus();
    })();
  </script>
</body>
</html>`)
})

 app.get("/api/stats", (req, res) => {
  const view = (req.query.view || "").toString()

  // JSON view – explicit: /api/stats?view=json
  if (view === "json") {
    if (!telemetryConfig.telemetry) {
      return res.json({ videos: {}, browsers: {}, os: {}, totalUsers: 0 })
    }

    const raw = fs.readFileSync(statsFile, "utf8")
    const data = JSON.parse(raw)

    if (!data.videos) data.videos = {}
    if (!data.browsers) data.browsers = {}
    if (!data.os) data.os = {}
    if (!data.users) data.users = {}

    const sortedVideos = Object.entries(data.videos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const topVideos = Object.fromEntries(sortedVideos)

    return res.json({
      videos: topVideos,
      browsers: data.browsers,
      os: data.os,
      totalUsers: Object.keys(data.users).length
    })
  }

  // Human view – /api/stats?view=human (just stats UI)
  if (view === "human") {
    const telemetryOn = telemetryConfig.telemetry

    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Improving Poke – Stats</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <style>
    :root{color-scheme:dark}
    body{color:#fff}
    body {
      background:#1c1b22;
      margin:0;
    }
    img{float:right;margin:.3em 0 1em 2em}
    :visited{color:#00c0ff}
    a{color:#0ab7f0}
    .app{max-width:1000px;margin:0 auto;padding:24px}
    p{
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans", sans-serif;
      line-height:1.6;
    }
    ul{
      font-family:"poketube flex";
      font-weight:500;
      font-stretch:extra-expanded;
      padding-left:1.2rem;
    }
    h2 {
      font-family:"poketube flex", sans-serif;
      font-weight:700;
      font-stretch:extra-expanded;
      margin-top:1.5rem;
      margin-bottom:.3rem;
    }
    h1 {
      font-family:"poketube flex", sans-serif;
      font-weight:1000;
      font-stretch:ultra-expanded;
      margin-top:0;
      margin-bottom:.3rem;
    }
    .toc{margin:1rem 0 2rem}
    .toc li{margin:.25rem 0}
    pre.license{
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
      background:#111;padding:14px 16px;border-radius:12px;overflow-x:auto;line-height:1.45;border:1px solid #222
    }
    hr{border:0;border-top:1px solid #222;margin:28px 0}
    .note{color:#bbb;font-size:.95rem}

    /* extra tiny helpers */
    .stats-list li{margin:.15rem 0;}
    .muted{opacity:.8;font-size:.95rem;}
  </style>
</head>
<body>
  <div class="app">
    <h1>Anonymous stats</h1>
    <p class="note">
      These stats are aggregated locally on this Poke instance. For what is collected (and what is not),
      see <a href="/policies/privacy#stats">/policies/privacy#stats</a>.
    </p>

    <h2>Current anonymous stats</h2>
    <p id="stats-note" class="note">Loading…</p>
    <ul id="stats-list" class="stats-list"></ul>

    <h2>Top videos (local-only)</h2>
    <p class="note">Up to 10 most watched videos on this instance.</p>
    <ul id="top-videos" class="stats-list"></ul>

    <hr>

    <h2>API usage</h2>
    <p class="note">
      • Human view (this page): <code><a href="/api/stats?view=human">/api/stats?view=human</a></code><br>
      • JSON view (for scripts/tools): <code><a href="/api/stats?view=json">/api/stats?view=json</a></code>
    </p>
  </div>

  <script>
    const TELEMETRY_ON = ${telemetryOn ? "true" : "false"};

    const statsNote = document.getElementById("stats-note");
    const statsList = document.getElementById("stats-list");
    const topVideos = document.getElementById("top-videos");

    if (!TELEMETRY_ON) {
      statsNote.textContent =
        "Anonymous usage statistics are disabled on this instance. No stats are being collected.";
      statsList.innerHTML = "";
      topVideos.innerHTML = "<li>No data (telemetry disabled).</li>";
    } else {
      fetch("/api/stats?view=json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var videos = data.videos || {};
          var browsers = data.browsers || {};
          var os = data.os || {};
          var totalUsers = data.totalUsers || 0;

          var videoCount = Object.keys(videos).length;

          statsNote.textContent = "";
          statsList.innerHTML = "";

          var summaryItems = [
            "Anonymous users (unique local IDs): " + totalUsers,
            "Videos with recorded views: " + videoCount,
            "Browser types seen: " + Object.keys(browsers).length,
            "OS families seen: " + Object.keys(os).length
          ];

          summaryItems.forEach(function (text) {
            var li = document.createElement("li");
            li.textContent = text;
            statsList.appendChild(li);
          });

          var videoKeys = Object.keys(videos);
          if (videoKeys.length === 0) {
            topVideos.innerHTML = "<li>No stats recorded yet.</li>";
          } else {
            topVideos.innerHTML = "";
            videoKeys.forEach(function (id) {
              var li = document.createElement("li");
              var a = document.createElement("a");
              a.href = "/watch?v=" + encodeURIComponent(id);
              a.textContent = id;
              li.appendChild(a);
              li.appendChild(document.createTextNode(" – " + videos[id] + " views"));
              topVideos.appendChild(li);
            });
          }
        })
        .catch(function () {
          statsNote.textContent =
            "Could not load stats (maybe they are disabled or there was an error).";
          statsList.innerHTML = "";
          topVideos.innerHTML = "<li>Error loading data.</li>";
        });
    }
  </script>
</body>
</html>`)
  }

  // any other view value (including "/api/stats" with no ?view) -> landing page HTML
  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Improving Poke</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <style>
    :root{color-scheme:dark}
    body{color:#fff}
    body {
      background:#1c1b22;
      margin:0;
    }
    img{float:right;margin:.3em 0 1em 2em}
    :visited{color:#00c0ff}
    a{color:#0ab7f0}
    .app{max-width:1000px;margin:0 auto;padding:24px}
    p{
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans", sans-serif;
      line-height:1.6;
    }
    ul{
      font-family:"poketube flex";
      font-weight:500;
      font-stretch:extra-expanded;
      padding-left:1.2rem;
    }
    h2 {
      font-family:"poketube flex", sans-serif;
      font-weight:700;
      font-stretch:extra-expanded;
      margin-top:1.5rem;
      margin-bottom:.3rem;
    }
    h1 {
      font-family:"poketube flex", sans-serif;
      font-weight:1000;
      font-stretch:ultra-expanded;
      margin-top:0;
      margin-bottom:.3rem;
    }
    .toc{margin:1rem 0 2rem}
    .toc li{margin:.25rem 0}
    pre.license{
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
      background:#111;padding:14px 16px;border-radius:12px;overflow-x:auto;line-height:1.45;border:1px solid #222
    }
    hr{border:0;border-top:1px solid #222;margin:28px 0}
    .note{color:#bbb;font-size:.95rem}

    /* extra tiny helpers */
    .stats-list li{margin:.15rem 0;}
    .muted{opacity:.8;font-size:.95rem;}
  </style>
</head>
<body>
  <div class="app">
    <img src="/css/logo-poke.svg" alt="Poke logo">
    <h1>Improving Poke</h1>
    <h2>Private by design</h2>

    <p>
      At <a href="/">Poke</a>, we do not collect or share any personal information.
      That's our privacy promise in a nutshell.
      To improve Poke we use a completely anonymous, local-only way to figure out how the site is being used.
    </p>

    <p>
      Any anonymous stats recorded by this instance come from the <code>/api/stats</code> system.
      You can read exactly what is measured (and what is <em>not</em>) in our privacy policy:
      <a href="/policies/privacy#stats">/policies/privacy#stats</a>.
    </p>

    <hr>

    <h2>API usage</h2>
    <p class="note">
      • Human view (stats UI): <code><a href="/api/stats?view=human">/api/stats?view=human</a></code><br>
      • JSON view (for scripts/tools): <code><a href="/api/stats?view=json">/api/stats?view=json</a></code>
    </p>
  </div>
</body>
</html>`)
})


  app.get("/avatars/:v", async function (req, res) {
    var url = `https://yt3.ggpht.com/${req.params.v}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

 
app.get("/api/geo", async (req, res) => {
  try {
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress;

    if (ip && ip.startsWith("::ffff:")) {
      ip = ip.slice(7);
    }

    if (!ip) {
      return res.status(400).json({ error: "No IP found" });
    }

    const response = await fetch(`https://ip2c.org/${ip}`);
    const text = await response.text();
    const parts = text.trim().split(";");

    const countryCode = parts[1] || "ZZ";

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ countryCode });
  } catch (err) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ countryCode: "ZZ", error: true, details: String(err) });
  }
});



  app.get("/ggpht/:v", async function (req, res) {
    var url = `https://yt3.ggpht.com/${req.params.v}`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

  app.get("/s/player/:playerid/player_ias.vflset/en_US/base.js", async function (req, res) {
    var url = `https://www.youtube.com/s/player/${req.params.playerid}/player_ias.vflset/en_US/base.js`;

    let f = await modules.fetch(url + `?cachefixer=${btoa(Date.now())}`, {
      method: req.method,
      headers: headers,
    });

    f.body.pipe(res);
  });

app.get("/api/nominatim/search", async (req, res) => {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    // Forward all query params (format, q, limit, etc.)
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, value);
    }
    // Force JSON output if not specified
    if (!url.searchParams.has("format")) url.searchParams.set("format", "json");

    const r = await fetch(url.toString(), {
      headers: { "Accept-Language": req.headers["accept-language"] || "en" }
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from nominatim" });
  }
});

// Proxy for reverse geocoding
app.get("/api/nominatim/reverse", async (req, res) => {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, value);
    }
    if (!url.searchParams.has("format")) url.searchParams.set("format", "json");

    const r = await fetch(url.toString(), {
      headers: { "Accept-Language": req.headers["accept-language"] || "en" }
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from nominatim" });
  }
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
      let url = `${config.videourl}/companion/api/v1/captions/${id}?label=${l}`;

      /*
let f = await fetch(url, {
        headers: headers, 
      });

      const body = await f.text();

      res.send(body);
      */
      res.send("j");

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
  let latestCommitHash = null;

  function getLatestCommitHash() {
    try {
      const out = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "pipe"] })
        .toString()
        .trim();
      return out || null;
    } catch {
      return null;
    }
  }

  function readOsRelease() {
    try {
      const text = fs.readFileSync("/etc/os-release", "utf8");
      const map = {};
      for (const line of text.split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        map[m[1]] = v;
      }
      return {
        id: map.ID || null,
        id_like: map.ID_LIKE || null,
        version_id: map.VERSION_ID || null,
        name: map.NAME || null,
        pretty_name: map.PRETTY_NAME || null,
      };
    } catch {
      return null;
    }
  }

  const osr = readOsRelease();

  const cpus = os.cpus() || [];
  const totalMemoryGB = os.totalmem() / (1024 ** 3);
  const freeMemoryGB = os.freemem() / (1024 ** 3);

  const roundedTotalGB = totalMemoryGB.toFixed(2);
  const roundedFreeGB = freeMemoryGB.toFixed(2);

  const loadavg = os.loadavg(); // [1m, 5m, 15m]
  const uptimeSeconds = Math.floor(os.uptime());

  let platform = os.platform(); // 'linux', 'darwin', 'win32', etc.
  if (platform === 'linux') platform = 'gnu/linux';

  const kernelRelease = os.release(); // e.g., '6.8.0-40-generic'
  const arch = os.arch();            // e.g., 'x64', 'arm64'
  const hostname = os.hostname();
  const cpuModel = cpus[0]?.model || "Unknown CPU";
  const cpuCount = cpus.length;

  latestCommitHash = getLatestCommitHash();

  let invidious = null;
  try {
    const invTxt = await modules
      .fetch("https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1/stats", { headers })
      .then(r => r.text());
    invidious = getJson(invTxt);
  } catch {
    invidious = null;
  }

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
      os_name: osr?.pretty_name || osr?.name || (platform === "linux" ? "GNU/Linux" : os.type()),
      distro: osr ? {
        pretty_name: osr.pretty_name,
        name: osr.name,
        id: osr.id,
        id_like: osr.id_like,
        version_id: osr.version_id,
      } : null,
      platform,           
      kernel_release: kernelRelease,
      arch,
      hostname,
      ram_total: `${roundedTotalGB} GB`,
      ram_free: `${roundedFreeGB} GB`,
      cpu: cpuModel,
      cpu_cores: cpuCount,
      loadavg: {
        "1m": Number(loadavg[0]?.toFixed(2) || 0),
        "5m": Number(loadavg[1]?.toFixed(2) || 0),
        "15m": Number(loadavg[2]?.toFixed(2) || 0),
      },
      uptime_seconds: uptimeSeconds,
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
    process: process.versions,
    dependencies: pkg.dependencies,
    poketubeapicode: (() => {
      const invVer = invidious?.software?.version || "0";
      return btoa(String(Date.now()) + String(invVer));
    })(),
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
