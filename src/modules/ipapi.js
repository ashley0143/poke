const https = require('node:https')

/**
 * Get country by IP
 * @param {*} ip
 */
module.exports = function ip2c(ip) {
    return httpsGet(ip);
}

/**
 * HTTPS GET REQUEST
 *
 * @param {*} ip
 */
function httpsGet(ip) {
    return new Promise((resolve, reject) => {
        https.get(`https://ip2c.org/${ip}`, (res) => {
            res.setEncoding('utf8')
            res.on('data', (d) => {
                const _data = d.split(';');
                switch (_data[0]) {
                    case '0':
                        reject({ status: res.statusCode, error: 'Wrong input, your request has not been processed due to invalid syntax!' })
                        break;
                    case '1':
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: {
                                code: _data[1],
                                iso: _data[2],
                                fullname: _data[3],
                            }
                        })
                        break;
                    case '2':
                        reject({ status: res.statusCode, error: 'Unknown, given ip/dec not found in database or not yet physically assigned to any country!' })
                        break;
                }
            });
        }).on('error', (e) => {
            reject({ error: e })
        });
    })
}