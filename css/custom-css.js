// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-3.0-or-later  
  
const css = localStorage.getItem("poke-custom-css");

var head = document.head 
var style = document.createElement('style');

head.appendChild(style);

style.type = 'text/css';

if (style.styleSheet){
  // This is required for IE8 and below.
  style.styleSheet.cssText = css;
} else {
  style.appendChild(document.createTextNode(css));
}

var script_tag = document.createElement('script');
script_tag.type = 'text/javascript';
script_tag.text = localStorage.getItem("poke-custom-script");
document.head.appendChild(script_tag);

/*
 * This script adds the Plausible analytics telemetry code to the page for the
 * domain poketube.fun. The telemetry is opt-in by default, meaning that the
 * Plausible script will only be added if the user has not explicitly opted out
 * by setting the "plausible-enabled" key in local storage to "false".
 *
 * To opt out of telemetry, u can can set the "plausible-enabled" key to "false"
 * in local storage. The data collected by Plausible is anonymous and aggregated,
 * and no personal information is collected or stored.
 */
if (window.location.hostname === "poketube.fun") {
  const plausble_main = "https://telemetry.poketube.fun/js/p.js";
  const script = document.createElement("script");
  const isTrackingEnabled = localStorage.getItem("plausible-enabled") !== "false";
  if (isTrackingEnabled) {
    script.defer = true;
    script.src = plausble_main;
    script.dataset.domain = "poketube.fun";
    document.head.appendChild(script);
  }
}

// @license-end