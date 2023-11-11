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

function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

const ChannelTabs = {
  community: "Y29tbXVuaXR5",
  shorts: "c2hvcnRz",
  videos: "dmlkZW9z",
  streams: "c3RyZWFtcw==",
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


  app.get("/search", async (req, res) => {
    const query = req.query.query;
    const tab = req.query.tab;
    const { fetch } = await import("undici");

    const search = require("google-it");

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

    if (query?.includes("youtube.com/watch?v=")) {
      try {
        var videoid = query?.split("v=");

        res.redirect("/watch?v=" + videoid[1]);
      } catch {
        return;
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
    let type = req.query.type || "";
    let duration = req.query.duration || "";
    let sort = req.query.sort || "";
 
    try {
      const headers = {};

    const xmlData = await  fetch(`https://invid-api.poketube.fun/api/v1/search?q=${encodeURIComponent(
        query
      )}&page=${encodeURIComponent(continuation)}&date=${date}&type=${type}&duration=${duration}&sort=${sort}&hl=en+gb`)
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
        results: "",
        q: query,
        summary: "",
      });
    } catch (error) {
      console.error(`Error while searching for '${query}':`, error);
      res.redirect("/");
    }
  });

  app.get("/web", async (req, res) => {
    const query = req.query.query;
    const tab = req.query.tab;

    const search = require("google-it");

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

    if (query?.includes("youtube.com/watch?v=")) {
      try {
        var videoid = query?.split("v=");

        res.redirect("/watch?v=" + videoid[1]);
      } catch {
        return;
      }
    }

    if (query && query.startsWith("!") && query.length > 2) {
      res.redirect("https://lite.duckduckgo.com/lite/?q=" + query);
    }

    if (!query) {
      return renderTemplate(res, req, "search-web-main.ejs");
    }

    let continuation = req.query.continuation || "";

    try {
      search({ query: `${req.query.query}` }).then((results) => {
        renderTemplate(res, req, "search-web.ejs", {
          j: "",
          IsOldWindows,
          h: "",
          tab,
          continuation,
          isMobile: req.useragent.isMobile,
          results: results,
          q: query,
          summary: "",
        });
      });
    } catch (error) {
      console.error(`Error while searching for '${query}':`, error);
      res.redirect("/");
    }
  });

  app.get("/channel/", async (req, res) => {
    const { fetch } = await import("undici");
    try {
      const ID = req.query.id;
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

      const apiUrl = "https://invid-api.poketube.fun/api/v1/channels/";
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

      const channelINVUrl = `${apiUrl}${ID}/`;

      var [tj, shorts, stream, c, cinv] = await Promise.all([
        getChannelData(channelUrl),
        getChannelData(shortsUrl),
        getChannelData(streamUrl),
        getChannelData(communityUrl),
        getChannelData(channelINVUrl),
      ]);

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

      const subscribers = boutJson.Channel?.Metadata.Subscribers;
      const about = boutJson?.Channel?.Contents?.ItemSection?.About;
      const description = about?.Description.toString().replace(
        /\n/g,
        " <br> "
      );
      const dnoreplace = about?.Description.toString();

      renderTemplate(res, req, "channel.ejs", {
        ID,
        tab,
        shorts,
        j: boutJson,
        sort: sort_by,
        stream,
        tj,
        c,
        cinv,
        convert,
        turntomins,
        dnoreplace,
        continuation,
        wiki: "",
        getFirstLine,
        isMobile: req.useragent.isMobile,
        about,
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
