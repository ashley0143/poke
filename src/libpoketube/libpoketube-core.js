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

class LRU {
  constructor(max = 5000) {
    this.max = max;
    this.map = new Map();
  }
  get(k) {
    if (!this.map.has(k)) return;
    const v = this.map.get(k);
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }
  set(k, v) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
  has(k) { return this.map.has(k); }
}

class InnerTubePokeVidious {
  constructor(cfg) {
    this.config = cfg;
    this.cache = new LRU(5000);
    this.language = "hl=en-US";
    this.param = "2AMB";
    this.param_legacy = "CgIIAdgDAQ%3D%3D";
    this.apikey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    this.ANDROID_API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
    this.ANDROID_APP_VERSION = "20.20.41";
    this.ANDROID_VERSION = "16";
    this.useragent = cfg.useragent || "PokeTube/2.0.0 (GNU/Linux; Android 14; Trisquel 11; poketube-vidious; like FreeTube)";
    this.INNERTUBE_CONTEXT_CLIENT_VERSION = "1";
    this.region = "region=US";
    this.sqp = "-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLBy_x4UUHLNDZtJtH0PXeQGoRFTgw";
    this.hedge = true;
    this.debugErrors = !!cfg.debugErrors || process.env.POKETUBE_DEBUG_ERRORS === "1";
  }

  // ---------- Utilities ----------
  getJson(s) { try { return JSON.parse(s); } catch { return null; } }
  checkUnexistingObject(o) { return o && "authorId" in o; }
  wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  backoff(attempt, base = 160, cap = 12000) {
    const exp = Math.min(cap, base * Math.pow(2, attempt));
    const jit = Math.floor(Math.random() * (base + 1));
    return Math.min(cap, exp + jit);
  }
  shouldRetryStatus(st) {
    if (!st) return true;
    if (st === 408 || st === 425 || st === 429) return true;
    if (st >= 500 && st <= 599) return true;
    return false;
  }
  parseRetryAfter(v) {
    if (!v) return null;
    const secs = Number(v);
    if (!Number.isNaN(secs)) return Math.max(0, secs * 1000);
    const dt = Date.parse(v);
    if (!Number.isNaN(dt)) return Math.max(0, dt - Date.now());
    return null;
  }
  nowIso() { return new Date().toISOString(); }
  newRequestId() { return Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64url"); }

  buildFriendlyMessage(reason, videoId) {
    const prefix = "Sorry nya, we couldn't find any information about that video qwq.";
    const common = " If this keeps happening, please try again later or check the video link.";
    switch (reason) {
      case "invalid_video_id":
        return `Sorry nya, that doesn't look like a valid YouTube video ID (needs 11 letters/numbers). qwq Please double-check the link.${common}`;
      case "not_found_or_unparsable":
        return `Sorry nya, we couldn't load details for this video right now. qwq It may be unavailable or upstream returned something we couldn't read.${common}`;
      case "missing_author":
        return `Sorry nya, this video's channel info was missing so we couldn't finish loading it. qwq${common}`;
      case "upstream_http_error":
        return `Sorry nya, an upstream service returned an error while fetching this video. qwq${common}`;
      case "upstream_timeout":
        return `Sorry nya, the request took too long and timed out while getting video info. qwq${common}`;
      case "aborted":
        return `Sorry nya, the request was canceled before we finished. qwq${common}`;
      case "internal_error":
      default:
        return `Sorry nya, something went wrong while loading this video. qwq Our bad!${common}`;
    }
  }

  buildError({ reason, status, url, videoId, requestId, retryAfterMs, originalError, meta }) {
    const retryable = this.shouldRetryStatus(status) || reason === "upstream_timeout";
    const message = this.buildFriendlyMessage(reason, videoId);
    const err = {
