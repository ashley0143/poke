/*

    PokeTube is an Free/Libre youtube front-end. this is our main file.
  
    Copyright (C) 2021-2022 POKETUBE (https://github.com/iamashley0/poketube)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see https://www.gnu.org/licenses/.
  */

const { fetcher, core, wiki, musicInfo, modules } = require("./src/libpoketube/loader.js")
const { IsJsonString, convert, getFirstLine, capitalizeFirstLetter, turntomins, getRandomInt, getRandomArbitrary } = require("./src/libpoketube/ptutils/libpt-coreutils.js");

const templateDir = modules.path.resolve(
  `${process.cwd()}${modules.path.sep}html`
);

const sha384 = modules.hash;

var app = modules.express();
app.engine("html", require("ejs").renderFile);
app.use(modules.express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(modules.useragent.express());

app.set("view engine", "html");

const renderTemplate = async (res, req, template, data = {}) => {
  res.render(
    modules.path.resolve(`${templateDir}${modules.path.sep}${template}`),
    Object.assign(data)
  );
};

const random_words = [
  "banana pie",
  "how to buy an atom bomb",
  "is love just an illusion",
  "things to do if ur face becomes benjamin frenklin",
  "how do defeat an pasta",
  "can you go to space?",
  "how to become a god?",
  "is a panda a panda if pandas???",
  "Minecraft movie trailer",
  "monke",
];

/*
this is our config file,you can change stuff here
*/
const config = {
  tubeApi: "https://tube.kuylar.dev/api/",
  invapi: "https://inv.vern.cc/api/v1",
  dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url: "https://t.poketube.fun/", //  def matomo url
};

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");

  next();
});

app.get("/encryption", async function (req, res) {
  var v = req.query.v;

  const video = await modules.fetch(config.tubeApi + `video?v=${v}`);
  var fetching = await fetcher(v);

  const json = fetching.video.Player;
  const h = await video.text();
  const k = JSON.parse(modules.toJson(h));
  if (!v) res.redirect("/");

  //video
  const j = fetching.video.Player.Formats.Format,
    j_ = Array.isArray(j) ? j[j.length - 1] : j;
  let url;
  if (j_.URL != undefined) url = j_.URL;

  // json response
  const re = {
    main: {
      video_id: sha384(json.id),
      channel: sha384(json.Channel.Name),
      title: sha384(json.Title),
      date: sha384(btoa(Date.now()).toString()),
    },
    info: {
      desc: sha384(json.Description),
    },
    video: {
      title: sha384(json.Title),
      url: sha384(url),
    },
  };

  res.json(re);
});

///////////// VIDEO PAGES ETC. /////////////

app.get("/watch", async function (req, res) {
  /*
   * QUERYS
   * v = Video ID
   * e = Embed
   * r = Recommended videos
   * f = Recent videos from channel
   * t = Piwik OptOut
   * q = quality obv
   */
  var v = req.query.v;
  var e = req.query.e;
  var r = req.query.r;
  var f = req.query.f;
  var t = req.query.t;
  var q = req.query.quality;

  const info = await modules.fetch("http://ip-api.com/json/");
  const jj = await info.text();
  const ip = JSON.parse(jj);

  core.video(v).then((data) => {
    const k = data.video;
    const json = data.json;
    const engagement = data.engagement;
    var inv_comments = data.comments;
    const inv_vid = data.vid;

    if (!data.comments) inv_comments = "Disabled";

    if (!core.video(v).b) {
      var nnn = "";
      var badges = "";
      var comments = "";
    }

    if (!v) res.redirect("/");

    if (q === "medium") {
      var url = `https://inv.vern.cc/latest_version?id=${v}&itag=18&local=true`;
    }

    // encryption
    const url_e =
      url +
      "?e=" +
      sha384(k.Video.Channel.id) +
      sha384(k.Video.Channel.id) +
      "Piwik" +
      sha384(config.t_url);

    const desc = data.desc;

    var d = desc.toString().replace(/\n/g, " <br> ");

    if (d === "[object Object]") {
      var d = false;
    }

    renderTemplate(res, req, "poketube.ejs", {
      url: url_e,
      color: data.color,
      engagement: engagement,
      video: json,
      date: k.Video.uploadDate,
      e: e,
      k: k,
      process: process,
      sha384: sha384,
      isMobile: req.useragent.isMobile,
      tj: data.channel,
      r: r,
      qua: q,
      inv: inv_comments,
      ip: ip,
      convert: convert,
      wiki: data.wiki,
      f: f,
      t: config.t_url,
      optout: t,
      badges: badges,
      desc: desc,
      comments: comments,
      n: nnn,
      inv_vid,
      lyrics: "",
    });
  });
});

app.get("/music", async function (req, res) {
  /*
   * QUERYS
   * v = Video ID
   * e = Embed
   * r = Recommended videos
   * f = Recent videos from channel
   * t = Piwik OptOut
   * q = quality obv
   */
  var v = req.query.v;
  var e = req.query.e;
  var r = req.query.r;
  var f = req.query.f;
  var t = req.query.t;

  const info = await modules.fetch("http://ip-api.com/json/");
  const n = await info.text();
  const ip = JSON.parse(n);

  if (!v) res.redirect("/");

  var fetching = await fetcher(v);

  const json = fetching.video.Player;

  const video = await modules.fetch(config.tubeApi + `video?v=${v}`);

  const h = await video.text();
  const k = JSON.parse(modules.toJson(h));

  if (!json.Channel.Name.endsWith(" - Topic")) {
    res.redirect(`/watch?v=${v}`);
  }

  //video
  var url = `https://tube.kuylar.dev/proxy/media/${v}/18`;

  // encryption
  const url_e =
    url +
    "?e=" +
    sha384(k.Video.Channel.id) +
    sha384(k.Video.Channel.id) +
    "Piwik" +
    sha384(config.t_url);

  // channel info
  const engagement = fetching.engagement;
  const channel = await modules.fetch(
    config.tubeApi + `channel?id=${k.Video.Channel.id}&tab=videos`
  );
  const c = await channel.text();
  const tj = JSON.parse(modules.toJson(c));

  // info
  const song = await musicInfo.searchSong(
    { title: k.Video.Title, artist: json.Channel.Name.replace("- Topic", "") },
    1000
  );

  if (!song) {
    res.redirect(`/watch?v=${v}`);
  }
  var lyrics = await musicInfo
    .searchLyrics({ title: song.title, artist: song.artist })
    .catch(() => null);

  var ly = "";

  if (lyrics === null) {
    ly = "This Is Where I'd Put The songs lyrics. IF IT HAD ONE ";
  }

  if (lyrics) {
    ly = lyrics.lyrics.replace(/\n/g, " <br> ");
  }

  renderTemplate(res, req, "poketube-music.ejs", {
    url: url_e,
    info: song,
    color: await modules
      .getColors(`https://i.ytimg.com/vi/${v}/maxresdefault.jpg`)
      .then((colors) => colors[0].hex()),
    engagement: engagement,
    process: process,
    ip: ip,
    video: json,
    date: modules.moment(k.Video.uploadDate).format("LL"),
    e: e,
    k: k,
    sha384: sha384,
    isMobile: req.useragent.isMobile,
    tj: tj,
    r: r,
    f: f,
    t: config.t_url,
    optout: t,
    lyrics: ly,
  });
});

app.get("/download", async function (req, res) {
  var v = req.query.v;

  // video
  const video = await modules.fetch(config.tubeApi + `video?v=${v}`);
  const h = await video.text();
  const k = JSON.parse(modules.toJson(h));

  if (!v) res.redirect("/");

  var fetching = await fetcher(v);
  const j = fetching.video.Player.Formats.Format,
    j_ = Array.isArray(j) ? j[j.length - 1] : j;
  let url;
  if (j_.URL != undefined) url = j_.URL;

  const json = fetching.video.Player;
  const engagement = fetching.engagement;

  renderTemplate(res, req, "download.ejs", {
    url: url,
    engagement: engagement,
    k: k,
    video: json,
    date: k.Video.uploadDate,
    color: await modules
      .getColors(`https://i.ytimg.com/vi/${v}/maxresdefault.jpg`)
      .then((colors) => colors[0].hex()),
  });
});

app.get("/old/watch", async function (req, res) {
  var v = req.query.v;
  var e = req.query.e;
  if (!v) res.redirect("/");

  res.redirect(`/watch?v=${v}`);
});

app.get("/search", async (req, res) => {
  const query = req.query.query;

  if (req.query.continuation) {
    var continuation = req.query.continuation;
  }
  if (!req.query.continuation) {
    var continuation = "";
  }

  const search = await modules.fetch(
    `https://tube.kuylar.dev/api/search?query=${query}&continuation=${continuation}`
  );

  const text = await search.text();
  const j = JSON.parse(modules.toJson(text));

  if (!query) {
    return res.redirect("/");
  }

  const summary = await wiki
    .summary(query + " ")
    .then((summary_) => (summary_.title !== "Not found." ? summary_ : "none"));

  renderTemplate(res, req, "search.ejs", {
    j,
    continuation,
    q: query,
    summary,
  });
});

app.get("/channel/", async (req, res) => {
  const ID = req.query.id;
  const tab = req.query.tab;

  // about
  const bout = await modules.fetch(
    config.tubeApi + `channel?id=${ID}&tab=about`
  );
  const h = await bout.text();
  const k = JSON.parse(modules.toJson(h));

  if (req.query.continuation) {
    var continuation = req.query.continuation;
  }
  if (!req.query.continuation) {
    var continuation = "";
  }

  //videos
  const channel = await modules.fetch(
    config.tubeApi + `channel?id=${ID}&tab=shorts&Continuation=${continuation}`
  );
  const c = await channel.text();
  const tj = JSON.parse(modules.toJson(c));

  const summary = await wiki.summary(k.Channel.Metadata.Name);

  var w = "";
  if (summary.title === "Not found.") {
    w = "none";
  }
  if (summary.title !== "Not found.") {
    w = summary;
  }

  const { Subscribers: subscribers } = k.Channel.Metadata;
  const description = k.Channel.Contents.ItemSection.About.Description;

  var d = description.toString().replace(/\n/g, " <br> ");
  if (d === "[object Object]") {
    var d = "";
  }

  var dnoreplace = description.toString();
  if (dnoreplace === "[object Object]") {
    var dnoreplace = "";
  }

  renderTemplate(res, req, "channel.ejs", {
    ID: ID,
    tab: tab,
    j: k,
    tj: tj,
    dnoreplace: dnoreplace,
    continuation: continuation,
    wiki: w,
    getFirstLine: getFirstLine,
    isMobile: req.useragent.isMobile,
    about: k.Channel.Contents.ItemSection.About,
    subs:
      typeof subscribers === "string"
        ? subscribers.replace("subscribers", "")
        : "Private",
    desc: d,
  });
});

/////////////  STATIC /////////////
app.get("/privacy", function (req, res) {
  renderTemplate(res, req, "priv.ejs");
});

app.get("/143", function (req, res) {
  var number_easteregg = getRandomArbitrary(0, 150);

  if (number_easteregg == "143") {
    renderTemplate(res, req, "143.ejs");
  }
  if (number_easteregg != "143") {
    return res.redirect("/");
  }
});

app.get("/domains", function (req, res) {
  renderTemplate(res, req, "domains.ejs");
});

app.get("/license", function (req, res) {
  renderTemplate(res, req, "license.ejs");
});

app.get("/css/:id", (req, res) => {
  res.sendFile(__dirname + `/css/${req.params.id}`);
});

app.get("/js/:id", (req, res) => {
  res.sendFile(__dirname + `/js/${req.params.id}`);
});

///////////// API /////////////

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
    sha384: sha384,
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

/*
app.get("/api/v1/:endpoint/:id", async (req, res) => {
  var inv_api_fetch = await fetch(
    `${config.invapi}/${req.params.endpoint}/${req.params.id}`
  ).then((res) => res.text());

  var inv_api_fetch = await JSON.parse(inv_api_fetch);

  res.send(inv_api_fetch);
});
*/

app.get("/api/opensearch", async (req, res) => {
  res.sendFile(__dirname + `/opensearch.xml`);
});

app.get("/api/instances.json", async (req, res) => {
  res.sendFile(__dirname + `/instances.json`);
});

///////////// REDIRECTS / DEPRACATED  /////////////

app.get("/discover", async function (req, res) {

  const trends = await modules.fetch(config.tubeApi + `trending`);
  const h = await trends.text();
  const k = JSON.parse(modules.toJson(h));

  if (req.query.tab) var tab = `/?type=${capitalizeFirstLetter(req.query.tab)}`;

  if (!req.query.tab) var tab = "";

  const invtrend = await modules
    .fetch(`https://vid.puffyan.us/api/v1/trending${tab}`)
    .then((res) => res.text());

  const t = JSON.parse(invtrend);

  if (req.query.mobilesearch) {
    var query = req.query.mobilesearch;
    tab = "search";
    if (req.query.continuation) {
      var continuation = req.query.continuation;
    }
    if (!req.query.continuation) {
      var continuation = "";
    }

    const search = await modules.fetch(
      `https://tube.kuylar.dev/api/search?query=${query}&continuation=${continuation}`
    );

    const text = await search.text();
    var j = JSON.parse(modules.toJson(text));
  }

  renderTemplate(res, req, "main.ejs", {
    k: k,
    tab: req.query.tab,
    isMobile: req.useragent.isMobile,
    mobilesearch: req.query.mobilesearch,
    inv: t,
    turntomins,
    continuation,
    j,
  });
  
});

app.get("/hashtag/:id", (req, res) => {
  if (!req.params.id) {
    return res.redirect("/");
  }

  return res.redirect(`/search?query=${req.params.id}&from=hashtag`);
});

app.get("/video/upload", (req, res) => {
  res.redirect("https://youtube.com/upload");
});

///////////// 404 AND MAIN PAGES ETC /////////////
app.get("/:v*?", async function (req, res) {
  
  
  if(req.params.v) {
   const isvld = await core.isvalidvideo(req.params.v);
    
     if(isvld) {
    return res.redirect(`/watch?v=${req.params.v}`)
    } else {
              return res.redirect("/discover");
    }
  } else {
        return res.redirect("/discover");

  }
   

});

app.get("/*", function (req, res) {
  const things = random_words[Math.floor(Math.random() * random_words.length)];
  renderTemplate(res, req, "404.ejs", {
    random: things,
  });
});

////////////////////////////////////////////////////

// listen

app.listen("3000", () => {});
