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
    url = "https://y.com.sb";
  } else {
    //replaces bad proxys (e.g the proxys that do not support media proxys, or the proxys that are down )
    url = instance[1].uri
      .replace("invidious.tiekoetter.com", "inv.odyssey346.dev")
      .replace("invidious.slipfox.xyz", "y.com.sb")
      .replace("yewtu.be", "y.com.sb")
      .replace("iv.melmac.space", "inv.vern.cc")
      .replace("yt.oelrichsgarcia.de", "y.com.sb")
      .replace("yt.funami.tech", "y.com.sb")
      .replace("invidious.lidarshield.cloud", "inv.odyssey346.dev")
      .replace("vid.priv.au", "inv.vern.cc")
      .replace("invidious.privacydev.net", "inv.vern.cc")
      .replace("watch.thekitty.zone", "y.com.sb")
      .replace("invidious.snopyta.org", "inv.odyssey346.dev")
      .replace("invidious.weblibre.org", "y.com.sb")
      .replace("invidious.sethforprivacy.com", "y.com.sb")
  }

  return url;
};
