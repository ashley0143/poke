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
  { uri: "https://invidious.projectsegfau.lt" },
  { uri: "https://iv.ggtyler.dev" },
  { uri: "https://invidious.protokolla.fi" },
  { uri: "https://inv.zzls.xyz" },
  { uri: "https://invidious.fdn.fr" },
  { uri: "https://anontube.lvkaszus.pl" },
  { uri: "https://iv.datura.network" },
  { uri: "https://yt.drgnz.club" },
  { uri: "https://invidious.private.coffee" },
  { uri: "https://inv.tux.pizza" },
  { uri: "https://invidious.lunar.icu" },
  { uri: "https://yt.artemislena.eu" },
];

// Gets a random instance from the list
const instance = invInstanceList[Math.floor(Math.random() * invInstanceList.length)];

let url;
if (instance.uri.startsWith("https://")) {
  url = instance.uri;
} else {
  url = "https://tube.kuylar.dev";
}

const isInvidiousURL = url === "https://tube.kuylar.dev" ? false : true;

const videoProxyObject = {
  isInvidiousURL,
  cacheBuster: "d0550b6e28c8f93533a569c314d5b4e2",
  InvidiousPoketube: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
  url: url, // set for now: see https://github.com/iv-org/invidious/issues/4045
};

module.exports = async function (video_id) {
  return videoProxyObject;
};
