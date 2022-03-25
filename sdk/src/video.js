
const fetch = require("node-fetch"); 
const xmltojson = require("xml2json")
const url = require("../config.json")

class videoFetchManager{
 static async getVideoJsonByID(ID){
    const player = await fetch(url.poketube_api + `/player?v=${ID}`)
    var text = await player.text();var json = xmltojson.toJson(text);let parser = JSON.parse(json);
    return parser
} 
  static async getEngagementByID(ID){
        const engagement = await fetch(url.dislike_api + `${ID}`) 
        const returner = {
          likes:engagement.likes.toLocaleString(),
          dislikes:engagement.dislikes.toLocaleString(),
          viewCount:engagement.viewCount.toLocaleString()
        }
        return returner
  }
  static async downloadVideo(ID){
    const player = await fetch(url.poketube_api + `/player?v=${ID}`)
    var text = await player.text();
    var json = xmltojson.toJson(text);
    let parser = JSON.parse(json);
    const fetching = parser
    var j = fetching.Player.Formats.Format
     if(j[1].URL){
    var url = j[1].URL
   } else if(j[1].URL){
    var s = j.formats
    const lastItem = s[s.length - 1];
    var url = lastItem.URL
   }
    return url
  }
}

module.exports = videoFetchManager
