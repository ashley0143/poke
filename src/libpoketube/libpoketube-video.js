/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2023 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
*/

const {
  fetcher,
  core,
  wiki,
  musicInfo,
  modules,
  version,
  initlog,
  init,
} = require("./libpoketube-initsys.js");

const {
  IsJsonString,
  convert,
  getFirstLine,
  capitalizeFirstLetter,
  turntomins,
  getRandomInt,
  getRandomArbitrary,
} = require("./ptutils/libpt-coreutils.js");

module.exports = async function (video_id) {
  // function to convert an array to an object, ignoring undefined values
  function toObject(arr) {
    return arr.reduce((acc, cur, i) => {
      if (cur !== undefined) {
        acc[i] = cur;
      }
      return acc;
    }, {});
  }

  // gets invidious instances
  const invInstanceList = require("./invapi.json");

  // gets random instances from the list
  const instance =
    invInstanceList[Math.floor(Math.random() * invInstanceList.length)];

  let url;
  if (instance[1].type != "https") {
    url = "https://invidious.sethforprivacy.com";
  } else {
    url = instance[1].uri
      .replace("invidious.tiekoetter.com", "invidious.sethforprivacy.com")
      .replace("yewtu.be", "invidious.sethforprivacy.com")
      .replace("invidious.slipfox.xyz", "invidious.sethforprivacy.com")
      .replace("vid.priv.au", "inv.vern.cc")
      .replace("invidious.snopyta.org", "invidious.sethforprivacy.com")
      .replace("invidious.weblibre.org", "invidious.sethforprivacy.com");
  }

  return url;
};
