/**
 * Poke is a Free/Libre youtube front-end !
 *
 * This file is Licensed under LGPL-3.0-or-later. Poketube itself is GPL, Only this file is LGPL.
 * See a copy here: https://www.gnu.org/licenses/lgpl-3.0.txt
 * Please don't remove this comment while sharing this code.
 */

const { toJson } = require("xml2json");
const { curly } = require("node-libcurl");
const getdislikes = require("../libpoketube/libpoketube-dislikes.js");
const getColors = require("get-image-colors");
const config = require("../../config.json");
const { Innertube } = require("youtubei.js");

class InnerTubePokeVidious {
  constructor(config) {
    this.config = config;
    this.cache = {};
    this.language = "hl=en-US";
    this.region = "region=US";
    this.sqp = "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";
    this.useragent = config.useragent ||
      "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.youtubeClient = null;
  }

  async _initYouTube() {
    if (!this.youtubeClient) {
      this.youtubeClient = await Innertube.create({
        lang: this.language.split("=")[1],   // "en-US"
        location: this.region.split("=")[1], // "US"
      });
    }
    return this.youtubeClient;
  }

  // Helper to map thumbnails to {url,width,height}
  _mapThumbnails(thumbnails) {
    return thumbnails.map((t) => ({
      url: t.url,
      width: t.width,
      height: t.height,
    }));
  }

  // The one unified method
  async getYouTubeApiVideo(f, videoId, contentlang, contentregion) {
    if (!videoId) return { error: "Gib ID" };

    // cache for 1h
    if (this.cache[videoId] &&
        Date.now() - this.cache[videoId].timestamp < 3_600_000) {
      return this.cache[videoId].result;
    }

    const headers = { "User-Agent": this.useragent };
    const youtube = await this._initYouTube();

    try {
      // fetch:
      const [ commentsData, info, legacy ] = await Promise.all([
        youtube.getComments(videoId),     // raw comments from yt
        youtube.getInfo(videoId),         // raw info from yt
        curly.get(`${this.config.tubeApi}video?v=${videoId}`, {
          httpHeader: Object.entries(headers).map(([k,v]) => `${k}: ${v}`)
        }).then(res => {
          const json = toJson(res.data);
          return { json: JSON.parse(json), video: JSON.parse(json).video };
        }),
      ]);

      // Invidious-style JSON:
      const vid = info;
      const resp = {
        type: vid.type,
        title: vid.title,
        videoId: vid.id,
        error: vid.info?.reason || null,

        videoThumbnails: this._mapThumbnails(vid.thumbnails),
        storyboards: vid.storyboards?.map(sb => ({
          url: sb.url,
          width: sb.width,
          height: sb.height,
          mime: sb.mimeType
        })),

        description: vid.description,
        descriptionHtml: vid.descriptionRenderers?.description,
        published: Math.floor(new Date(vid.uploadDate).getTime() / 1000),
        publishedText: vid.publishedText,
        keywords: vid.keywords,

        viewCount: vid.viewCount,
        likeCount: vid.likes,
        dislikeCount: 0,

        paid: vid.isPaid,
        premium: vid.isPremium,
        isFamilyFriendly: vid.isFamilySafe,
        allowedRegions: vid.availableCountries,
        genre: vid.genre,
        genreUrl: vid.genreUrl,

        author: vid.author,
        authorId: vid.channelId,
        authorUrl: `/channel/${vid.channelId}`,
        authorVerified: vid.isVerified,
        authorThumbnails: this._mapThumbnails(vid.authorThumbnails),
        subCountText: vid.subscriberCountText,

        lengthSeconds: vid.lengthSeconds,
        allowRatings: vid.isRatingsEnabled,
        rating: 0,
        isListed: !vid.isUnlisted,
        liveNow: vid.isLive,
        isPostLiveDvr: vid.isPostLiveDvr,
        isUpcoming: vid.upcoming,

        premiereTimestamp: vid.premiereTimestamp
          ? Math.floor(new Date(vid.premiereTimestamp).getTime() / 1000)
          : null,

        // keep legacy fields too:
        json: legacy.json,
        video: legacy.video,
        comments: commentsData,
        engagement: (await getdislikes(videoId)).engagement,
        wiki: "",
        channel_uploads: f === "true"
          ? (await fetch(`${this.config.invapi}/channels/${vid.channelId}?hl=${contentlang}&region=${contentregion}`, { headers }))
              .then(r => r.json())
          : {}
      };

      this.cache[videoId] = { result: resp, timestamp: Date.now() };
      return resp;

    } catch (err) {
      console.error("[LIBPT CORE ERROR] Error getting video", err);
      return { error: err.message };
    }
  }
}

module.exports = new InnerTubePokeVidious({
  tubeApi:   "https://inner-api.poketube.fun/api/",
  invapi:    "https://invid-api.poketube.fun/bHj665PpYhUdPWuKPfZuQGoX/api/v1",
  invapi_alt: config.proxylocation === "EU"
    ? "https://invid-api.poketube.fun/api/v1"
    : "https://iv.ggtyler.dev/api/v1",
  dislikes:  "https://returnyoutubedislikeapi.com/votes?videoId=",
  t_url:     "https://t.poketube.fun/",
  useragent: config.useragent,
});
