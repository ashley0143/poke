const fetch = require("node-fetch"); 
const xmltojson = require("xml2json")
const url = require("../config.json")

class PoketubeChannelManager{
  static async GetBasicChannelInfo(CHANNEL_ID){
    const channel = await fetch(url.poketube_api + `/channel?id=${CHANNEL_ID}`)
     var text = await channel.text();var json = xmltojson.toJson(text);let Channel = JSON.parse(json);
     const channelObjectString = {
       channelId:Channel.Channel.id,
       name:Channel.Channel.Metadata.name,
       subCount:Channel.Channel.Metadata.Subscribers
     }
    return channelObjectString
  }
  static async GetChannelBanner(CHANNEL_ID){
        const channel = await fetch(url.poketube_api + `/channel?id=${CHANNEL_ID}`)
        var text = await channel.text();var json = xmltojson.toJson(text);let Channel = JSON.parse(json);
        const ChannelBannerString = {
        Banners:Channel.Channel.Metadata.Banners.Thumbnail[1].$t
        }
        return ChannelBannerString
  }
    static async GetChannelAvatar(CHANNEL_ID){
        const channel = await fetch(url.poketube_api + `/channel?id=${CHANNEL_ID}`)
        var text = await channel.text();var json = xmltojson.toJson(text);let Channel = JSON.parse(json);
        const ChannelAvatarString = {
         Avatar:Channel.Channel.Metadata.Avatars.Thumbnail.$t
        }
        return ChannelAvatarString
  }
      static async GetChannelUploads(CHANNEL_ID){
        const channel = await fetch(url.poketube_api + `/channel?id=${CHANNEL_ID}`)
        var text = await channel.text();var json = xmltojson.toJson(text);let Channel = JSON.parse(json);
        const ChannelUploadString = {
         Avatar:Channel.Channel.Contents.ItemSection.toString()
        }
  }
}
module.exports = PoketubeChannelManager
