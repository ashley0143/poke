# January

## Description

Image proxy and metadata scraper.

**Features:**

- Can scrape metadata from websites, e.g. OpenGraph
- Can scrape embeds from websites, e.g. YouTube, Spotify

## Stack

- [Actix](https://actix.rs/)

## Usage

- Use `/embed?url=<url>` to generate an embed for given URL.
- Use `/proxy?url=<url>` to fetch and serve a remote image.

## Resources

### Revolt

- [Revolt Project Board](https://github.com/revoltchat/revolt/discussions) (Submit feature requests here)
- [Revolt Testers Server](https://app.revolt.chat/invite/Testers)
- [Contribution Guide](https://developers.revolt.chat/contributing)

## CLI Commands

| Command            | Description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `cargo build`      | Build/compile January.                                                                      |
| `cargo run`        | Run January.                                                                                |
| `cargo fmt`        | Format January. Not intended for PR use to avoid accidentally formatting unformatted files. |

## Contributing

The contribution guide is located at [developers.revolt.chat/contributing](https://developers.revolt.chat/contributing).
Please note that a pull request should only take care of one issue so that we can review it quickly.

## License

January is licensed under the [GNU Affero General Public License v3.0](https://github.com/revoltchat/january/blob/master/LICENSE).

## To-do

- Use LRU cache for data. [See uluru](https://github.com/servo/uluru)
- Full support for OpenGraph. [See ogp.me](https://ogp.me)
- Full support for Twitter cards. See [a](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary) and [b](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image).
- Add max length for strings from meta tags.

## .

![jan](https://img.insrt.uk/xexu7/PuliLOWu82.png/raw)
