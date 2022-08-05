class Player {
    constructor(query, info, sources, externalPlayer, externalPlayerType) {
        // vars
        this.externalPlayerType = externalPlayerType ?? "html5";
        this.muted = false;
        this.info = info;
        this.sources = sources;
        this.__videoElement = document.querySelector(query);
        this.__videoElement.removeAttribute("controls");
        this.__externalPlayer = externalPlayer;

        // container
        const container = document.createElement("div");
        container.classList.add("player");
        this.__videoElement.parentElement.appendChild(container);
        container.appendChild(this.__videoElement);
        this.container = container;
        if (info.embed) {
            this.container.classList.add("embed");
            this.__videoElement.classList.remove("embed");
        }

        // default source
        switch (this.externalPlayerType) {
            case "html5":
                for (let source of sources) {
                    if (source.height <= 720) {
                        this.__videoElement.src = source.src;
                        break;
                    }
                }
                break;
            case "hls.js":
                for (let level = this.__externalPlayer.levels.length - 1; level >= 0; level--) {
                    if (this.__externalPlayer.levels[level].height <= 720) {
                        this.__externalPlayer.currentLevel = level;
                        break;
                    }
                }
                break;
            case "shaka":
                this.__externalPlayer.configure({abr: {enabled: false}})
                let variants = this.__externalPlayer.getVariantTracks();
                for (let variant = variants.length - 1; variant >= 0; variant--) {
                    let v = variants[variant];
                    if (v.height <= 720) {
                        this.__externalPlayer.selectVariantTrack(v, true);
                        break;
                    }
                }
                break;
        }

        // controls
        const createButton = (tag, icon) => {
            const b = document.createElement(tag);
            b.classList.add("player-button");
            if (icon !== "")
                b.innerHTML = `<i class="bi bi-${icon}"></i>`;
            return b;
        }

        this.controls = {
            container: document.createElement("div"),
            play: createButton("div", "play-fill"),
            fullscreen: createButton("div", "fullscreen"),
            time: document.createElement("span"),
            duration: document.createElement("span"),
        }

        this.controls.container.classList.add("player-controls");
        this.controls.container.appendChild(this.controls.play);
        this.controls.fullscreen.classList.replace("player-button", "player-tiny-button")
        container.appendChild(this.controls.container);

        this.controls.play.onclick = () => this.togglePlayPause();
        this.controls.fullscreen.onclick = () => this.fullscreen();
        this.setVolume({target: {value: 1}});

        // playback bar
        this.playbackBar = {
            bg: document.createElement("div"),
            played: document.createElement("div"),
            buffered: document.createElement("div")
        }
        this.playbackBar.bg.classList.add("player-playback-bar");
        this.playbackBar.bg.classList.add("player-playback-bar-bg");
        this.playbackBar.played.classList.add("player-playback-bar");
        this.playbackBar.played.classList.add("player-playback-bar-fg");
        this.playbackBar.buffered.classList.add("player-playback-bar");
        this.playbackBar.buffered.classList.add("player-playback-bar-buffer");
        this.playbackBar.bg.appendChild(this.playbackBar.buffered);
        this.playbackBar.bg.appendChild(this.playbackBar.played);

        let playbackBarContainer = document.createElement("div");
        playbackBarContainer.classList.add("player-playback-bar-container")
        this.playbackBar.bg.onclick = e => {
            this.playbackBarSeek(e)
        }
        playbackBarContainer.appendChild(this.controls.time);
        playbackBarContainer.appendChild(this.playbackBar.bg);
        playbackBarContainer.appendChild(this.controls.duration);
        playbackBarContainer.appendChild(this.controls.fullscreen);
        container.appendChild(playbackBarContainer);


        // events
        container.onfullscreenchange = () => {
            if (!document.fullscreenElement) {
                this.controls.fullscreen.querySelector("i").setAttribute("class", "bi bi-fullscreen");
            } else {
                this.controls.fullscreen.querySelector("i").setAttribute("class", "bi bi-fullscreen-exit");
            }
        }
        const updatePlayButtons = () => {
            if (this.__videoElement.paused) {
                this.controls.play.querySelector("i").classList.replace("bi-pause-fill", "bi-play-fill");
            } else {
                this.controls.play.querySelector("i").classList.replace("bi-play-fill", "bi-pause-fill");
            }
        }
        this.__videoElement.onplay = () => updatePlayButtons();
        this.__videoElement.onpause = () => updatePlayButtons();
        updatePlayButtons();
        this.__videoElement.onclick = e => this.toggleControls(e);
        this.controls.container.onclick = e => this.toggleControls(e);
        this.__videoElement.onclick = e => this.toggleControls(e);

        switch (this.externalPlayerType) {
            case "shaka":
                externalPlayer.addEventListener("variantchanged", () => {
                    this.updateMenu();
                });
                externalPlayer.addEventListener('error', this.fallbackFromShaka);
                break;
            case "hls.js":
                // uhhhhhh...
                break;
        }

        // buffering
        this.bufferingScreen = document.createElement("div");
        this.bufferingScreen.classList.add("player-buffering");
        this.container.appendChild(this.bufferingScreen);

        let bufferingSpinner = document.createElement("img");
        bufferingSpinner.classList.add("player-buffering-spinner");
        bufferingSpinner.src = "/img/spinner.gif";
        this.bufferingScreen.appendChild(bufferingSpinner);

        setInterval(() => this.update(), 100);
    }

    togglePlayPause(e) {
        if (this.__videoElement.paused)
            this.__videoElement.play();
        else
            this.__videoElement.pause();
    }

    updateMenu() {
        // todo: mobile resolution switching
    }

    fullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    timeUpdate() {
        if (this.info.live) {
            let timeBack = this.__videoElement.duration - this.__videoElement.currentTime;
            this.controls.time.innerHTML = timeBack > 10 ? this.getTimeString(timeBack) : "LIVE";
        } else {
            this.controls.time.innerHTML = this.getTimeString(this.__videoElement.currentTime);
            this.controls.duration.innerHTML = this.getTimeString(this.__videoElement.duration);
        }
        this.playbackBar.played.style.width = ((this.__videoElement.currentTime / this.__videoElement.duration) * 100) + "%";
        this.playbackBar.buffered.style.width = ((this.getLoadEnd() / this.__videoElement.duration) * 100) + "%";
    }

    setVolume(e) {
        this.__videoElement.volume = 1;
        localStorage.setItem("ltvideo.volume", 1);
    }

    getLoadEnd() {
        let longest = -1;
        for (let i = 0; i < this.__videoElement.buffered.length; i++) {
            const end = this.__videoElement.buffered.end(i);
            if (end > longest) longest = end;
        }
        return longest;
    }

    playbackBarSeek(e) {
        let percentage = (e.offsetX / (this.playbackBar.bg.clientLeft + this.playbackBar.bg.clientWidth));
        this.playbackBar.played.style.width = (percentage * 100) + "%";
        this.__videoElement.currentTime = this.__videoElement.duration * percentage;
    }

    getTimeString(s) {
        let res = s < 3600 ? new Date(s * 1000).toISOString().substr(14, 5) : new Date(s * 1000).toISOString().substr(11, 8);
        if (res.startsWith("0"))
            res = res.substr(1);
        return res;
    }

    update() {
        this.timeUpdate();

        if (this.info.live) {
            let timeBack = Math.abs(this.__videoElement.currentTime - this.__videoElement.buffered.end(this.__videoElement.buffered.length - 1));
            this.bufferingScreen.style.display = timeBack < .1 ? "flex" : "none";
        } else {
            switch (this.__videoElement.readyState) {
                case 1:
                    this.bufferingScreen.style.display = "flex";
                    break;
                default:
                    this.bufferingScreen.style.display = "none";
                    break;
            }
        }
    }

    async fallbackFromShaka() {
        if (this.externalPlayerType !== "shaka") return;
        this.externalPlayerType = "html5";
        console.log("Shaka player crashed, falling back");
        let cTime = this.__videoElement.currentTime;
        await this.__externalPlayer.detach();
        await this.__externalPlayer.destroy();
        this.__videoElement.src = this.sources[0].src;
        this.__externalPlayer = undefined;
        this.__videoElement.currentTime = cTime;
        this.updateMenu();
        console.log("Fallback complete!");
    }

    toggleControls(e) {
        if (["DIV", "VIDEO"].includes(e.target.tagName))
            if (this.container.classList.contains("hide-controls")) {
                this.container.classList.remove("hide-controls")
            } else {
                this.container.classList.add("hide-controls")
            }
    }
}

const loadPlayerWithShaka = async (query, info, sources, manifestUri) => {
    let player;
    if (manifestUri !== undefined) {
        shaka.polyfill.installAll();
        let shakaUsable = shaka.Player.isBrowserSupported();

        if (shakaUsable) {
            const video = document.querySelector(query);
            player = new shaka.Player(video);

            try {
                await player.load(manifestUri);
            } catch (e) {
                await player.destroy();
                return new Player(query, info, sources, undefined, "html5");
            }
        }
    }

    return new Player(query, info, sources, await player, "shaka");
}

const loadPlayerWithHls = (query, info, manifestUri) => {
    return new Promise((res, rej) => {
        let hls;

        const video = document.querySelector(query);

        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(manifestUri);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                res(new Player(query, info, [], hls, "hls.js"));
            });
        } else
            rej("You can't watch livestreams / premieres because hls.js is not supported in your browser.")
    })
}