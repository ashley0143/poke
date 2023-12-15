use std::time::Duration;

use actix_web::web::Bytes;
use actix_web::{web::Query, HttpResponse, Responder};
use serde::Deserialize;

use crate::util::request::{fetch, get_bytes};
use crate::util::result::Error;

lazy_static! {
    static ref CACHE: moka::future::Cache<String, Result<Bytes, Error>> =
        moka::future::Cache::builder()
            .weigher(|_key, value: &Result<Bytes, Error>| {
                value.as_ref().map(|bytes| bytes.len() as u32).unwrap_or(1)
            })
            .max_capacity(1024 * 1024 * 1024)
            .time_to_live(Duration::from_secs(60))
            .build();
}

#[derive(Deserialize)]
pub struct Parameters {
    url: String,
}

async fn proxy(url: String) -> Result<Bytes, Error> {
    let (mut resp, mime) = fetch(&url).await?;

    if matches!(mime.type_(), mime::IMAGE | mime::VIDEO) {
        let bytes = get_bytes(&mut resp).await?;
        Ok(bytes)
    } else {
        Err(Error::NotAllowedToProxy)
    }
}

pub async fn get(Query(info): Query<Parameters>) -> Result<impl Responder, Error> {
    let url = info.url;
    let result = CACHE
        .get_with(url.clone(), async { proxy(url).await })
        .await;
    result.map(|b| HttpResponse::Ok().body(b))
}
