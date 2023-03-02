const express = require("express");
const fetch = require("node-fetch");
const { URL } = require("url");

// Array of hostnames that will be proxied
const URL_WHITELIST = [
  "i.ytimg.com",
  "yt3.googleusercontent.com",
  "cdn.glitch.global",
  "cdn.statically.io",
  "site-assets.fontawesome.com",
  "fonts.gstatic.com",
  "yt3.ggpht.com",
  "tube.kuylar.dev",
  "lh3.googleusercontent.com",
  "is4-ssl.mzstatic.com",
  "is2-ssl.mzstatic.com",
  "is1-ssl.mzstatic.com",
  "fonts.bunny.net",
  "demo.matomo.org",
  "is5-ssl.mzstatic.com",
  "is3-ssl.mzstatic.com",
  "twemoji.maxcdn.com",
  "unpkg.com",
  "youtube.com",
  "returnyoutubedislikeapi.com",
  "invidious.sethforprivacy.com",
  "invidious.weblibre.org",
  "inv.vern.cc",
  "invidious.privacydev.net",
  "inv.zzls.xyz",
  "vid.puffyan.us",
  "invidious.lidarshield.cloud",
  "invidious.epicsite.xyz",
  "invidious.esmailelbob.xyz"
];

const app = express();

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(function (req, res, next) {
  console.log(`=> ${req.method} ${req.originalUrl.slice(1)}`);
  next();
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=870"); // cache header
  res.setHeader("poketube-cacher", "PROXY_FILES");

  next();
});

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const proxy = async (req, res) => {
  try {
    let url;

    try {
      url = new URL("https://" + req.originalUrl.slice(10));
    } catch (e) {
      console.log("==> Cannot parse URL: " + e);
      return res.status(400).send("Malformed URL");
    }

    if (!URL_WHITELIST.includes(url.host)) {
      console.log(`==> Refusing to proxy host ${url.host}`);
      res.status(401).send(`Hostname '${url.host}' is not permitted`);
      return;
    }

    console.log(`==> Proxying request`);

    let f = await fetch(url, {
      method: req.method,
    });

    f.body.pipe(res);
  } catch (e) {
    console.log(`==> Error: ${e}`);
    res.status(500).send("Internal server error");
  }
};

const listener = (req, res) => {
  proxy(req, res);
};

app.get("/", (req, res) =>
  res.redirect(`https://poketube.fun/watch?v=l3eww1dnd0k`)
);

app.all("/*", listener);

app.listen(3000, () => console.log("Listening on 0.0.0.0:3000"));
