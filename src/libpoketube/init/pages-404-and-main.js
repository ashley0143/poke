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
  app.get("/discover", async function (req, res) {
    const trends = await modules.fetch(config.tubeApi + `trending`);
    const h = await trends.text();
    const k = JSON.parse(modules.toJson(h));

    if (req.query.tab)
      var tab = `/?type=${capitalizeFirstLetter(req.query.tab)}`;

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
        `https://tube-srv.ashley143.gay/api/search?query=${query}&continuation=${continuation}`
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

  app.get("/:v*?", async function (req, res) {
    let rendermainpage = () => {
      if (req.useragent.isMobile) {
        return res.redirect(`/discover`);
      } else {
        return renderTemplate(res, req, "landing.ejs");
      }
    };

    if (req.params.v) {
      const isvld = await core.isvalidvideo(req.params.v);

      if (isvld) {
        return res.redirect(`/watch?v=${req.params.v}`);
      } else {
        return rendermainpage();
      }
    } else {
      return rendermainpage();
    }
  });
};
