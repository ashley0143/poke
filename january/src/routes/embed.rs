use std::time::Duration;

use actix_web::{
    web::{self, Query},
    Responder,
};
use regex::Regex;
use serde::Deserialize;

use crate::structs::metadata::Metadata;
use crate::structs::{embed::Embed, media::Video};
use crate::util::request::fetch;
use crate::{
    structs::media::{Image, ImageSize},
    util::{request::consume_size, result::Error},
};

lazy_static! {
    static ref CACHE: moka::future::Cache<String, Result<Embed, Error>> =
        moka::future::Cache::builder()
            .max_capacity(1_000)
            .time_to_live(Duration::from_secs(60))
            .build();
}

#[derive(Deserialize)]
pub struct Parameters {
    url: String,
}

async fn embed(mut url: String) -> Result<Embed, Error> {
    // Twitter is a piece of shit and does not
    // provide metadata in an easily consumable format.
    //
    // So... we just redirect everything to Nitter.
    //
    // Fun bonus: Twitter denied our developer application
    // which would've been the only way to pull properly
    // formatted Tweet data out and what's worse is that this
    // also prevents us adding those "connections" that other
    // platforms have.
    //
    // In any case, because Twitter, they
    // do not provide OpenGraph data.
    lazy_static! {
        static ref RE_TWITTER: Regex =
            Regex::new("^(?:https?://)?(?:www\\.)?twitter\\.com").unwrap();
    }

    if RE_TWITTER.is_match(&url) {
        url = RE_TWITTER.replace(&url, "https://nitter.net").into();
    }

    // Fetch URL
    let (resp, mime) = fetch(&url).await?;

    // Match appropriate MIME type to process
    match (mime.type_(), mime.subtype()) {
        (_, mime::HTML) => {
            let mut metadata = Metadata::from(resp, url).await?;
            metadata.resolve_external().await;

            if metadata.is_none() {
                return Ok(Embed::None);
            }

            Ok(Embed::Website(metadata))
        }
        (mime::IMAGE, _) => {
            if let Ok((width, height)) = consume_size(resp, mime).await {
                Ok(Embed::Image(Image {
                    url,
                    width,
                    height,
                    size: ImageSize::Large,
                }))
            } else {
                Ok(Embed::None)
            }
        }
        (mime::VIDEO, _) => {
            if let Ok((width, height)) = consume_size(resp, mime).await {
                Ok(Embed::Video(Video { url, width, height }))
            } else {
                Ok(Embed::None)
            }
        }
        _ => Ok(Embed::None),
    }
}

pub async fn get(Query(info): Query<Parameters>) -> Result<impl Responder, Error> {
    let url = info.url;
    let result = CACHE
        .get_with(url.clone(), async { embed(url).await })
        .await;
    result.map(web::Json)
}
