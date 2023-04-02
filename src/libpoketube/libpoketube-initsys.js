/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2023 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */

function initlog(args){
  console.log("[LIBPT INTSYS] " + args) 
}

function init (app, port){
  if(!port) port = "3000"
  try {
  app.listen(port, () => {
    initlog("Loading Poketube: success!" + " on port " + port);
  });
  } catch (err) {
  initlog("Loading Poketube: error", err);
}

}
module.exports =
{
  fetcher:require("../libpoketube/libpoketube-fetcher.js"),
  core:require("../libpoketube/libpoketube-core.js"),
  musicInfo:require("music-info"),
  wiki:require("wikipedia"),
  initlog,
  init,
  version:"libpoketube-3.0-git-IcHi",
  modules:{
    fetch:require("node-fetch"),
    toJson:require("xml2json").toJson,
    express:require("express"),
    useragent:require("express-useragent"),
    path:require("path"),
    hash:require("js-sha512").sha384,
    moment:require("moment"),
    getColors:require("get-image-colors"),
  }
}
