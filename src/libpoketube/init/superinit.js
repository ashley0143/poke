const {
  fetcher,
  core,
  wiki,
  musicInfo,
  modules,
  version,
  initlog,
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
const { api } = require("../init/pages-api.js");

function init(app, config, rendertemplate) {
  var didstart = false;

  initlog("wait a few mins... pt on timeout rn");

 
  app.get("/*", function (req, res, next) {
    if (didstart) return next();

    return rendertemplate(res, req, "timeout.ejs");
  });


  setTimeout(function () {
    didstart = true;

    initlog("Starting superinit");

    initlog("[START] Load pages");

    if (Math.random() < 0.5) {
      initlog("https://poketube.fun/watch?v=lpiB2wMc49g");
    }

    try {
      const modulesToLoad = [
        { name: "video pages", path: "../init/pages-video.js" },
        { name: "redirects/old pages", path: "../init/pages-redir.js" },
        { name: "Download and channel pages", path: "../init/pages-channel-and-download.js",},
        { name: "api pages", path: "../init/pages-api.js" },
        { name: "static pages", path: "../init/pages-static.js" },
        { name: "account pages", path: "../init/pages-account.js" },
        { name: "main pages", path: "../init/pages-404-and-main.js" },
      ];

      for (const moduleInfo of modulesToLoad) {
        initlog(`Loading ${moduleInfo.name}`);
        require(moduleInfo.path)(app, config, rendertemplate);
        initlog(`Loaded ${moduleInfo.name}`);
      }

      initlog("[OK] Load pages");
      initlog("Loaded pages - initing poketube finnished :3");

      setTimeout(function () {
        /*   setInterval(function () {
        PokeTube Update daemon - checks for updates in poketube
          (async () => {
            const url = `https://poketube.fun/api/version.json?v=3`;

            let f = await modules
              .fetch(url)
              .then((res) => res.text())
              .then((json) => JSON.parse(json));

            if (f.vernum == api) {
              console.log("[UPDATE DAEMON] PokeTube is up to date!");
            }

            if (f.vernum != api) {
              console.warn(
                "[UPDATE DAEMON] PokeTube is out of date! please re-clone the poketube repo :p  "
              );
            }
          })();
        }, 999999999999999999999999999999); /* setInterval */
          
      }, 100);
    } catch (err) {
      initlog("[FAILED] Load pages \n" + err);
      console.error(err);
    }
  }, 100);
}

module.exports = {
  sinit: init,
};
