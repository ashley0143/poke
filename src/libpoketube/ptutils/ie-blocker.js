// ie-blocker.js
function isIE(ua) {
  if (!ua) return false;
  // Matches old IE (MSIE) and IE 11 (Trident with rv)
  return /MSIE \d|Trident\/.*rv:\d+/i.test(ua);
}

function ieBlockHtml() {
  return (
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <meta http-equiv="X-UA-Compatible" content="IE=edge">' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">' +
    '  <title>Browser is not supported :p</title>' +
    '  <style>' +
    '    body{margin:0;padding:3em;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#222;text-align:center}' +
    '    h1{margin:0 0 .5em 0;font-size:2em;color:#b00020}' +
    '    p{margin:1em auto;max-width:32em;line-height:1.6}' +
    '    b{color:#000}' +
    '    a{color:#0645ad;text-decoration:none}' +
    '    a:hover{text-decoration:underline}' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <h1>Heyo :3</h1>' +
    '  <p>hoi — poke does and <b>will not work</b> on Internet Explorer :p<br>' +
    '  if u wanna use poke try using Firefox (firefox.com) or Chromium :3<br>' +
    '  love u :3</p>' +
    '</body>' +
    '</html>'
  );
}

// Global middleware that blocks IE everywhere.
 
function ieBlockMiddleware(req, res, next) {
  const ua = req.get('user-agent') || (req.useragent && req.useragent.source) || '';
  if (isIE(ua)) {
    // Send ONLY the minimal page; no templates, no extras.
    res
      .status(200)
      .type('html')
      .set('Cache-Control', 'no-store, max-age=0')
      .send(ieBlockHtml());
    return;
  }
  next();
}

module.exports = { isIE, ieBlockMiddleware, ieBlockHtml };
