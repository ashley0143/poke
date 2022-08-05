// ==UserScript==
// @name LightTube Redirect Button
// @namespace http://youtube.com
// @version 0.1
// @description  Adds a redirect button to the YouTube watch page to redirect to LightTube
// @match https://www.youtube.com/*
// @require http://code.jquery.com/jquery-latest.js
// ==/UserScript==

(function () {
    "use strict";

    const createLtButton = () => {
        let ltButton = document.createElement("button");
        ltButton.onclick = () => {
            ltButton.innerHTML = "Loading proxy, please wait...";
            ltButton.disabled = true;
            window.location = "https://lighttube.herokuapp.com/watch" + window.location.search;
        };
        ltButton.innerHTML = "Proxy (lighttube)";
        ltButton.id = "lighttube-button";
        return ltButton;
    };

    let ltButton = createLtButton();
    
    // Add button whenever you can
    setInterval(() => {
        if (window.location.pathname === "/watch" && !document.getElementById("lighttube-button") && document.getElementById("sponsor-button")) {
            console.log("Inserted button!");
            document.getElementById("sponsor-button").parentElement.insertBefore(ltButton, document.getElementById("sponsor-button"));
        }
    }, 1000);
    
    // Ping lighttube so it stays awake
    setInterval(() => {
        fetch("https://lighttube.herokuapp.com/").then(() => {})
    }, 30000);

    console.log("Pog!");
})();
