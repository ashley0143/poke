/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2022 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function convert(value) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
  }).format(value);
}

function getFirstLine(text) {
  var index = text.indexOf("<br> ");
  if (index === -1) index = undefined;
  return text.substring(0, index);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function turntomins(time) {
  var minutes = Math.floor(time / 60);

  var seconds = time - minutes * 60;

  function str_pad_left(string, pad, length) {
    return (new Array(length + 1).join(pad) + string).slice(-length);
  }

  var finalTime =
    str_pad_left(minutes, "0", 2) + ":" + str_pad_left(seconds, "0", 2);

  return finalTime;
};


module.exports = {
IsJsonString,
convert,
getFirstLine,
capitalizeFirstLetter,
turntomins
};