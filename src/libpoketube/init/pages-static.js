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

const path = require("path");
const fs = require("node:fs");
const CleanCSS = require("clean-css");

const sha384 = modules.hash;
const notice = "/* the code is Licensed in gpl-3.0-or-later. This program comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to redistribute it under certain conditions. See the GNU General Public License for more detailsYou should have received a copy of the GNU General Public Licensealong with this program.  If not, see <https://www.gnu.org/licenses/>. - add the param nomin to view source code. (eg poketube.fun/css/poketube.css?nomin=true) */"

module.exports = function (app, config, renderTemplate) {
  var html_location = "./css/";

  app.get("/privacy", function (req, res) {
    if (req.hostname == "poketube.fun") {
      renderTemplate(res, req, "priv.ejs", {
        isMobile: req.useragent.isMobile,
      });
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

  app.get("/customize", function (req, res) {
    const tab = req.query.tab;

    renderTemplate(res, req, "custom-css.ejs", {
      tab,
    });
  });

const cssDir = "./css/";

app.get("/css/:id", (req, res) => {
  const filePath = path.join(cssDir, req.params.id);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("File not found");
    return;
  }

  if (req.params.id.endsWith(".css") && !req.query.nomin) {
    // Minimize the CSS file
    const css = fs.readFileSync(filePath, "utf8");
    const minimizedCss = new CleanCSS().minify(css).styles;
    // Serve the minimized CSS file
    res.header("Content-Type", "text/css");
    res.send(notice + " " + minimizedCss);
  } else {
    // Serve the original file
    res.sendFile(req.params.id, { root: html_location });
  }

  if (req.params.id.endsWith(".js")) {
    res.redirect("/static/" + req.params.id);
  }
});

app.get("/static/:id", (req, res) => {
  if (req.params.id.endsWith(".css")) {
    res.redirect("/css/" + req.params.id);
  } else if (req.params.id.endsWith(".js")) {
    const filePath = path.join(html_location, req.params.id);
    if (!fs.existsSync(filePath)) {
      res.status(404).send("File not found");
      return;
    }
    // Minimize the JavaScript file
    const js = fs.readFileSync(filePath, "utf8");
    const minimizedJs = require("uglify-js").minify(js).code;
    // Serve the minimized JavaScript file
    res.header("Content-Type", "text/javascript");
    res.send("// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-3.0-or-later" + `\n`  + `// Source code can be found in: https://codeberg.org/Ashley/poketube/src/branch/main/css/${req.params.id}` + `\n` + minimizedJs + `\n` + "// @license-end");
  } else {
    res.sendFile(req.params.id, { root: html_location });
  }
});

};
