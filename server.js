/*

    PokeTube is an Free/Libre youtube front-end. this is our main file.
  
    Copyright (C) 2021-2023 POKETUBE (https://github.com/iamashley0/poketube)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see https://www.gnu.org/licenses/.
  */

(async function () {
  const {
    fetcher,
    core,
    wiki,
    musicInfo,
    modules,
    version,
    initlog,
    init,
  } = require("./src/libpoketube/libpoketube-initsys.js");
  const media_proxy = require("./src/libpoketube/libpoketube-video.js");
  const { sinit } = require("./src/libpoketube/init/superinit.js");
  const u = await media_proxy();

  initlog("Loading...");
  initlog(
    "[Welcome] Welcome To PokeTube :3 " +
      "Running " +
      `Node ${process.version} - V8 v${
        process.versions.v8
      } -  ${process.platform.replace("linux", "GNU/Linux")} ${
        process.arch
      } Server - libpt ${version}`
  );

  const {
    IsJsonString,
    convert,
    getFirstLine,
    capitalizeFirstLetter,
    turntomins,
    getRandomInt,
    getRandomArbitrary,
  } = require("./src/libpoketube/ptutils/libpt-coreutils.js");

  initlog("Loaded libpt-coreutils");

  const templateDir = modules.path.resolve(
    `${process.cwd()}${modules.path.sep}html`
  );

  const sha384 = modules.hash;

  var app = modules.express();
  initlog("Loaded express.js");
  app.engine("html", require("ejs").renderFile);
  app.use(modules.express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  app.use(modules.useragent.express());
  app.use(modules.express.json()); // for parsing application/json

  const renderTemplate = async (res, req, template, data = {}) => {
    res.render(
      modules.path.resolve(`${templateDir}${modules.path.sep}${template}`),
      Object.assign(data)
    );
  };

  const random_words = [
    "banana pie",
    "how to buy an atom bomb",
    "is love just an illusion",
    "things to do if ur face becomes benjamin frenklin",
    "how do defeat an pasta",
    "can you go to space?",
    "how to become a god?",
    "is a panda a panda if pandas???",
    "Minecraft movie trailer",
    "monke",
  ];

  /*
this is our config file,you can change stuff here
*/
  const config = {
    tubeApi: "https://tube-srv.ashley143.gay/api/",
    invapi: "https://invidious.weblibre.org/api/v1",
    dislikes: "https://returnyoutubedislikeapi.com/votes?videoId=",
    t_url: "https://t.poketube.fun/", //  def matomo url
  };

  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");

    next();
  });

  sinit(app, config, renderTemplate);

  init(app);
})();
