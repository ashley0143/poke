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
    var v = req.query.v;

    // video
    const video = await modules.fetch(config.tubeApi + `video?v=${v}`);
    const h = await video.text();
    const k = JSON.parse(modules.toJson(h));

    if (!v) res.redirect("/");

    var fetching = await fetcher(v);

    const json = fetching.video.Player;
    const engagement = fetching.engagement;

    renderTemplate(res, req, "download.ejs", {
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

    if (!query) {
      return res.redirect("/");
    }

    if (query) {
      try {
        const search = await modules.fetch(
          `https://tube-srv.ashley143.gay/api/search?query=${query.replace(
            "&",
            "and"
          )}&continuation=${continuation}`
        );

        const text = await search.text();
        const j = JSON.parse(modules.toJson(text));

        h = " ";
     
        // YOUTUBE WHY do you WANT me to do this oh ma gosh
        if (j.Search) {
          if ("Results.DynamicItem" in j.Search) {
            if (j.Search.Results.DynamicItem.id == "didYouMeanRenderer") {
              var h = JSON.parse(j.Search.Results.DynamicItem.Title);
            }
          }
        }

        const summary = await wiki
          .summary(query + " ")
          .then((summary_) =>
            summary_.title !== "Not found." ? summary_ : "none"
          );

        renderTemplate(res, req, "search.ejs", {
          j,
          h,
          continuation,
          q: query,
          summary,
        });
      } catch {
        res.redirect("/");
      }
    }
  });
  
app.get("/channel/", async (req, res) => {
  try {
    const ID = req.query.id;
    const tab = req.query.tab;

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
    
    const continuation = req.query.continuation || "";
    const continuationl = req.query.continuationl || "";
    const continuations = req.query.continuations || "";
    const sort_by = req.query.sort_by || "newest";

    const getChannelData = async (url) => {
      try {
        const response = await modules.fetch(url);
        return JSON.parse(await response.text());
      } catch (error) {
        console.error("Failed to fetch channel data from API:", error);
        return null;
      }
    }

    const [tj, shorts, stream, c] = await Promise.all([
      getChannelData(`https://inv.zzls.xyz/api/v1/channels/videos/${ID}/?sort_by=${sort_by}&continuation=${continuation}`),
      getChannelData(`https://inv.zzls.xyz/api/v1/channels/${ID}/shorts?sort_by=${sort_by}&continuation=${continuations}`),
      getChannelData(`https://inv.zzls.xyz/api/v1/channels/${ID}/streams?sort_by=${sort_by}&continuation=${continuationl}`),
      getChannelData(`https://inv.zzls.xyz/api/v1/channels/community/${ID}/`),
    ]);

    const summary = await wiki.summary(boutJson.Channel.Metadata.Name);
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
      subs: typeof subscribers === "string" ? subscribers.replace("subscribers", "") : "None",
      desc: dnoreplace === "[object Object]" ? "" : description,
    });
  } catch (error) {
    console.error("Failed to render channel page:", error);
    res.redirect("/");
  }
});

};
