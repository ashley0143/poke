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

/* rebranding */
function replaceRecursively(element, from, to) {
        if (element.tagName !== 'STYLE') { // Ignore elements with the tag name "style"
    if (element.childNodes.length) {
        element.childNodes.forEach(child => replaceRecursively(child, from, to));
    } else {
        const cont = element.textContent;
        if (cont) element.textContent = cont.replace(from, to);
    }    }

}; 

document.title = document.title.replace("PokeTube", "Poke") 

function replaceText(match) {
    // Check if the first letter of the matched text is uppercase
    if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        // If uppercase, check if the entire text is "Poketube.fun"
        if (match.toLowerCase() === "poketube.fun") {
            return "Poketube.fun"; // Keep the original case
        } else {
            return "Poke" // Replace with "Poke" + rest of the string
        }
    } else {
        // If not uppercase, check if the entire text is "poketube.fun"
        if (match.toLowerCase() === "poketube.fun") {
            return "poketube.fun"; // Keep the original case
        } else {
            return "poke"; // Replace with "poke"
        }
    }
}

replaceRecursively(document.body, new RegExp("poketube", "gi"), replaceText);

function replaceTitle() {
     if (window.location.pathname === "/watch") {
         document.title = document.title.replace(/Poke/g, " Watch");
    }
}

// Call the function when the page loads
replaceTitle();


/*
 * This script adds the Plausible analytics telemetry code to the page for the
 * domain poketube.fun.
*/

var config = {}
config.plausible_enabled = false

if (window.location.hostname === "poketube.fun" && config.plausible_enabled == true) {
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