# Build Stage
FROM rustlang/rust:nightly-slim AS builder
USER 0:0
WORKDIR /home/rust/src

RUN USER=root cargo new --bin january
WORKDIR /home/rust/src/january
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN apt-get update && apt-get install -y libssl-dev pkg-config && cargo install --locked --path .

# Bundle Stage
FROM debian:buster-slim
RUN apt-get update && apt-get install -y ca-certificates ffmpeg
COPY --from=builder /usr/local/cargo/bin/january ./
EXPOSE 7000
ENV JANUARY_HOST 0.0.0.0:7000
CMD ["./january"]
