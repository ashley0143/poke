use serde::Serialize;
use validator::Validate;

#[derive(Clone, Debug, Serialize)]
pub enum ImageSize {
    Large,
    Preview,
}

#[derive(Clone, Validate, Debug, Serialize)]
pub struct Image {
    #[validate(length(min = 1, max = 512))]
    pub url: String,
    pub width: isize,
    pub height: isize,
    pub size: ImageSize,
}

#[derive(Clone, Validate, Debug, Serialize)]
pub struct Video {
    #[validate(length(min = 1, max = 512))]
    pub url: String,
    pub width: isize,
    pub height: isize,
}
