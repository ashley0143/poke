const fetch = require('node-fetch');
    const htmlToText = require('html-to-text');
    const encoding = require('encoding');
    const delim1 = '</div></div></div></div><div class="hwc"><div class="BNeawe tAd8D AP7Wnd"><div><div class="BNeawe tAd8D AP7Wnd">';
    const delim2 = '</div></div></div></div></div><div><span class="hwc"><div class="BNeawe uEec3 AP7Wnd">';
    const url = "https://www.google.com/search?q=";

    async function main(e="", d="") {
        let i;
        try {
            i = await fetch(`${url}${encodeURIComponent(d + " " + e)}+lyrics`);
            i = await i.textConverted();
            [, i] = i.split(delim1);
            [i] = i.split(delim2);
        } catch (m) {
            try {
                i = await fetch(`${url}${encodeURIComponent(d + " " + e)}+song+lyrics`);
                i = await i.textConverted();
                [, i] = i.split(delim1);
                [i] = i.split(delim2);
            } catch (n) {
                try {
                    i = await fetch(`${url}${encodeURIComponent(d + " " + e)}+song`);
                    i = await i.textConverted();
                    [, i] = i.split(delim1);
                    [i] = i.split(delim2);
                } catch (o) {
                    try {
                        i = await fetch(`${url}${encodeURIComponent(d + " " + e)}`);
                        i = await i.textConverted();
                        [, i] = i.split(delim1);
                        [i] = i.split(delim2);
                    } catch (p) {
                        i = '';
                    }
                }
            }
        }
        const ret = i.split('\n');
        let final = '';
        for (let j = 0; j < ret.length; j += 1) {
            final = `${final}${htmlToText.fromString(ret[j])}\n`;
        }
        return String(encoding.convert(final)).trim();
    }

     module.exports = main;