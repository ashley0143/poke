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

// @license-end