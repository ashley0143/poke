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

const notice =  "/* the code is Licensed in gpl-3.0-or-later. This program comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to redistribute it under certain conditions. See the GNU General Public License for more detailsYou should have received a copy of the GNU General Public Licensealong with this program.  If not, see <https://www.gnu.org/licenses/>. - add the param nomin to view source code. (eg poketube.fun/css/poketube.css?nomin=true) */";

function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
module.exports = function (app, config, renderTemplate) {
  var html_location = "./css/";
  var location_pwa = "./pwa/";

  app.get("/privacy", function (req, res) {
    if (req.hostname == "poketube.fun") {
      renderTemplate(res, req, "priv.ejs", {
        isMobile: req.useragent.isMobile,
      });
    } else {
      renderTemplate(res, req, "priv-custom.ejs");
    }
  });

  app.get("/502", function (req, res) {
    renderTemplate(res, req, "502.ejs");
  });

app.get("/143", (req, res) => {
  const numberEasterEgg = getRandomArbitrary(0, 143);
  const { number, something } = req.query;

  const shouldRender =
    numberEasterEgg === 143 ||
    number === "143" ||
    something === "143";

  if (shouldRender) {
    return renderTemplate(res, req, "143.ejs", { something });
  }

  return res.redirect(`/?number=${numberEasterEgg}`);
});


  app.get("/rewind", function (req, res) {
    renderTemplate(res, req, "rewind.ejs");
  });

app.get("/notepad", function (req, res) {
    renderTemplate(res, req, "pokepad.ejs");
  });

  app.get("/translate", async function (req, res) {
    const { fetch } = await import("undici");

    const api_url = "https://simplytranslate.org/api/translate";

     const translationResponse = await fetch(
      `${api_url}?from=${req.query.from_language}&to=${req.query.to_language}&text=${req.query.input}&engine=google`
    );

     const translationData = await translationResponse.json();

     const translatedText = translationData.translated_text;

     renderTemplate(res, req, "translate.ejs", {
      translation: translatedText,
      text: req.query.input || "enter text here",
      from_language: req.query.from_language,
      to_language: req.query.to_language,
      isMobile: req.useragent.isMobile,
    });
  });

  app.get("/domains", function (req, res) {
    renderTemplate(res, req, "domains.ejs");
  });

  app.get("/apps", function (req, res) {
    renderTemplate(res, req, "apps.ejs");
  });

  const headers = { "User-Agent": config.useragent };

app.get("/playlist", async function (req, res) {
  if (!req.query.list) res.redirect("/");
  if (req.useragent.isMobile) res.redirect("/");
  const playlist = await fetch(`${config.invapi}/playlists/${req.query.list}?hl=en-us`, { headers });
  const p = getJson(await playlist.text());
  var mediaproxy = config.media_proxy;
  if (req.useragent.source.includes("Pardus")) {
    mediaproxy = "https://media-proxy.ashley0143.xyz";
  }
  renderTemplate(res, req, "playlist.ejs", { p, mediaproxy });
});



  app.get("/license", function (req, res) {
    renderTemplate(res, req, "license.ejs");
  });

  app.get("/map", function (req, res) {
    renderTemplate(res, req, "map.ejs");
  });

  app.get("/credits", function (req, res) {
    renderTemplate(res, req, "want-you-gone.ejs");
  });

  app.get("/settings", function (req, res) {
    renderTemplate(res, req, "content-settings.ejs");
  });


 function gregorianToIslamic(gDate) {
  const jd = Math.floor((gDate - new Date(1970, 0, 1)) / (24 * 60 * 60 * 1000)) + 2440588;
  const islamicYear = Math.floor((30 * (jd - 1948440) + 10646) / 10631);
  return islamicYear;
}

 function gregorianToPersian(gDate) {
  const persianEpoch = 226895; // Julian Day of Persian Epoch
  const jd = Math.floor((gDate - new Date(1970, 0, 1)) / (24 * 60 * 60 * 1000)) + 2440588;
  const persianYear = Math.floor((jd - persianEpoch) / 365.2421985) + 1;
  return persianYear;
}

app.get('/calendar', (req, res) => {
  // Get the date from query or default to today
  const queryDate = req.query.date ? new Date(req.query.date) : new Date();

  // Extract the year and month from the date
  const year = queryDate.getFullYear();
  const month = queryDate.getMonth(); // 0 (January) to 11 (December)

  const monthOffset = parseInt(req.query.month) || 0; 
  const newDate = new Date(year, month + monthOffset, 1); 
  const newYear = newDate.getFullYear();
  const newMonth = newDate.getMonth();

  const firstDay = new Date(newYear, newMonth, 1);
  const firstDayWeekday = firstDay.getDay(); // Day of the week (0-6)

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(newYear, newMonth, i - firstDayWeekday + 1);
    return (day.getMonth() === newMonth) ? day : null;
  });

  const islamicYear = gregorianToIslamic(newDate);
  const persianYear = gregorianToPersian(newDate);

  renderTemplate(res, req, "calendar.ejs", {
     year: newYear,
    islamicYear,
    persianYear,
    currentDate: newDate,
    days,
    month: newMonth,
    queryDate,
  });
});


  app.get("/offline", function (req, res) {
    res.sendFile("offline.html", { root: location_pwa });
  });

  app.get("/manifest.json", function (req, res) {
    res.sendFile("manifest.json", { root: location_pwa });
  });

  app.get("/customize", function (req, res) {
    const tab = req.query.tab;

    renderTemplate(res, req, "custom-css.ejs", {
      tab,
    });
  });

  const cssDir = "./css/";

  app.get("/favicon.ico", function (req, res) {
    res.sendFile("favicon.ico", { root: cssDir });
  });
  app.get("/bg-full.webm", function (req, res) {
    res.sendFile("bg-full.webm", { root: cssDir });
  });
  app.get("/bg-720.webm", function (req, res) {
    res.sendFile("bg-720.webm", { root: cssDir });
  });
  app.get("/bg-480.webm", function (req, res) {
    res.sendFile("bg-480.webm", { root: cssDir });
  });

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
     res.send(
  notice + " " + minimizedCss.replace(/https:\/\/p\.poketube\.fun\//g, config.p_url + "/")
);
    } else {
      // Serve the original file
      res.sendFile(req.params.id, { root: html_location });
    }

    if (req.params.id.endsWith(".js")) {
      res.redirect("/static/" + req.params.id);
    }
  });

app.get("/game-hub", function (req, res) {
  var gameslist = ["pong", "tic-tac-toe", "sudoku", "snake", "breakout", "minesweeper"];
  var requestedGame = req.query.game;

  if (req.query.game && !gameslist.includes(requestedGame)) {
    return renderTemplate(res, req, "404.ejs");
  }

  renderTemplate(res, req, "gamehub.ejs", {
    game: requestedGame,
  });
});


  app.get("/static/:id", (req, res) => {
    const id = req.params.id;

    if (id.endsWith(".css")) {
      res.redirect("/css/" + id);
    } else if (id.endsWith(".js")) {
      if (id.endsWith(".bundle.js")) {
        const jsFiles = ["app.js", "custom-css.js", "emojis.js"];
        const combinedContent = jsFiles
          .map((fileName) => {
            const filePath = path.join(html_location, fileName);
            return fs.existsSync(filePath)
              ? fs.readFileSync(filePath, "utf-8")
              : "";
          })
          .join("\n" + "\n");

        const minimizedJs = require("uglify-js").minify(combinedContent).code;

        res.header("Content-Type", "text/javascript");
        res.send(
          "// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-3.0-or-later" +
            `\n` +
            `// Includes app.js, emojis.js, and custom-css.js. Source code can be found for these 3 files in https://codeberg.org/Ashley/poketube/src/branch/main/css/` +
            `\n` +
            minimizedJs +
            `\n` +
            "// @license-end"
        );
      } else {
        const filePath = path.join(html_location, id);

        if (!fs.existsSync(filePath)) {
          res.status(404).send("File not found");
          return;
        }

        const js = fs.readFileSync(filePath, "utf8");
        const minimizedJs = require("uglify-js").minify(js).code;

        res.header("Content-Type", "text/javascript");
        res.send(
          "// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-3.0-or-later" +
            `\n` +
            `// Source code can be found in: https://codeberg.org/Ashley/poketube/src/branch/main/css/${id}` +
            `\n` +
            minimizedJs +
            `\n` +
            "// @license-end"
        );
      }
    } else {
      res.sendFile(id, { root: html_location });
    }
  });
};
