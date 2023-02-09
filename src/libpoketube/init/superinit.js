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
      initlog("Loading video pages ");
      require("../init/pages-video.js")(app, config, rendertemplate);

      initlog("Loaded video pages ");
      initlog("Loading redirects/old pages ");
      require("../init/pages-redir.js")(app, config, rendertemplate);
      initlog("Loaded redirects/old pages ");

      initlog("Loading Download and channel pages");
      require("../init/pages-channel-and-download.js")(
        app,
        config,
        rendertemplate
      );

      initlog("Loaded Download and channel pages");
      initlog("Loading api pages");
      require("../init/pages-api.js")(app, config, rendertemplate);
      initlog("Loaded api pages");

      initlog("Loading static pages");
      require("../init/pages-static.js")(app, config, rendertemplate);
      initlog("Loaded static pages");
      initlog("Loading main pages");
      require("../init/pages-404-and-main.js")(app, config, rendertemplate);
      initlog("Loaded main pages");

      initlog("[OK] Load pages");

      initlog("Loaded pages - initing poketube finnished :3");
      setTimeout(function () {
        setInterval(function () {
          /* PokeTube Update daemon - checks for updates in poketube */
          (async () => {
            const url = `https://poketube.fun/api/version.json`;

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
        }, 150000);  /* setInterval */
      }, 150000);
    } catch (err) {
      initlog("[FAILED] Load pages \n" + err);
    }
  }, 120000);
}

module.exports = {
  sinit: init,
};
