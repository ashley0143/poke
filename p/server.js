const fs = require("fs");
const express = require("express");
const fetch = require("node-fetch");
const htmlParser = require("node-html-parser");

const app = express();

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
let Proxy = async (req, res) => {
  const url = "https://" + req.originalUrl.slice(10);

  let f = await fetch(url, {
    method: req.method,
  });
  if (false && f.headers.get("content-type").includes("html")) {
    const body = await f.text();
    if (false && !htmlParser.valid(body)) {
      console.warn(`[ERROR] Invalid HTML at ${url}`);
      f.body.pipe(res);
      return;
    }
    const root = htmlParser.parse(body);
    let html = root.childNodes.filter(
      (x) => x.tagName && x.tagName.toLowerCase() == "html"
    )[0];

    if (!html) {
      console.warn(`[ERROR] No <html> at ${url}`);
      res.send(body);
      return;
    }

    res.send(html.toString());
  } else {
    f.body.pipe(res);
  }
};

const listener = (req, res) => {
  Proxy(req, res);
};

app.get("/", (req, res) =>
  res.redirect(`https://poketube.fun/watch?v=l3eww1dnd0k`)
);

app.all("/*", listener);

app.listen(3000, () => {});
