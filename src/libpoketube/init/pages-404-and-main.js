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
  app.get("/discover", async function (req, res) {
    const trends = await modules.fetch(`${config.tubeApi}trending`);
    const h = await trends.text();
    const k = getJson(modules.toJson(h));

    let tab = "";
    if (req.query.tab) {
      tab = `/?type=${capitalizeFirstLetter(req.query.tab)}`;
    }

    const invtrend = await modules.fetch(`https://invid-api.poketube.fun/api/v1/trending${tab}`);
    const t = getJson(await invtrend.text());

    let j = null;
    if (req.query.mobilesearch) {
      const query = req.query.mobilesearch;
      const continuation = req.query.continuation || "";
      const search = await modules.fetch(`https://tube-srv.ashley143.gay/api/search?query=${query}&continuation=${continuation}`);
      const text = await search.text();
      j = getJson(modules.toJson(text));
    }

    renderTemplate(res, req, "main.ejs", {
      k,
      tab: req.query.tab,
      isMobile: req.useragent.isMobile,
      mobilesearch: req.query.mobilesearch,
      inv: t,
      turntomins,
      continuation: req.query.continuation,
      j,
    });
  });

  app.get("/:v*?", async function (req, res) {
    const rendermainpage = () => {
      if (req.useragent.isMobile) {
        return res.redirect("/discover");
      }
      return renderTemplate(res, req, "landing.ejs");
    };

    if (req.params.v && /[a-zA-Z0-9]+/.test(req.param.v)) {
      const isvld = await core.isvalidvideo(req.params.v);
      if (isvld) {
        return res.redirect(`/watch?v=${req.params.v}`);
      }
    }
    return rendermainpage();
  });
};
