use std::time::Duration;

use actix_web::web::Bytes;
use encoding_rs::{Encoding, UTF_8_INIT};
use mime::Mime;
use reqwest::{
    header::{self, CONTENT_TYPE},
    Client, Response,
};
use scraper::Html;
use std::io::Write;
use tempfile::NamedTempFile;

use super::{result::Error, variables::MAX_BYTES};

lazy_static! {
    static ref CLIENT: Client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (compatible; January/1.0; +https://github.com/revoltchat/january)")
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(5))
        .build()
        .expect("reqwest Client");
}

pub async fn fetch(url: &str) -> Result<(Response, Mime), Error> {
    let resp = CLIENT
        .get(url)
        .send()
        .await
        .map_err(|_| Error::ReqwestFailed)?;

    if !resp.status().is_success() {
        return Err(Error::RequestFailed);
    }

    let content_type = resp
        .headers()
        .get(CONTENT_TYPE)
        .ok_or(Error::MissingContentType)?
        .to_str()
        .map_err(|_| Error::ConversionFailed)?;

    let mime: mime::Mime = content_type
        .parse()
        .map_err(|_| Error::FailedToParseContentType)?;

    Ok((resp, mime))
}

pub async fn get_bytes(resp: &mut Response) -> Result<Bytes, Error> {
    let content_length = resp.content_length().unwrap_or(0) as usize;
    if content_length > *MAX_BYTES {
        return Err(Error::ExceedsMaxBytes);
    }
    let mut bytes = Vec::with_capacity(content_length);
    while let Some(chunk) = resp
        .chunk()
        .await
        .map_err(|_| Error::FailedToConsumeBytes)?
    {
        if bytes.len() + chunk.len() > *MAX_BYTES {
            return Err(Error::ExceedsMaxBytes);
        }
        bytes.extend(chunk)
    }
    Ok(Bytes::from(bytes))
}

pub async fn consume_fragment(mut resp: Response) -> Result<Html, Error> {
    let bytes = get_bytes(&mut resp).await?;

    let content_type = resp
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<Mime>().ok());
    let encoding_name = content_type
        .as_ref()
        .and_then(|mime| mime.get_param("charset").map(|charset| charset.as_str()))
        .unwrap_or("utf-8");
    let encoding = Encoding::for_label(encoding_name.as_bytes()).unwrap_or(&UTF_8_INIT);

    let (text, _, _) = encoding.decode(&bytes);
    Ok(Html::parse_document(&text))
}

pub fn determine_video_size(path: &std::path::Path) -> Result<(isize, isize), Error> {
    let data = ffprobe::ffprobe(path).map_err(|_| Error::ProbeError)?;

    // Take the first valid stream.
    for stream in data.streams {
        if let (Some(w), Some(h)) = (stream.width, stream.height) {
            if let (Ok(w), Ok(h)) = (w.try_into(), h.try_into()) {
                return Ok((w, h));
            }
        }
    }

    Err(Error::ProbeError)
}

pub async fn consume_size(mut resp: Response, mime: Mime) -> Result<(isize, isize), Error> {
    let bytes = get_bytes(&mut resp).await?;

    match mime.type_() {
        mime::IMAGE => {
            if let Ok(size) = imagesize::blob_size(&bytes) {
                Ok((size.width as isize, size.height as isize))
            } else {
                Err(Error::CouldNotDetermineImageSize)
            }
        }
        mime::VIDEO => {
            let mut tmp = NamedTempFile::new().map_err(|_| Error::CouldNotDetermineVideoSize)?;

            tmp.write_all(&bytes)
                .map_err(|_| Error::CouldNotDetermineVideoSize)?;

            determine_video_size(tmp.path())
        }
        _ => unreachable!(),
    }
}
