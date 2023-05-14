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

function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = function (app, config, renderTemplate) {
  app.get("/download", async function (req, res) {
    try {
      var v = req.query.v;

      renderTemplate(res, req, "download.ejs", {
        v, 
        color: await modules
          .getColors(`https://i.ytimg.com/vi/${v}/maxresdefault.jpg`)
          .then((colors) => colors[0].hex()),
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

    const poketube_universe_value = "poketube_smart_search"
    
    if(query.includes("youtube.com")){
      try {
      var videoid = query.split("v=")
      
      res.redirect("/watch?v=" + videoid[1])
      } catch {
        return;
      }
      
    }
    
    if (!query) {
      return res.redirect("/");
    }

    let continuation = req.query.continuation || "";

    try {
      const searchUrl = `https://inner-api.poketube.fun/api/search?query=${encodeURIComponent(
        query
      )}&continuation=${encodeURIComponent(continuation)}`;
      const searchResponse = await modules.fetch(searchUrl);
      const searchText = await searchResponse.text();
      const searchJson = JSON.parse(modules.toJson(searchText));

      let didYouMean;
      if (
        searchJson.Search?.Results?.DynamicItem?.id === "didYouMeanRenderer"
      ) {
        didYouMean = JSON.parse(searchJson.Search.Results.DynamicItem.Title);
      }

      const summary = await wiki
        .summary(query + " ")
        .then((summary_) =>
          summary_.title !== "Not found." ? summary_ : "none"
        );

      renderTemplate(res, req, "search.ejs", {
        j: searchJson,
        h: didYouMean,
        continuation,
        q: query,
        summary,
      });
    } catch (error) {
      console.error(`Error while searching for '${query}':`, error);
      res.redirect("/");
    }
  });

  app.get("/channel/", async (req, res) => {
    try {
      const ID = req.query.id;
      const tab = req.query.tab;
      const cache = {};

      try {
        // about
        const bout = await modules.fetch(
          config.tubeApi + `channel?id=${ID}&tab=about`
        );
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
          return await modules
            .fetch(url)
            .then((res) => res.text())
            .then((txt) => getJson(txt));
        } catch (error) {
          console.error("Failed to fetch channel data from API:", error);
          return null;
        }
      };
      var tj = await getChannelData(
        `https://invid-api.poketube.fun/api/v1/channels/videos/${ID}/?sort_by=${sort_by}${continuation}`
      );
      var shorts = await getChannelData(
        `https://invid-api.poketube.fun/api/v1/channels/${ID}/shorts?sort_by=${sort_by}${continuations}`
      );
      var stream = await getChannelData(
        `https://invid-api.poketube.fun/api/v1/channels/${ID}/streams?sort_by=${sort_by}${continuationl}`
      );
      var c = await getChannelData(
        `https://invid-api.poketube.fun/api/v1/channels/community/${ID}/`
      );

      cache[ID] = {
        result: {
          tj,
          shorts,
          stream,
          c,
          boutJson,
        },
        timestamp: Date.now(),
      };

      if (cache[ID] && Date.now() - cache[ID].timestamp < 3600000) {
        var { tj, shorts, stream, c, boutJson } = cache[ID].result;
      }

      const summary = await wiki.summary(boutJson?.Channel?.Metadata.Name);
      const wikiSummary = summary.title !== "Not found." ? summary : "none";

      const subscribers = boutJson.Channel.Metadata.Subscribers;
      const about = boutJson.Channel.Contents.ItemSection.About;
      const description = about.Description.toString().replace(/\n/g, " <br> ");
      const dnoreplace = about.Description.toString();

      renderTemplate(res, req, "channel.ejs", {
        ID,
        tab,
        shorts,
        j: boutJson,
        sort: sort_by,
        stream,
        tj,
        c,
        convert,
        turntomins,
        dnoreplace,
        continuation,
        wiki: wikiSummary,
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
