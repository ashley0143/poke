/*

  PokeTube is a Free/Libre YouTube front-end !
  
  Copyright (C) 2021-2023 POKETUBE

  This file is Licensed under LGPL-3.0-or-later. PokeTube itself is GPL, Only this file is LGPL.

  See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt

  Please don't remove this comment while sharing this code

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

// Function to convert an array to an object, ignoring undefined values
function toObject(arr) {
  return arr.reduce((acc, cur, i) => {
    if (cur !== undefined) {
      acc[i] = cur;
    }
    return acc;
  }, {});
}

// Gets Invidious instances
const invInstanceList = [
  "https://tube.kuylar.dev"
];

// Gets a random instance from the list
const instance =
  invInstanceList[Math.floor(Math.random() * invInstanceList.length)];

let url;
if (instance.startsWith("https://")) {
  url = instance;
} else {
  url = "https://tube.kuylar.dev";
}

const isInvidiousURL = url === "https://tube.kuylar.dev" ? false : true;

const videoProxyObject = {
  isInvidiousURL,
  cacheBuster: "d0550b6e28c8f93533a569c314d5b4e2",
  InvidiousPoketube: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
  url: url,  
  losslessurl: "https://lossless-proxy.poketube.fun"
};

module.exports = async function (video_id) {
  return videoProxyObject;
};
