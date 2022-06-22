const fetch = require("node-fetch"); 
const xmltojson = require("xml2json")
const url = require("../config.json")

class Search{
  static async SearchVideo(query){
    const search = await fetch(`https://tube.kuylar.dev/api/search?query=${query}`)
    const text =  await search.text()
   const j = JSON.parse(xmltojson.toJson(text));
     for (item of j.Search.Results.Video)  {
       const videoid = item;
       return item;
    }
  }
}

module.exports = Search
