/*

    PokeTube is a Free/Libre youtube front-end !
    
    Copyright (C) 2021-2022 POKETUBE
 
    This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
    
    see a copy here:https://www.gnu.org/licenses/lgpl-3.0.txt
    
    please dont remove this comment while sharing this code 
    
  */

module.exports =
{
  fetcher:require("../libpoketube/libpoketube-fetcher.js"),
  core:require("../libpoketube/libpoketube-core.js"),
  musicInfo:require("music-info"),
  wiki:require("wikipedia"),
  version:"libpoketube-1.1-git"
}