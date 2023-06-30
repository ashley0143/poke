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

var http = require("https");
var ping = require("ping");

const sha384 = modules.hash;

function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = function (app, config, renderTemplate) {
  app.get("/app", async function (req, res) {
    let tab = "";
    if (req.query.tab) {
      tab = `/?type=${capitalizeFirstLetter(req.query.tab)}`;
    }

    const invtrend = await modules.fetch(
      `https://invid-api.poketube.fun/api/v1/trending${tab}`
    );
    const t = getJson(await invtrend.text());

    let j = null;
    if (req.query.mobilesearch) {
      const query = req.query.mobilesearch;
      const continuation = req.query.continuation || "";
      const search = await modules.fetch(
        `https://inner-api.poketube.fun/api/search?query=${query}&continuation=${continuation}`
      );
      const text = await search.text();
      j = getJson(modules.toJson(text));
    }

    renderTemplate(res, req, "main.ejs", {
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
    const uaos = req.useragent.os;
    const browser = req.useragent.browser;
    const isOldWindows =
      (uaos === "Windows 7" || uaos === "Windows 8") && browser === "Firefox";

    if (process.env.STATUSPAGE_API) {
      // The following 4 are the actual values that pertain to your account and this specific metric.
      var apiKey = process.env.STATUSPAGE_API;
      var pageId = process.env.STATUSPAGE_PAGEID;
      var metricId = process.env.STATUSPAGE_METRICID;
      var apiBase = "https://api.statuspage.io/v1";

      var url =
        apiBase + "/pages/" + pageId + "/metrics/" + metricId + "/data.json";
      var authHeader = { Authorization: "OAuth " + apiKey };
      var options = { method: "POST", headers: authHeader };

      var totalPoints = (60 / 5) * 24;
      var epochInSeconds = Math.floor(new Date() / 1000);

      var count = 0 + 1;

      if (count > totalPoints) return;

      var currentTimestamp = epochInSeconds - (count - 1) * 5 * 60;

      // Measure server ping here
      var host = "poketube.fun"; // Replace with the server you want to ping

      ping.promise
        .probe(host)
        .then((result) => {
          var ping = result.time !== "unknown" ? parseInt(result.time) : -1;

          ping = Math.min(Math.max(ping, 20), 250);

          var data = {
            timestamp: currentTimestamp,
            value: ping,
          };

          var request = http.request(url, options, function (res) {
            if (res.statusMessage === "Unauthorized") {
              const genericError =
                "Error encountered. Please ensure that your page code and authorization key are correct.";
              return console.error(genericError);
            }
            res.on("data", function () {
              console.log("Submitted point " + count + " of " + totalPoints);
            });
            res.on("end", function () {
              
            });
            res.on("error", (error) => {
              console.error(`Error caught: ${error.message}`);
            });
          });

          request.end(JSON.stringify({ data: data }));
        })
        .catch((error) => {
          console.error("Ping failed:", error);
          // Submit a default value if the ping fails
          var data = {
            timestamp: currentTimestamp,
            value: -1, // Use -1 to indicate ping failure
          };

          var request = http.request(url, options, function (res) {
            // Handle response
          });

          request.end(JSON.stringify({ data: data }));
        });
    }

    const rendermainpage = () => {
      if (req.useragent.isMobile) {
        return res.redirect("/discover");
      }

      return renderTemplate(res, req, "landing.ejs", {
        isOldWindows,
      });
    };

    if (req.params.v && /[a-zA-Z0-9]+/.test(req.params.v)) {
      const isvld = await core.isvalidvideo(req.params.v);
      if (isvld) {
        return res.redirect(`/watch?v=${req.params.v}`);
      }
    }

    return rendermainpage();
  });
};
