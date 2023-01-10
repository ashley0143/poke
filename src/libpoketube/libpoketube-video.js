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
  var url;

  function toObject(arr) {
    var rv = {};
    for (var i = 0; i < arr.length; ++i)
      if (arr[i] !== undefined) rv[i] = arr[i];
    return rv;
  }

  // gets invidious instances
  let inv_url = "https://api.invidious.io/instances.json?sort_by=type,health";

  let inv_instance_list = await modules
    .fetch(inv_url)
    .then((res) => res.text())
    .then((json) => JSON.parse(json));

  // gets random instances from the list
  const instance = await inv_instance_list[
    Math.floor(Math.random() * inv_instance_list.length)
  ];

  const stringed = toObject(instance);

  if (stringed[1].type != "https") {
    url = "https://vid.puffyan.us";
  } else {
    url = stringed[1].uri;
  }

  if (stringed[1].uri == "https://inv.vern.cc") url = "https://vid.puffyan.us";

  return url;
};
