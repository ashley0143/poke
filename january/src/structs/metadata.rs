use regex::Regex;
use reqwest::Response;
use scraper::Selector;
use serde::Serialize;
use std::collections::HashMap;
use validator::Validate;

use crate::{
    structs::special::{BandcampType, LightspeedType, TwitchType},
    util::{
        request::{consume_fragment, consume_size, fetch},
        result::Error,
    },
};

use super::{
    media::{Image, ImageSize, Video},
    special::Special,
};

#[derive(Clone, Validate, Debug, Serialize)]
pub struct Metadata {
    #[validate(length(min = 1, max = 256))]
    url: String,
    original_url: String,
    special: Option<Special>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate(length(min = 1, max = 100))]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate(length(min = 0, max = 2000))]
    description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate]
    image: Option<Image>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate]
    video: Option<Video>,

    #[serde(skip_serializing_if = "Option::is_none")]
    opengraph_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate(length(min = 1, max = 100))]
    site_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate(length(min = 1, max = 256))]
    icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[validate(length(min = 1, max = 64))]
    colour: Option<String>,
}

impl Metadata {
    pub async fn from(resp: Response, original_url: String) -> Result<Metadata, Error> {
        let fragment = consume_fragment(resp).await?;

        let meta_selector = Selector::parse("meta").map_err(|_| Error::MetaSelectionFailed)?;
        let mut meta = HashMap::new();
        for el in fragment.select(&meta_selector) {
            let node = el.value();

            if let (Some(property), Some(content)) = (
                node.attr("property").or_else(|| node.attr("name")),
                node.attr("content"),
            ) {
                meta.insert(property.to_string(), content.to_string());
            }
        }

        let link_selector = Selector::parse("link").map_err(|_| Error::MetaSelectionFailed)?;
        let mut link = HashMap::new();
        for el in fragment.select(&link_selector) {
            let node = el.value();

            if let (Some(property), Some(content)) = (node.attr("rel"), node.attr("href")) {
                link.insert(property.to_string(), content.to_string());
            }
        }

        let metadata = Metadata {
            title: meta
                .remove("og:title")
                .or_else(|| meta.remove("twitter:title"))
                .or_else(|| meta.remove("title")),
            description: meta
                .remove("og:description")
                .or_else(|| meta.remove("twitter:description"))
                .or_else(|| meta.remove("description")),
            image: meta
                .remove("og:image")
                .or_else(|| meta.remove("og:image:secure_url"))
                .or_else(|| meta.remove("twitter:image"))
                .or_else(|| meta.remove("twitter:image:src"))
                .map(|mut url| {
                    // If relative URL, prepend root URL. Also if root URL ends with a slash, remove it.
                    if let Some(ch) = url.chars().next() {
                        if ch == '/' {
                            url = format!("{}{}", &original_url.trim_end_matches('/'), &url);
                        }
                    }
                    let mut size = ImageSize::Preview;
                    if let Some(card) = meta.remove("twitter:card") {
                        if &card == "summary_large_image" {
                            size = ImageSize::Large;
                        }
                    }
                    Image {
                        url,
                        width: meta
                            .remove("og:image:width")
                            .unwrap_or_else(|| "0".to_string())
                            .parse()
                            .unwrap_or(0),
                        height: meta
                            .remove("og:image:height")
                            .unwrap_or_else(|| "0".to_string())
                            .parse()
                            .unwrap_or(0),
                        size,
                    }
                }),
            video: meta
                .remove("og:video")
                .or_else(|| meta.remove("og:video:url"))
                .or_else(|| meta.remove("og:video:secure_url"))
                .map(|mut url| {
                    // If relative URL, prepend root URL. Also if root URL ends with a slash, remove it.
                    if let Some(ch) = url.chars().next() {
                        if ch == '/' {
                            url = format!("{}{}", &original_url.trim_end_matches('/'), &url);
                        }
                    }
                    Video {
                        url,
                        width: meta
                            .remove("og:video:width")
                            .unwrap_or_else(|| "0".to_string())
                            .parse()
                            .unwrap_or(0),
                        height: meta
                            .remove("og:video:height")
                            .unwrap_or_else(|| "0".to_string())
                            .parse()
                            .unwrap_or(0),
                    }
                }),
            icon_url: link
                .remove("apple-touch-icon")
                .or_else(|| link.remove("icon"))
                .map(|mut v| {
                    // If relative URL, prepend root URL.
                    if let Some(ch) = v.chars().next() {
                        if ch == '/' {
                            v = format!("{}{}", &original_url.trim_end_matches('/'), v);
                        }
                    }

                    v
                }),
            colour: meta.remove("theme-color"),
            opengraph_type: meta.remove("og:type"),
            site_name: meta.remove("og:site_name"),
            url: meta
                .remove("og:url")
                .unwrap_or_else(|| original_url.clone()),
            original_url,
            special: None,
        };

        metadata
            .validate()
            .map_err(|error| Error::FailedValidation { error })?;

        Ok(metadata)
    }

    async fn resolve_image(&mut self) -> Result<(), Error> {
        if let Some(image) = &mut self.image {
            // If image WxH was already provided by OpenGraph,
            // just return that instead.
            if image.width != 0 && image.height != 0 {
                return Ok(());
            }

            let (resp, mime) = fetch(&image.url).await?;
            let (width, height) = consume_size(resp, mime).await?;

            image.width = width;
            image.height = height;
        }

        Ok(())
    }

    pub async fn generate_special(&mut self) -> Result<Special, Error> {
        lazy_static! {
            // ! FIXME: use youtube-dl to fetch metadata
            static ref RE_YOUTUBE: Regex = Regex::new("^(?:(?:https?:)?//)?(?:(?:www|m)\\.)?(?:(?:youtube\\.com|youtu.be))(?:/(?:[\\w\\-]+\\?v=|embed/|v/)?)([\\w\\-]+)(?:\\S+)?$").unwrap();

            static ref RE_LIGHTSPEED: Regex = Regex::new("^(?:https?://)?(?:[\\w]+\\.)?lightspeed\\.tv/([a-z0-9_]{4,25})").unwrap();

            // ! FIXME: use Twitch API to fetch metadata
            static ref RE_TWITCH: Regex = Regex::new("^(?:https?://)?(?:www\\.|go\\.)?twitch\\.tv/([a-z0-9_]+)($|\\?)").unwrap();
            static ref RE_TWITCH_VOD: Regex = Regex::new("^(?:https?://)?(?:www\\.|go\\.)?twitch\\.tv/videos/([0-9]+)($|\\?)").unwrap();
            static ref RE_TWITCH_CLIP: Regex = Regex::new("^(?:https?://)?(?:www\\.|go\\.)?twitch\\.tv/(?:[a-z0-9_]+)/clip/([A-z0-9_-]+)($|\\?)").unwrap();

            static ref RE_SPOTIFY: Regex = Regex::new("^(?:https?://)?open.spotify.com/(track|user|artist|album|playlist)/([A-z0-9]+)").unwrap();
            static ref RE_SOUNDCLOUD: Regex = Regex::new("^(?:https?://)?soundcloud.com/([a-zA-Z0-9-]+)/([A-z0-9-]+)").unwrap();
            static ref RE_BANDCAMP: Regex = Regex::new("^(?:https?://)?(?:[A-z0-9_-]+).bandcamp.com/(track|album)/([A-z0-9_-]+)").unwrap();

            static ref RE_STREAMABLE: Regex = Regex::new("^(?:https?://)?(?:www\\.)?streamable\\.com/([\\w\\d-]+)").unwrap();

            static ref RE_GIF: Regex = Regex::new("^(?:https?://)?(www\\.)?(gifbox\\.me/view|yiffbox\\.me/view|tenor\\.com/view|giphy\\.com/gifs|gfycat\\.com|redgifs\\.com/watch)/[\\w\\d-]+").unwrap();
        }

        if let Some(captures) = RE_STREAMABLE.captures_iter(&self.url).next() {
            return Ok(Special::Streamable {
                id: captures[1].to_string(),
            });
        } else if let Some(captures) = RE_YOUTUBE.captures_iter(&self.url).next() {
            lazy_static! {
                static ref RE_TIMESTAMP: Regex =
                    Regex::new("(?:\\?|&)(?:t|start)=([\\w]+)").unwrap();
            }

            if let Some(video) = &self.video {
                if let Some(timestamp_captures) = RE_TIMESTAMP.captures_iter(&video.url).next() {
                    return Ok(Special::YouTube {
                        id: captures[1].to_string(),
                        timestamp: Some(timestamp_captures[1].to_string()),
                    });
                }

                return Ok(Special::YouTube {
                    id: captures[1].to_string(),
                    timestamp: None,
                });
            }
        } else if let Some(captures) = RE_LIGHTSPEED.captures_iter(&self.original_url).next() {
            return Ok(Special::Lightspeed {
                id: captures[1].to_string(),
                content_type: LightspeedType::Channel,
            });
        } else if let Some(captures) = RE_TWITCH.captures_iter(&self.original_url).next() {
            return Ok(Special::Twitch {
                id: captures[1].to_string(),
                content_type: TwitchType::Channel,
            });
        } else if let Some(captures) = RE_TWITCH_VOD.captures_iter(&self.original_url).next() {
            return Ok(Special::Twitch {
                id: captures[1].to_string(),
                content_type: TwitchType::Video,
            });
        } else if let Some(captures) = RE_TWITCH_CLIP.captures_iter(&self.original_url).next() {
            return Ok(Special::Twitch {
                id: captures[1].to_string(),
                content_type: TwitchType::Clip,
            });
        } else if let Some(captures) = RE_SPOTIFY.captures_iter(&self.original_url).next() {
            return Ok(Special::Spotify {
                content_type: captures[1].to_string(),
                id: captures[2].to_string(),
            });
        } else if RE_SOUNDCLOUD.is_match(&self.original_url) {
            return Ok(Special::Soundcloud);
        } else if RE_BANDCAMP.is_match(&self.original_url) {
            lazy_static! {
                static ref RE_TRACK: Regex = Regex::new("track=(\\d+)").unwrap();
                static ref RE_ALBUM: Regex = Regex::new("album=(\\d+)").unwrap();
            }

            if let Some(video) = &self.video {
                if let Some(captures) = RE_TRACK.captures_iter(&video.url).next() {
                    return Ok(Special::Bandcamp {
                        content_type: BandcampType::Track,
                        id: captures[1].to_string(),
                    });
                }

                if let Some(captures) = RE_ALBUM.captures_iter(&video.url).next() {
                    return Ok(Special::Bandcamp {
                        content_type: BandcampType::Album,
                        id: captures[1].to_string(),
                    });
                }
            }
        } else if RE_GIF.is_match(&self.original_url) {
            return Ok(Special::GIF);
        }

        Ok(Special::None)
    }

    pub async fn resolve_external(&mut self) {
        if let Ok(special) = self.generate_special().await {
            match &special {
                Special::YouTube { .. } => self.colour = Some("#FF424F".to_string()),
                Special::Twitch { .. } => self.colour = Some("#7B68EE".to_string()),
                Special::Lightspeed { .. } => self.colour = Some("#7445D9".to_string()),
                Special::Spotify { .. } => self.colour = Some("#1ABC9C".to_string()),
                Special::Soundcloud { .. } => self.colour = Some("#FF7F50".to_string()),
                _ => {}
            }

            self.special = Some(special);
        }

        if self.resolve_image().await.is_err() {
            self.image = None;
        }
    }

    pub fn is_none(&self) -> bool {
        self.title.is_none()
            && self.description.is_none()
            && self.image.is_none()
            && self.video.is_none()
    }
}
