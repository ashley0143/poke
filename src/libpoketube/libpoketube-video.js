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

  try {
    // gets invidious instances
    const invUrl = "https://api.invidious.io/instances.json?sort_by=type,health";
    const invInstanceList = await modules
      .fetch(invUrl)
      .then((res) => res.text())
      .then((json) => JSON.parse(json));

    // gets random instances from the list
    const instance = invInstanceList[Math.floor(Math.random() * invInstanceList.length)];

    let url;
    if (instance[1].type != "https") {
      url = "https://invidious.weblibre.org";
    } else {
      url = instance[1].uri
        .replace("invidious.tiekoetter.com", "invidious.weblibre.org")
        .replace("yewtu.be", "invidious.sethforprivacy.com")
        .replace("invidious.slipfox.xyz", "invidious.weblibre.org")
        .replace("vid.priv.au", "inv.vern.cc")
        .replace("invidious.snopyta.org", "invidious.sethforprivacy.com");
    }

    return url;
  } catch (error) {
    console.error("Failed to get Invidious instance:", error);
    return " ";
  }
};
