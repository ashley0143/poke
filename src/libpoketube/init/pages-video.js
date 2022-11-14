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

module.exports = function (app, config, renderTemplate) {
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

    if (isvld) {
      for (let i = 0; i < 3; i++) {
        try {
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

            const desc = data.desc;
            if (d) {
              var d = desc.toString().replace(/\n/g, " <br> ");
            }

            if (d === "[object Object]") {
              var d = false;
            }

            renderTemplate(res, req, "poketube.ejs", {
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
          break;
        } catch (err) {
          if (err.status === 503) {
            // retry after a bit
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            return "";
          }
        }
      }
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
};
