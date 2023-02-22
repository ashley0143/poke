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
  var html_location = "./css/";

  app.get("/privacy", function (req, res) {
      if ( req.hostname == "poketube.fun" || req.hostname == "poketube.site" || req.hostname == "poketube.online" || req.hostname == "poketube.xyz" ) {
    renderTemplate(res, req, "priv.ejs");
    } else {
    renderTemplate(res, req, "priv-custom.ejs");
    }
  });

  app.get("/143", function (req, res) {
    var number_easteregg = getRandomArbitrary(0, 143);

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

  app.get("/credits", function (req, res) {
    renderTemplate(res, req, "want-you-gone.ejs");
  });
  
  app.get("/custom-theme", function (req, res) {
    renderTemplate(res, req, "custom-css.ejs");
  });

  app.get("/css/:id", (req, res) => {
    res.sendFile(req.params.id, { root: html_location });
  });

};
