/*
    WARNING:THIS FILE IS STILL ON WIP
    Copyright (C) 2021-2022 POKETUBE CONTRUBUTORS (https://github.com/iamashley0/poketube)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see https://www.gnu.org/licenses/.
  */
 
const fetch = require("node-fetch"); //2.5.x
const lyricsFinder = require("lyrics-finder");
var youtube_url = `https://www.youtube.com/watch?v=`;
var dislike_api = `https://returnyoutubedislikeapi.com/votes?videoId=`
var proxy = `https://yt-proxy-api.herokuapp.com/get_player_info?v=`

module.exports = async function(video_id){
  
  const pro = await fetch(`${proxy}${video_id}`).then((res) => res.json());
  const dislike = await fetch(`${dislike_api}${video_id}`).then((res) => res.json());
  const dislikes = dislike.dislikes
  
   
  if(pro.formats[1].url){
    var url = pro.formats[1].url
   } else if(!pro.formats[1].url){
    var s = pro.formats
    const lastItem = s[s.length - 1];
    var url = lastItem.url
   }
  
  /*
  * Returner
  */
  const returner = {
    video:pro,
    dislikes:dislikes,
    likes:dislike.likes,
    video_downloaded_url:url,
    video_url_youtube:`${youtube_url}${video_id}`,
   }
  
  return returner
}
