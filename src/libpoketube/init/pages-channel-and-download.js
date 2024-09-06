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
const { curly } = require("node-libcurl");

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

/**
 * Parses a string to JSON, returns null if parsing fails.
 * @param {string} str - The input string to be parsed as JSON.
 * @returns {Object|null} - The parsed JSON object or null if parsing fails.
 */
function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Object representing base64-encoded protobuf values for channel tabs.
 * @typedef {Object} ChannelTabs
 * @property {string} community - Base64-encoded value for the community tab.
 * @property {string} shorts - Base64-encoded value for the shorts tab.
 * @property {string} videos - Base64-encoded value for the videos tab.
 * @property {string} streams - Base64-encoded value for the streams tab.
 */

// see https://developers.google.com/youtube/v3/docs/channels/
const ChannelTabs = {
  community: "Y29tbXVuaXR5",
  shorts: "c2hvcnRz",
  videos: "dmlkZW9z",
  streams: "c3RyZWFtcw==", // or "live"
  channels: "Y2hhbm5lbHM=",
  store: "c3RvcmU=",
  released: "cmVsZWFzZWQ=",
  playlist: "cGxheWxpc3Rz",
};

module.exports = function (app, config, renderTemplate) {
  app.get("/download", async function (req, res) {
    try {
      var v = req.query.v;

      renderTemplate(res, req, "download.ejs", {
        v,
        color: await modules
          .getColors(`https://i.ytimg.com/vi/${v}/maxresdefault.jpg`)
          .then((colors) => colors[0].hex()),
        isMobile: req.useragent.isMobile,
      });
    } catch {
      res.redirect("/");
    }
  });

  app.get("/old/watch", async function (req, res) {
    var v = req.query.v;
    var e = req.query.e;
    if (!v) res.redirect("/");

    res.redirect(`/watch?v=${v}`);
  });

  app.get("/api/getchanneltabs", async function (req, res) {
    res.json(ChannelTabs);
  });

  app.get("/search", async (req, res) => {
    const query = req.query.query.replace("ohio", "things to do in ohio");
    const tab = req.query.tab;
    const { fetch } = await import("undici");

    var media_proxy = config.media_proxy;

    if (req.useragent.source.includes("Pardus")) {
      var media_proxy = "https://media-proxy.ashley0143.xyz";
    }
    var uaos = req.useragent.os;
    var IsOldWindows;

    if (uaos == "Windows 7" && req.useragent.browser == "Firefox") {
      IsOldWindows = true;
    } else if (uaos == "Windows 8" && req.useragent.browser == "Firefox") {
      IsOldWindows = true;
    } else {
      IsOldWindows = false;
    }

    const poketube_universe_value = "poketube_smart_search";

    if (query) {
      let redirectTo = null;
      let splitParam = ":";

      if (query.includes("youtube.com/watch?v=")) {
        redirectTo = "/watch";
        splitParam = "?v=";
      } else if (query.includes("channel")) {
        redirectTo = "/channel?id=";
      } else if (query.includes("video")) {
        redirectTo = "/watch?v=";
      }

      if (redirectTo) {
        try {
          const id = query.split(splitParam)[1];
          res.redirect(`${redirectTo}${splitParam}${id}`);
        } catch {
          return;
        }
      }
    }

    if (query && query.startsWith("!") && query.length > 2) {
      res.redirect("https://lite.duckduckgo.com/lite/?q=" + query);
    }

    if (!query) {
      return res.redirect("/");
    }

    let continuation = req.query.continuation || "";
    let date = req.query.date || "";
    let type = "video";
    let duration = req.query.duration || "";
    let sort = req.query.sort || "";

    try {
      const headers = {};

      const xmlData = await fetch(
        `${config.invapi}/search?q=${encodeURIComponent(
          query
        )}&page=${encodeURIComponent(
          continuation
        )}&date=${date}&type=${type}&duration=${duration}&sort=${sort}&hl=en+gb`
      )
        .then((res) => res.text())
        .then((txt) => getJson(txt));

      renderTemplate(res, req, "search.ejs", {
        invresults: xmlData,
        turntomins,
        date,
        type,
        duration,
        sort,
        IsOldWindows,
        tab,
        continuation,
        media_proxy_url: media_proxy,
        results: "",
        q: query,
        summary: "",
      });
    } catch (error) {
      console.error(`Error while searching for '${query}':`, error);
      res.redirect("/");
    }
  });

  app.get("/im-feeling-lucky", function (req, res) {
    res.send("WIP");
  });

  app.get("/web", async (req, res) => {
    res.redirect("/");
  });

  app.get("/channel/", async (req, res) => {
    const { fetch } = await import("undici");
    try {
      var media_proxy = config.media_proxy;

      if (req.useragent.source.includes("Pardus")) {
        var media_proxy = "https://media-proxy.ashley0143.xyz";
      }

      var ID = req.query.id;

      if (ID.endsWith("@youtube.com")) {
        ID = ID.slice(0, -"@youtube.com".length);
      }

      if (ID.endsWith("@poketube.fun")) {
        ID = ID.slice(0, -"@poketube.fun".length);
      }

      const tab = req.query.tab;
      const cache = {};

      try {
        // about
        const bout = await fetch(config.tubeApi + `channel?id=${ID}&tab=about`);
        const h = await bout.text();
        var boutJson = JSON.parse(modules.toJson(h));
      } catch {
        boutJson = " ";
      }

      const continuation = req.query.continuation
        ? `&continuation=${req.query.continuation}`
        : "";
      const continuationl = req.query.continuationl
        ? `&continuation=${req.query.continuationl}`
        : "";
      const continuations = req.query.continuations
        ? `&continuation=${req.query.continuations}`
        : "";
      const sort_by = req.query.sort_by || "newest";

      const getChannelData = async (url) => {
        try {
          return await fetch(url)
            .then((res) => res.text())
            .then((txt) => getJson(txt));
        } catch (error) {
          return null;
        }
      };

      const apiUrl = config.invapi + "/channels/";
      const channelUrl = `${apiUrl}${atob(
        ChannelTabs.videos
      )}/${ID}/?sort_by=${sort_by}${continuation}`;
      const shortsUrl = `${apiUrl}${ID}/${atob(
        ChannelTabs.shorts
      )}?sort_by=${sort_by}${continuations}`;
      const streamUrl = `${apiUrl}${ID}/${atob(
        ChannelTabs.streams
      )}?sort_by=${sort_by}${continuationl}`;
      const communityUrl = `${apiUrl}${atob(
        ChannelTabs.community
      )}/${ID}/?hl=en-US`;
      const PlaylistUrl = `${apiUrl}${atob(
        ChannelTabs.playlist
      )}/${ID}/?hl=en-US`;

      const channelINVUrl = `${apiUrl}${ID}/`;

      const pronoun = "no pronouns :c";

      var [tj, shorts, playlist, stream, c, cinv] = await Promise.all([
        getChannelData(channelUrl),
        getChannelData(shortsUrl),
        getChannelData(PlaylistUrl),
        getChannelData(streamUrl),
        getChannelData(communityUrl),
        getChannelData(channelINVUrl),
      ]);

     
var bannedchannels = ["UC1okSIA8UEY8OqvtjGHFvzA", "UClsVg5LkK2COQRo1mVS4taA", "UCIr4vkCsn0tdTW2xZ1jRG1g"];
var bypassQuery = "cG9rZXR1YmVjaGFubmVsYnlwYXNzbG9scGVvcGxldGhpbmt0aGlzaXNjZW5zb3JzaGlwLTQ1OTBh";

var bypassExists = req.query.bypass === bypassQuery;
var tabExists = 'tab' in req.query;
var continuationExists = 'continuation' in req.query;


if (ID.includes(bannedchannels) && !bypassExists && !tabExists && !continuationExists) {
  var cinv = {
    error:`this channel may include disinformation. If you still wanna view content <a href="/channel?id=${ID}&bypass=${bypassQuery}">click here</a> to bypass this restriction.`
 }
}



      function getThumbnailUrl(video) {
        const maxresDefaultThumbnail = video.videoThumbnails.find(
          (thumbnail) => thumbnail.quality === "maxresdefault"
        );

        if (maxresDefaultThumbnail) {
          return `https://vid.puffyan.us/vi/${video.videoId}/maxresdefault.jpg`;
        } else {
          return `https://vid.puffyan.us/vi/${video.videoId}/hqdefault.jpg`;
        }
      }

      cache[ID] = {
        result: {
          tj,
          shorts,
          stream,
          c,
          cinv,
          boutJson,
        },
        timestamp: Date.now(),
      };

      if (cache[ID] && Date.now() - cache[ID].timestamp < 3600000) {
        var { tj, shorts, stream, c, boutJson } = cache[ID].result;
      }

      const subscribers = convert(cinv?.subCount || 0);
      const about = boutJson?.Channel?.Contents?.ItemSection?.About;
      const description = about?.Description.toString().replace(
        /\n/g,
        " <br> "
      );
      const dnoreplace = about?.Description.toString();

      if (continuation) {
        const currentAuthorId = String(cinv.authorId).trim();
        const firstVideoAuthorId = String(tj?.videos[0].authorId).trim();

        if (currentAuthorId.localeCompare(firstVideoAuthorId) !== 0) {
          res.status(400).send("Continuation does not match the channel :c");
        }
      }

      let ChannelFirstVideoObject = {
          subCountText: "0",
          authorVerified: false,
        };

      renderTemplate(res, req, "channel.ejs", {
        ID,
        tab,
        shorts,
        firstVideo: ChannelFirstVideoObject,
        j: boutJson,
        sort: sort_by,
        stream,
        tj,
        c,
        cinv,
        convert,
        turntomins,
        pronoun,
        media_proxy_url: media_proxy,
        dnoreplace,
        getThumbnailUrl,
        continuation,
        wiki: "",
        getFirstLine,
        isMobile: req.useragent.isMobile,
        about,
        playlist,
        subs:
          typeof subscribers === "string"
            ? subscribers.replace("subscribers", "")
            : "None",
        desc: dnoreplace === "[object Object]" ? "" : description,
      });
    } catch (error) {
      console.error("Failed to render channel page:", error);
      res.redirect("/");
    }
  });
};
