use actix_web::web;
use actix_web::Responder;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Info {
    january: &'static str,
}

pub async fn get() -> impl Responder {
    web::Json(Info {
        january: env!("CARGO_PKG_VERSION"),
    })
}
