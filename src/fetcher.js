/*
  
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
const xmltojson = require("xml2json")
const lyricsFinder = require("../src/lyrics.js");
var youtube_url = `https://www.youtube.com/watch?v=`;
var dislike_api = `https://returnyoutubedislikeapi.com/votes?videoId=`
var new_api_url = `https://lighttube.herokuapp.com/api/player`

module.exports = async function(video_id){
const dislike = await fetch(`${dislike_api}${video_id}`).then((res) => res.json());
  const dislikes = dislike.dislikes
 /*
  functions to fetch xml
*/
   async function fetchxml(id){
  const player = await fetch(`https://lighttube.herokuapp.com/api/player?v=${id}`)
  return player.text()
  } 
    
 async function parsexml(id){
  var h = await fetchxml(id) 
  var j = xmltojson.toJson(h);
  return JSON.parse(j);
  }


  /*
  * Returner object
  */
  const returner = {
    video:await parsexml(video_id),
    engagement:dislike,
    video_url_youtube:`${youtube_url}${video_id}`
   }
   return returner
 }

module.exports.searcher = async function searcher(query,res){
   const search = await fetch(`https://lighttube.herokuapp.com/api/search?query=${query}`)
    const text =  await search.text()
   const j = JSON.parse(xmltojson.toJson(text));
     for (item of j.Search.Results.Video)  {
       const videoid = item.id;
      return res.redirect(`/watch?v=${videoid}`);
    }
  }
 
