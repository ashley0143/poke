use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use serde::Serialize;
use serde_json;
use std::fmt::Display;
use validator::ValidationErrors;

#[derive(Clone, Serialize, Debug)]
#[serde(tag = "type")]
pub enum Error {
    CouldNotDetermineImageSize,
    CouldNotDetermineVideoSize,
    FailedToParseContentType,
    FailedToConsumeBytes,
    FailedToConsumeText,
    MetaSelectionFailed,
    MissingContentType,
    NotAllowedToProxy,
    ConversionFailed,
    ExceedsMaxBytes,
    ReqwestFailed,
    RequestFailed,
    ProbeError,
    LabelMe,
    FailedValidation {
        #[serde(skip_serializing, skip_deserializing)]
        error: ValidationErrors,
    },
}

impl Display for Error {
    fn fmt(&self, _f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        todo!()
    }
}

impl ResponseError for Error {
    fn status_code(&self) -> StatusCode {
        match *self {
            Error::CouldNotDetermineImageSize => StatusCode::INTERNAL_SERVER_ERROR,
            Error::CouldNotDetermineVideoSize => StatusCode::INTERNAL_SERVER_ERROR,
            Error::FailedToParseContentType => StatusCode::INTERNAL_SERVER_ERROR,
            Error::FailedToConsumeBytes => StatusCode::INTERNAL_SERVER_ERROR,
            Error::FailedToConsumeText => StatusCode::INTERNAL_SERVER_ERROR,
            Error::MetaSelectionFailed => StatusCode::INTERNAL_SERVER_ERROR,
            Error::MissingContentType => StatusCode::BAD_REQUEST,
            Error::NotAllowedToProxy => StatusCode::BAD_REQUEST,
            Error::ConversionFailed => StatusCode::INTERNAL_SERVER_ERROR,
            Error::ExceedsMaxBytes => StatusCode::BAD_REQUEST,
            Error::ReqwestFailed => StatusCode::INTERNAL_SERVER_ERROR,
            Error::RequestFailed => StatusCode::BAD_REQUEST,
            Error::ProbeError => StatusCode::INTERNAL_SERVER_ERROR,
            Error::LabelMe => StatusCode::INTERNAL_SERVER_ERROR,
            Error::FailedValidation { .. } => StatusCode::BAD_REQUEST,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let body = serde_json::to_string(&self).unwrap();

        HttpResponse::build(self.status_code())
            .content_type("application/json")
            .body(body)
    }
}
