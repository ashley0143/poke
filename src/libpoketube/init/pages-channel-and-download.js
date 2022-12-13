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

const sha384 = modules.hash

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
      `https://tube-srv.ashley143.gay/api/search?query=${query}&continuation=${continuation}`
    );

    const text = await search.text();
    const j = JSON.parse(modules.toJson(text));

    if (!query) {
      return res.redirect("/");
    }

    h = " ";

    if (j.Search.Results.DynamicItem) {
      if (j.Search.Results.DynamicItem.id == "didYouMeanRenderer") {
        var h = JSON.parse(j.Search.Results.DynamicItem.Title);
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
    const a = await modules.fetch(`${config.invapi}/channels/videos/${ID}/`).then((res) =>
    res.text()
  );

      var tj = await getJson(a);


        const  community = await modules.fetch(`${config.invapi}/channels/community/${ID}/`).then((res) =>
    res.text()
  );

      var c = await getJson(community);

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
     ID,
      tab,
      j: k,
      tj,
      c,
      convert,
      turntomins,
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
};
