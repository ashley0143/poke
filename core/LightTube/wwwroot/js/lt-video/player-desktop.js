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
            play: createButton("div", "play-fill"),
            pause: createButton("div", "pause-fill"),
            volume: createButton("div", "volume-up-fill"),
            time: document.createElement("span"),
            skipToLive: createButton("div", "skip-forward-fill"),
            div: document.createElement("div"),
            settings: createButton("div", "gear-fill"),
            embed: createButton("a", ""),
            pip: createButton("div", "pip"),
            fullscreen: createButton("div", "fullscreen")
        }

        if (!info.live) this.controls.skipToLive.style.display = "none"

        const controlHolder = document.createElement("div");
        controlHolder.classList.add("player-controls");

        this.controls.embed.innerHTML = "<span style='text-align: center; width: 100%'>l<b>t</b></span>";
        this.controls.embed.setAttribute("target", "_blank");
        this.controls.embed.setAttribute("href", "/watch?v=" + info.id);
        if (!info.embed) this.controls.embed.style.display = "none";

        const els = [
            document.createElement("div"),
            document.createElement("div"),
        ]
        for (const padding of els)
            padding.classList.add("player-controls-padding");

        controlHolder.appendChild(els[0]);
        for (const control of Object.values(this.controls)) {
            controlHolder.appendChild(control);
        }
        controlHolder.appendChild(els[1]);
        container.appendChild(controlHolder);

        this.controls.play.onclick = () => this.togglePlayPause();
        this.controls.pause.onclick = () => this.togglePlayPause();
        this.controls.volume.onclick = e => this.mute(e);
        this.controls.volume.classList.add("player-volume");
        this.controls.fullscreen.onclick = () => this.fullscreen();
        this.controls.skipToLive.onclick = () => this.skipToLive();

        if (document.pictureInPictureEnabled === true)
            this.controls.pip.onclick = () => this.pip();
        else
            this.controls.pip.style.display = "none";

        let vol = null;
        if (localStorage !== undefined)
            vol = localStorage?.getItem("ltvideo.volume");
        let volumeRange = document.createElement("input");
        volumeRange.oninput = e => this.setVolume(e);
        volumeRange.setAttribute("min", "0");
        volumeRange.setAttribute("max", "1");
        volumeRange.setAttribute("step", "0.01");
        volumeRange.setAttribute("value", vol ?? "1");
        volumeRange.setAttribute("type", "range");
        if (vol != null)
            this.setVolume({target: {value: Number(vol)}});
        this.controls.volume.appendChild(volumeRange);

        this.controls.div.classList.add("player-button-divider")

        // playback bar
        this.playbackBar = {
            bg: document.createElement("div"),
            played: document.createElement("div"),
            buffered: document.createElement("div"),
            hover: document.createElement("div"),
            sb: document.createElement("div"),
            sbC: document.createElement("div"),
            hoverText: document.createElement("span")
        }
        this.playbackBar.bg.classList.add("player-playback-bar");
        this.playbackBar.bg.classList.add("player-playback-bar-bg");
        this.playbackBar.played.classList.add("player-playback-bar");
        this.playbackBar.played.classList.add("player-playback-bar-fg");
        this.playbackBar.buffered.classList.add("player-playback-bar");
        this.playbackBar.buffered.classList.add("player-playback-bar-buffer");
        this.playbackBar.bg.appendChild(this.playbackBar.buffered);
        this.playbackBar.bg.appendChild(this.playbackBar.played);

        this.playbackBar.hover.classList.add("player-playback-bar-hover");
        if (!this.info.live) {
            this.playbackBar.sb.classList.add("player-storyboard-image");
            this.playbackBar.sbC.classList.add("player-storyboard-image-container");
            this.playbackBar.sb.style.backgroundImage = `url("/proxy/storyboard/${info.id}")`;
            this.playbackBar.sbC.appendChild(this.playbackBar.sb);
        } else {
            this.playbackBar.sb.remove();
        }

        let playbackBarContainer = document.createElement("div");
        playbackBarContainer.classList.add("player-playback-bar-container")
        this.playbackBar.bg.onclick = e => {
            this.playbackBarSeek(e)
        }
        this.playbackBar.bg.ondragover = e => {
            this.playbackBarSeek(e)
        }
        this.playbackBar.bg.onmouseenter = () => {
            this.playbackBar.hover.style.display = "block";
        }
        this.playbackBar.bg.onmouseleave = () => {
            this.playbackBar.hover.style.display = "none";
        }
        this.playbackBar.bg.onmousemove = e => {
            this.moveHover(e)
        }
        playbackBarContainer.appendChild(this.playbackBar.bg);
        this.playbackBar.hover.appendChild(this.playbackBar.sbC)
        this.playbackBar.hover.appendChild(this.playbackBar.hoverText)
        playbackBarContainer.appendChild(this.playbackBar.hover);
        container.appendChild(playbackBarContainer);

        // title
        this.titleElement = document.createElement("div");
        this.titleElement.classList.add("player-title");
        this.titleElement.innerText = info.title;
        container.appendChild(this.titleElement);
        if (!info.embed)
            this.titleElement.style.display = "none";

        // events
        container.onfullscreenchange = () => {
            if (!document.fullscreenElement) {
                this.controls.fullscreen.querySelector("i").setAttribute("class", "bi bi-fullscreen");
                if (!info.embed)
                    this.titleElement.style.display = "none";
            } else {
                this.titleElement.style.display = "block";
                this.controls.fullscreen.querySelector("i").setAttribute("class", "bi bi-fullscreen-exit");
            }
        }
        const updatePlayButtons = () => {
            if (this.__videoElement.paused) {
                this.controls.pause.style.display = "none";
                this.controls.play.style.display = "block";
            } else {
                this.controls.pause.style.display = "block";
                this.controls.play.style.display = "none";
            }
        }
        this.__videoElement.onplay = () => updatePlayButtons();
        this.__videoElement.onpause = () => updatePlayButtons();
        updatePlayButtons();
        this.__videoElement.onclick = () => this.togglePlayPause();
        this.__videoElement.ondblclick = () => this.fullscreen();
        this.container.onkeydown = e => this.keyboardHandler(e);

        this.container.onmousemove = () => {
            let d = new Date();
            d.setSeconds(d.getSeconds() + 3);
            this.controlsDisappearTimeout = d.getTime();
        }

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

        // menu
        this.controls.settings.onclick = e => this.menuButtonClick(e);
        this.controls.settings.setAttribute("data-action", "toggle");
        this.controls.settings.querySelector("i").setAttribute("data-action", "toggle");
        this.updateMenu(sources);

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

    togglePlayPause() {
        if (this.__videoElement.paused)
            this.__videoElement.play();
        else
            this.__videoElement.pause();
    }

    updateMenu() {
        const makeButton = (label, action, icon) => {
            const b = document.createElement("div");
            //todo: yes fix this
            b.innerHTML = `<i class="bi bi-${icon}"></i>${label}`;
            b.onclick = e => this.menuButtonClick(e);
            b.setAttribute("data-action", action)
            b.classList.add("player-menu-item")
            return b;
        }

        const makeMenu = (id, buttons) => {
            const menu = document.createElement("div");
            menu.id = id;
            for (const button of buttons) {
                menu.appendChild(makeButton(button.label, button.action, button.icon));
            }
            return menu;
        }

        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = undefined;
        }
        this.menuElement = document.createElement("div");
        this.menuElement.classList.add("player-menu");
        this.menuElement.appendChild(makeMenu("menu-main", [
            {
                icon: "sliders",
                label: "Quality",
                action: "menu res"
            },
            {
                icon: "badge-cc",
                label: "Subtitles",
                action: "menu sub"
            },
            {
                icon: "speedometer2",
                label: "Speed",
                action: "menu speed"
            }
        ]))
        const resButtons = [
            {
                icon: "arrow-left",
                label: "Back",
                action: "menu main"
            }
        ]

        switch (this.externalPlayerType) {
            case "html5":
                for (const index in this.sources) {
                    resButtons.push({
                        icon: this.sources[index].src === this.__videoElement.src ? "check2" : "",
                        label: this.sources[index].label,
                        action: "videosrc " + index
                    });
                }
                break;
            case "shaka":
                resButtons.pop();
                let tracks = this.__externalPlayer.getVariantTracks();
                for (const index in tracks) {
                    if (tracks[index].audioId === 2)
                        resButtons.unshift({
                            icon: tracks[index].active ? "check2" : "",
                            label: tracks[index].height + "p",
                            action: "shakavariant " + index
                        });
                }
                resButtons.unshift({
                    icon: this.__externalPlayer.getConfiguration().abr.enabled ? "check2" : "",
                    label: "Auto",
                    action: "shakavariant -1"
                });
                resButtons.unshift(
                    {
                        icon: "arrow-left",
                        label: "Back",
                        action: "menu main"
                    });
                break;
            case "hls.js":
                resButtons.pop();
                for (const level in this.__externalPlayer.levels) {
                    resButtons.unshift({
                        icon: level === this.__externalPlayer.currentLevel ? "check2" : "",
                        label: this.__externalPlayer.levels[level].height + "p",
                        action: "hlslevel " + level
                    });
                }
                resButtons.unshift(
                    {
                        icon: -1 === this.__externalPlayer.currentLevel ? "check2" : "",
                        label: "Auto",
                        action: "hlslevel -1"
                    });
                resButtons.unshift(
                    {
                        icon: "arrow-left",
                        label: "Back",
                        action: "menu main"
                    });
                break;
        }
        this.menuElement.appendChild(makeMenu("menu-res", resButtons));
        const subButtons = [
            {
                icon: "arrow-left",
                label: "Back",
                action: "menu main"
            }
        ]

        for (let index = 0; index < this.__videoElement.textTracks.length; index++) {
            if (this.__videoElement.textTracks[index].label.includes("Shaka Player")) continue;
            subButtons.push({
                icon: this.__videoElement.textTracks[index].mode === "showing" ? "check2" : "",
                label: this.__videoElement.textTracks[index].label,
                action: "texttrack " + index
            });
        }
        this.menuElement.appendChild(makeMenu("menu-sub", subButtons));
        this.menuElement.appendChild(makeMenu("menu-speed", [
            {
                icon: "arrow-left",
                label: "Back",
                action: "menu main"
            },
            {
                icon: this.__videoElement.playbackRate === 0.25 ? "check2" : "",
                label: "0.25",
                action: "speed 0.25"
            },
            {
                icon: this.__videoElement.playbackRate === 0.50 ? "check2" : "",
                label: "0.50",
                action: "speed 0.5"
            },
            {
                icon: this.__videoElement.playbackRate === 0.75 ? "check2" : "",
                label: "0.75",
                action: "speed 0.75"
            },
            {
                icon: this.__videoElement.playbackRate === 1 ? "check2" : "",
                label: "Normal",
                action: "speed 1"
            },
            {
                icon: this.__videoElement.playbackRate === 1.25 ? "check2" : "",
                label: "1.25",
                action: "speed 1.25"
            },
            {
                icon: this.__videoElement.playbackRate === 1.50 ? "check2" : "",
                label: "1.50",
                action: "speed 1.5"
            },
            {
                icon: this.__videoElement.playbackRate === 1.75 ? "check2" : "",
                label: "1.75",
                action: "speed 1.75"
            },
            {
                icon: this.__videoElement.playbackRate === 2 ? "check2" : "",
                label: "2",
                action: "speed 2"
            },
        ]))

        this.container.appendChild(this.menuElement);
        for (const child of this.menuElement.children) {
            if (child.tagName === "DIV")
                child.style.display = "none";
        }
    }

    openMenu(id) {
        for (const child of this.menuElement.children) {
            if (child.tagName === "DIV")
                child.style.display = "none";
        }
        try {
            this.menuElement.querySelector("#menu-" + id).style.display = "block";
        } catch {
            // intended
        }
    }

    menuButtonClick(e) {
        let args = (e.target.getAttribute("data-action") ?? e.target.parentElement.getAttribute("data-action")).split(" ");
        let command = args.shift();
        let closeMenu = true;
        switch (command) {
            case "toggle":
                closeMenu = this.menuElement.clientHeight !== 0;
                if (!closeMenu)
                    this.openMenu("main");
                break;
            case "menu":
                this.openMenu(args[0]);
                closeMenu = false;
                break;
            case "speed":
                this.__videoElement.playbackRate = Number.parseFloat(args[0]);
                this.updateMenu();
                break;
            case "texttrack":
                let i = Number.parseFloat(args[0]);
                for (let index = 0; index < this.__videoElement.textTracks.length; index++) {
                    this.__videoElement.textTracks[index].mode = "hidden";

                }
                this.__videoElement.textTracks[i].mode = "showing";
                this.updateMenu();
                break;
            case "videosrc":
                let time = this.__videoElement.currentTime;
                let shouldPlay = !this.__videoElement.paused;
                this.__videoElement.src = this.sources[Number.parseFloat(args[0])].src;
                this.__videoElement.currentTime = time;
                if (shouldPlay)
                    this.__videoElement.play();
                this.updateMenu();
                break;
            case "shakavariant":
                if (args[0] !== "-1")
                    this.__externalPlayer.selectVariantTrack(this.__externalPlayer.getVariantTracks()[Number.parseFloat(args[0])], true, 2)
                this.__externalPlayer.configure({abr: {enabled: args[0] === "-1"}})
                break;
            case "hlslevel":
                this.__externalPlayer.nextLevel = Number.parseInt(args[0]);
                break;
        }
        if (closeMenu)
            this.openMenu();
    };

    mute(e) {
        if (e.target.tagName === "INPUT") return;
        this.muted = !this.muted;
        if (this.muted) {
            this.controls.volume.querySelector("i").setAttribute("class", "bi bi-volume-mute-fill");
            this.__videoElement.volume = 0;
        } else {
            this.controls.volume.querySelector("i").setAttribute("class", "bi bi-volume-up-fill");
            this.__videoElement.volume = this.controls.volume.querySelector("input").value;
        }
    }

    fullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    pip() {
        this.__videoElement.requestPictureInPicture();
    }

    timeUpdate() {
        if (this.info.live) {
            let timeBack = this.__videoElement.duration - this.__videoElement.currentTime;
            this.controls.time.innerHTML = timeBack > 10 ? this.getTimeString(timeBack) : "LIVE";
        } else
            this.controls.time.innerHTML = this.getTimeString(this.__videoElement.currentTime) + " / " + this.getTimeString(this.__videoElement.duration);
        this.playbackBar.played.style.width = ((this.__videoElement.currentTime / this.__videoElement.duration) * 100) + "%";
        this.playbackBar.buffered.style.width = ((this.getLoadEnd() / this.__videoElement.duration) * 100) + "%";

        if (this.controlsDisappearTimeout - Date.now() < 0 && !this.container.classList.contains("hide-controls") && !this.__videoElement.paused)
            this.container.classList.add("hide-controls");


        if (this.controlsDisappearTimeout - Date.now() > 0 && this.container.classList.contains("hide-controls"))
            this.container.classList.remove("hide-controls");

        if (this.__videoElement.paused && this.container.classList.contains("hide-controls"))
            this.container.classList.add("hide-controls");
    }

    setVolume(e) {
        this.__videoElement.volume = e.target.value;
        localStorage.setItem("ltvideo.volume", e.target.value);
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

    moveHover(e) {
        let percentage = (e.offsetX / (this.playbackBar.bg.clientLeft + this.playbackBar.bg.clientWidth));
        let rPercent = Math.round(percentage * 100);

        if (!this.info.live) {
            this.playbackBar.sb.style.backgroundPositionX = `-${rPercent % 10 * 48}px`;
            this.playbackBar.sb.style.backgroundPositionY = `-${Math.floor(rPercent / 10) * 27}px`;
        }

        this.playbackBar.hover.style.top = (this.playbackBar.bg.getBoundingClientRect().y - 4 - this.playbackBar.hover.clientHeight) + 'px';
        this.playbackBar.hover.style.left = (e.clientX - this.playbackBar.hover.clientWidth / 2) + 'px';
        this.playbackBar.hoverText.innerText = this.getTimeString(this.__videoElement.duration * percentage);
    }

    skipToLive() {
        this.__videoElement.currentTime = this.__videoElement.duration;
    }

    keyboardHandler(e) {
        let pd = true;
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
        switch (e.code) {
            case "Space":
                this.togglePlayPause();
                break;
            case "Digit1":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.1;
                break;
            case "Digit2":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.2;
                break;
            case "Digit3":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.3;
                break;
            case "Digit4":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.4;
                break;
            case "Digit5":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.5;
                break;
            case "Digit6":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.6;
                break;
            case "Digit7":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.7;
                break;
            case "Digit8":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.8;
                break;
            case "Digit9":
                if (!this.info.live)
                    this.__videoElement.currentTime = this.__videoElement.duration * 0.9;
                break;
            case "Digit0":
                if (!this.info.live)
                    this.__videoElement.currentTime = 0;
                break;
            case "ArrowLeft":
                if (!this.info.live)
                    this.__videoElement.currentTime -= 5;
                break;
            case "ArrowRight":
                if (!this.info.live)
                    this.__videoElement.currentTime += 5;
                break;
            case "ArrowUp":
                if (!this.info.live)
                    this.__videoElement.volume += 0.1;
                break;
            case "ArrowDown":
                if (!this.info.live)
                    this.__videoElement.volume -= 0.1;
                break;
            case "KeyF":
                this.fullscreen();
                break;
            case "KeyM":
                this.mute({target: {tagName: ""}});
                break;
            default:
                pd = false;
                break;
        }
        if (pd) e.preventDefault();
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