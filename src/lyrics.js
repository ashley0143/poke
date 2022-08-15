const fetch = require("node-fetch");

async function main(e = "", d = "") {
  const lyrics = await fetch(
    `https://p.poketube.fun/api/lyrics?query=${e}`
  ).then((res) => res.json());
  
   if (lyrics == undefined) lyrics = "Lyrics not found";
  if (lyrics != undefined) {
    return lyrics;
  }
}

module.exports = main;
