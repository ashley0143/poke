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

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
IsJsonString,
convert,
getFirstLine,
getRandomArbitrary,
getRandomInt,
capitalizeFirstLetter,
turntomins
};