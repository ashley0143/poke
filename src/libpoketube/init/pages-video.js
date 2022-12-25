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

const sha384 = modules.hash;
const fetch = modules.fetch;
const htmlToText = require("html-to-text");
const encoding = require("encoding");
const delim1 =
  '</div></div></div></div><div class="hwc"><div class="BNeawe tAd8D AP7Wnd"><div><div class="BNeawe tAd8D AP7Wnd">';
const delim2 =
  '</div></div></div></div></div><div><span class="hwc"><div class="BNeawe uEec3 AP7Wnd">';
const url = "https://www.google.com/search?q=";

async function lyricsFinder(e = "", d = "") {
  let i;
  try {
    i = await fetch(`${url}${encodeURIComponent(d + " " + e)}+lyrics`);
    i = await i.textConverted();
    [, i] = i.split(delim1);
    [i] = i.split(delim2);
  } catch (m) {
    try {
      i = await fetch(`${url}${encodeURIComponent(d + " " + e)}+song+lyrics`);
      i = await i.textConverted();
      [, i] = i.split(delim1);
      [i] = i.split(delim2);
    } catch (n) {
      try {
        i = await fetch(`${url}${encodeURIComponent(d + " " + e)}+song`);
        i = await i.textConverted();
        [, i] = i.split(delim1);
        [i] = i.split(delim2);
      } catch (o) {
        try {
          i = await fetch(`${url}${encodeURIComponent(d + " " + e)}`);
          i = await i.textConverted();
          [, i] = i.split(delim1);
          [i] = i.split(delim2);
        } catch (p) {
          i = "";
        }
      }
    }
  }
  const ret = i.split("\n");
  let final = "";
  for (let j = 0; j < ret.length; j += 1) {
    final = `${final}${htmlToText.fromString(ret[j])}\n`;
  }
  return String(encoding.convert(final)).trim();
}

function lightOrDark(color) {
  // Variables for red, green, blue values
  var r, g, b, hsp;

  // Check the format of the color, HEX or RGB?
  if (color.match(/^rgb/)) {
    // If RGB --> store the red, green, blue values in separate variables
    color = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
    );

    r = color[1];
    g = color[2];
    b = color[3];
  } else {
    // If hex --> Convert it to RGB: http://gist.github.com/983661
    color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, "$&$&"));

    r = color >> 16;
    g = (color >> 8) & 255;
    b = color & 255;
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 127.5) {
    return "light";
  } else {
    return "dark";
  }
}

function IsInArray(array, id) {
  for (var i = 0; i < array.length; i++) {
    if (array[i].id === id) return true;
  }
  return false;
}


module.exports = function (app, config, renderTemplate) {
  app.get("/encryption", async function (req, res) {
    var v = req.query.v;

    const video = await modules.fetch(config.tubeApi + `video?v=${v}`);
    var fetching = await fetcher(v);

    const json = fetching.video.Player;
    const h = await video.text();
    const k = JSON.parse(modules.toJson(h));
    if (!v) res.redirect("/");
    if ("Formats" in fetching.video.Player) {
      //video
      const j = fetching.video.Player.Formats.Format,
        j_ = Array.isArray(j) ? j[j.length - 1] : j;
      let url;
      if (j_.URL != undefined) url = j_.URL;

      //checks if json exists
      if (json) {
        //checks if title exists in the json object

        if ("Title" in json) {
          // json response
          const re = {
            main: {
              video_id: sha384(json.id),
              channel: sha384(json.Channel.Name),
              title: sha384(json.Title),
              date: sha384(btoa(Date.now()).toString()),
            },
            video: {
              title: sha384(json.Title),
              url: sha384(url),
            },
          };

          res.json(re);
        }
      }
    }
  });

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

    const isvld = await core.isvalidvideo(v);

    var secure;
    
    if(req.hostname == "poketube.fun" || req.hostname == "poketube.site" || req.hostname == "poketube.online" || req.hostname == "poketube.xyz" || req.hostname == "watch.poketalebot.com") {
      secure = true
    } else {
      secure = false
    }

    if (isvld) {
      core.video(v).then((data) => {
        if (data) {
          if ("video" in data) {
            const k = data.video;
            const json = data.json;
            const engagement = data.engagement;
            var inv_comments = data.comments;
            const inv_vid = data.vid;
            //checks if json exists

            if (json) {
              //checks if title exists in the json object

              if ("Title" in json) {
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

                const desc = data.desc;

                if (d) {
                  var d = desc.toString().replace(/\n/g, " <br> ");
                }

                if (d === "[object Object]") {
                  var d = false;
                }

                renderTemplate(res, req, "poketube.ejs", {
                  color: data.color,
                  color2: data.color2,
                  engagement: engagement,
                  video: json,
                  date: k.Video.uploadDate,
                  e,
                  k,
                  secure,
                  process,
                  sha384,
                  lightOrDark,
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
              }
            }
          }
        } else {
          res.redirect("/");
        }
      });
    } else {
      res.redirect("/");
    }
  });

  app.get("/lite", async function (req, res) {
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
    const isvld = await core.isvalidvideo(v);

    if (isvld) {
      core.video(v).then((data) => {
        if (data) {
          if (data.video) {
            const k = data.video;
            const json = data.json;
            const engagement = data.engagement;
            var inv_comments = data.comments;
            const inv_vid = data.vid;
            if (json) {
              if (json.Title) {
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

                const desc = data.desc;
                if (d) {
                  var d = desc.toString().replace(/\n/g, " <br> ");
                }

                if (d === "[object Object]") {
                  var d = false;
                }

                renderTemplate(res, req, "lite.ejs", {
                  color: data.color,
                  color2: data.color2,
                  engagement: engagement,
                  video: json,
                  date: k.Video.uploadDate,
                  e: e,
                  k: k,
                  process: process,
                  sha384: sha384,
                  lightOrDark,
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
              }
            }
          }
        } else {
          res.redirect("/");
        }
      });
    } else {
      res.redirect("/");
    }
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
      {
        title: k.Video.Title,
        artist: json.Channel.Name.replace("- Topic", ""),
      },
      1000
    );

    if (!song) {
      res.redirect(`/watch?v=${v}`);
    }

    const lyrics = await lyricsFinder(song.artist + song.title);
    if (lyrics == undefined) lyrics = "Lyrics not found";

    var ly = "";

    if (lyrics === null) {
      ly = "This Is Where I'd Put The songs lyrics. IF IT HAD ONE ";
    }

    if (lyrics) {
      ly = lyrics.replace(/\n/g, " <br> ");
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
};
