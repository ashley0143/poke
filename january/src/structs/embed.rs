use serde::Serialize;

use super::{
    media::{Image, Video},
    metadata::Metadata,
};

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type")]
#[allow(clippy::large_enum_variant)]
pub enum Embed {
    Website(Metadata),
    Image(Image),
    Video(Video),
    None,
}
