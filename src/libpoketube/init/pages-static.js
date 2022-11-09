 const {  fetcher,core, wiki,musicInfo, modules, version, initlog, init,} = require("../libpoketube-initsys.js");
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
var html_location = './css/';
  
app.get("/privacy", function (req, res) {
  renderTemplate(res, req, "priv.ejs");
});

app.get("/143", function (req, res) {
  var number_easteregg = getRandomArbitrary(0, 150);

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

app.get("/css/:id", (req, res) => {
       res.sendFile(req.params.id, { root : html_location}); 
});
  
  
}