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
 
app.get("/api/stats", (req, res) => {
  const view = (req.query.view || "").toString()

  // JSON view (for programmatic access)
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

   const telemetryOn = telemetryConfig.telemetry

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Poke – Stats</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #05070a;
      color: #e5e5e5;
    }
    .wrap {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.8rem;
      margin: 0 0 4px 0;
    }
    p {
      margin: 4px 0;
      line-height: 1.6;
    }
    small {
      opacity: 0.8;
      font-size: 0.9rem;
    }
    a {
      color: #7dd3fc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .card {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #0b0f19;
      border: 1px solid #1f2933;
    }
    .card h2 {
      font-size: 1.1rem;
      margin: 0 0 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 0.9rem;
    }
    th, td {
      padding: 4px 6px;
      text-align: left;
      border-bottom: 1px solid #111827;
      word-break: break-all;
    }
    th {
      font-weight: 600;
      background: #020617;
    }
    .pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 0.8rem;
      background: #0b1120;
      border: 1px solid #1f2937;
      margin-left: 4px;
    }
    .muted {
      opacity: 0.7;
      font-size: 0.9rem;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .col {
      flex: 1 1 220px;
    }
    @media (max-width: 600px) {
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>Poke stats</h1>
    <p>
      <small>
        At Poke, we do not collect or share any personal information.
        To improve Poke we use a completely anonymous, local-only way to figure out how the site is being used.
      </small>
    </p>

    <div class="card">
      <h2>Status</h2>
      <p id="status-text"></p>
      <p class="muted">
        For full details on what is collected (and what is <em>not</em>), see:
        <a href="/policies/privacy#stats">/policies/privacy#stats</a>.
      </p>
    </div>

    <div class="card">
      <h2>Overview</h2>
      <p id="overview-text" class="muted">Loading stats…</p>
    </div>

    <div class="row">
      <div class="card col">
        <h2>Top videos</h2>
        <table id="videos-table">
          <thead>
            <tr>
              <th>Video ID</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="2" class="muted">Loading…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card col">
        <h2>Platforms</h2>
        <p class="muted">Browsers</p>
        <ul id="browsers-list" class="muted" style="padding-left:18px;margin:4px 0 8px 0;">
          <li>Loading…</li>
        </ul>
        <p class="muted">Operating systems</p>
        <ul id="os-list" class="muted" style="padding-left:18px;margin:4px 0;">
          <li>Loading…</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <h2>API usage</h2>
      <p class="muted">
        • Human view (this page): <code>/api/stats</code><br>
        • JSON view (for scripts/tools): <code>/api/stats?view=json</code>
      </p>
    </div>
  </main>

  <script>
    const TELEMETRY_ON = ${telemetryOn ? "true" : "false"};

    const statusEl = document.getElementById("status-text");
    const overviewEl = document.getElementById("overview-text");
    const videosTableBody = document.querySelector("#videos-table tbody");
    const browsersList = document.getElementById("browsers-list");
    const osList = document.getElementById("os-list");

    if (!TELEMETRY_ON) {
      statusEl.textContent = "Anonymous usage statistics are disabled on this instance. No stats are being collected.";
      overviewEl.textContent = "There is no stats data to show because telemetry is turned off.";
      videosTableBody.innerHTML = '<tr><td colspan="2" class="muted">No data (telemetry disabled).</td></tr>';
      browsersList.innerHTML = '<li>No data (telemetry disabled).</li>';
      osList.innerHTML = '<li>No data (telemetry disabled).</li>';
    } else {
      statusEl.textContent = "Anonymous usage statistics are enabled. Data is kept local and never shared with third parties.";

      fetch("/api/stats?view=json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var videos = data.videos || {};
          var browsers = data.browsers || {};
          var os = data.os || {};
          var totalUsers = data.totalUsers || 0;

          overviewEl.textContent =
            "Poke has seen " + Object.keys(videos).length +
            " tracked videos, from " + totalUsers +
            " anonymous users (unique local IDs).";

          // videos table
          var videoKeys = Object.keys(videos);
          if (videoKeys.length === 0) {
            videosTableBody.innerHTML = '<tr><td colspan="2" class="muted">No stats recorded yet.</td></tr>';
          } else {
            videosTableBody.innerHTML = "";
            videoKeys.forEach(function (id) {
              var views = videos[id];
              var tr = document.createElement("tr");

              var tdId = document.createElement("td");
              var link = document.createElement("a");
              link.href = "/watch?v=" + encodeURIComponent(id);
              link.textContent = id;
              tdId.appendChild(link);

              var tdViews = document.createElement("td");
              tdViews.textContent = views;

              tr.appendChild(tdId);
              tr.appendChild(tdViews);
              videosTableBody.appendChild(tr);
            });
          }

          // browsers list
          var browserKeys = Object.keys(browsers);
          if (browserKeys.length === 0) {
            browsersList.innerHTML = "<li>No data yet.</li>";
          } else {
            browsersList.innerHTML = "";
            browserKeys.forEach(function (name) {
              var li = document.createElement("li");
              li.textContent = name + " – " + browsers[name] + " hits";
              browsersList.appendChild(li);
            });
          }

          // os list
          var osKeys = Object.keys(os);
          if (osKeys.length === 0) {
            osList.innerHTML = "<li>No data yet.</li>";
          } else {
            osList.innerHTML = "";
            osKeys.forEach(function (name) {
              var li = document.createElement("li");
              li.textContent = name + " – " + os[name] + " hits";
              osList.appendChild(li);
            });
          }
        })
        .catch(function () {
          overviewEl.textContent = "Could not load stats (maybe they are disabled or there was an error).";
          videosTableBody.innerHTML = '<tr><td colspan="2" class="muted">Error loading data.</td></tr>';
          browsersList.innerHTML = '<li>Error loading data.</li>';
          osList.innerHTML = '<li>Error loading data.</li>';
        });
    }
  </script>
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
