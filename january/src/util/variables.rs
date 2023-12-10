use std::env;

lazy_static! {
    // Application Settings
    pub static ref HOST: String =
        env::var("JANUARY_HOST").expect("Missing JANUARY_HOST environment variable.");
    pub static ref MAX_BYTES: usize =
        env::var("JANUARY_MAX_BYTES").unwrap_or("104857600".to_string()).parse().expect("Invalid JANUARY_MAX_BYTES environment variable.");
}
