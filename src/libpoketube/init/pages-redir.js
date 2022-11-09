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

module.exports = function (app,config, renderTemplate) {
 

app.get("/hashtag/:id", (req, res) => {
  if (!req.params.id) {
    return res.redirect("/");
  }

  return res.redirect(`/search?query=${req.params.id}&from=hashtag`);
});

app.get("/video/upload", (req, res) => {
  res.redirect("https://youtube.com/upload");
});
}