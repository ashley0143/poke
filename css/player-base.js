// in the beginning.... god made mrrprpmnaynayaynaynayanyuwuuuwmauwnwanwaumawp :p
var _yt_player = videojs;

var versionclient = "youtube.player.web_20250917_22_RC00"


document.addEventListener("DOMContentLoaded", () => {
    // video.js 8 init - source can be seen in https://poketube.fun/static/vjs.min.js or the vjs.min.js file
    const video = videojs('video', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        errorDisplay: false,
    });

    // todo : remove this code lol
    const qs = new URLSearchParams(window.location.search);
    const qua = qs.get("quality") || "";
    const vidKey = qs.get('v');
    try { localStorage.setItem(`progress-${vidKey}`, 0); } catch {}

    // raw media elements
    const videoEl = document.getElementById('video');
    const audio = document.getElementById('aud');
    const audioEl = document.getElementById('aud');
    let volGuard = false;

    // FIX: ensure inline playback hint for iOS/Safari
    try { videoEl.setAttribute('playsinline', ''); videoEl.setAttribute('webkit-playsinline', ''); } catch {}

    // NEW: keep hidden audio eager and ready sooner (helps first-seek stability)
    try { audio.setAttribute('preload', 'auto'); } catch {}

    // global anti-ping-pong guard
    let syncing = false; // prevents normal ping-pong
    let restarting = false; // prevents loop-end ping-pong

    // FIX: explicit loop-state variables
    let desiredLoop =
        !!videoEl.loop ||
        qs.get("loop") === "1" ||
        qs.get("loop") === "true" ||
        window.forceLoop === true;

    // FIX: tracks the short window *during* a loop restart
    let suppressEndedUntil = 0;

    // FIX: co-play tracking flags (true only when each element fires 'playing')
    let vIsPlaying = false;
    let aIsPlaying = false;

    // remember mute states for temporary autoplay retries
    let prevVideoMuted = false;
    let prevAudioMuted = false;
    let pendingUnmute = false;

    // FIX: seeking coordination (prevents first-load seek ping-pong)
    let seekingInProgress = false;
    let resumeAfterSeek = false;

    // NEW: short quiesce windows to ignore chatty events after seek or coordinator actions
    const SEEK_QUIESCE_MS = 700;     // time to ignore play/pause/arbiter after seek
    const ACTION_COOLDOWN_MS = 550;  // time to ignore arbiter after coordinated play/pause
    let quiesceUntil = 0;            // timestamp (ms) until which we ignore event noise
    let arbiterCooldownUntil = 0;    // timestamp (ms) for arbiter cool-down

    const now = () => performance.now();
    const inQuiesce = () => now() < quiesceUntil;
    const inCooldown = () => now() < arbiterCooldownUntil;

    // FIX: state arbiter watchdog (forces both to share same paused/playing state)
    let arbiterTimer = null;
    const ARBITER_MS = 150;
    function startArbiter() {
        if (arbiterTimer) clearInterval(arbiterTimer);
        arbiterTimer = setInterval(() => {
            // NEW: do nothing during seek quiesce or cooldown; this is where ping-pong used to start
            if (inQuiesce() || inCooldown() || syncing || restarting || seekingInProgress) return;

            // treat "playing" strictly; ended counts as paused
            const vPlaying = !video.paused() && !video.ended();
            const aPlaying = !audio.paused && !audio.ended;

            // NEW: if both aren't actually playable at the current time, don't force a pause yet
            const t = Number(video.currentTime());
            if (!bothPlayableAt(t)) return;

            // if exactly one is playing, pause the one that is playing (safe + deterministic)
            if (vPlaying && !aPlaying) {
                try { video.pause(); } catch {}
            } else if (aPlaying && !vPlaying) {
                try { audio.pause(); } catch {}
            }
        }, ARBITER_MS);
    }
    function stopArbiter() { if (arbiterTimer) { clearInterval(arbiterTimer); arbiterTimer = null; } }

    // turn OFF native loop so 'ended' fires and we control both tracks together
    try { videoEl.loop = false; videoEl.removeAttribute?.('loop'); } catch {}
    try { audio.loop = false; audio.removeAttribute?.('loop'); } catch {}

    // If someone toggles the <video loop> attribute at runtime, treat it as intent,
    // but still keep native loop off (we loop manually to keep A/V locked).
    try {
        const loopObserver = new MutationObserver(muts => {
            for (const m of muts) {
                if (m.type === 'attributes' && m.attributeName === 'loop') {
                    desiredLoop = videoEl.hasAttribute('loop') || !!videoEl.loop;
                    // keep native loop disabled to prevent double restarts / missing 'ended'
                    videoEl.removeAttribute('loop');
                    videoEl.loop = false;
                }
            }
        });
        loopObserver.observe(videoEl, { attributes: true, attributeFilter: ['loop'] });
    } catch {}

    // resolve initial sources robustly (works whether <audio src> or <source> children are used)
    const pickAudioSrc = () => {
        const s = audio?.getAttribute?.('src');
        if (s) return s;
        const child = audio?.querySelector?.('source');
        if (child?.getAttribute?.('src')) return child.getAttribute('src');
        if (audio?.currentSrc) return audio.currentSrc;
        return null;
    };
    let audioSrc = pickAudioSrc();

    const srcObj = video.src();
    const videoSrc = Array.isArray(srcObj) ? (srcObj[0] && srcObj[0].src) : srcObj;
    const videoType = Array.isArray(srcObj) ? (srcObj[0] && srcObj[0].type) : undefined;

    // readiness + sync state
    let audioReady = false, videoReady = false;
    let syncInterval = null;

    // thresholds / constants
    const BIG_DRIFT = 0.5;
    const MICRO_DRIFT = 0.05;
    const SYNC_INTERVAL_MS = 250;

    // MDN/WHATWG: buffered regions are TimeRanges; we pad slightly for tolerance
    const EPS = 0.15;
    function timeInBuffered(media, t) {
        try {
            const br = media.buffered;
            if (!br || br.length === 0 || !isFinite(t)) return false;
            for (let i = 0; i < br.length; i++) {
                const s = br.start(i) - EPS, e = br.end(i) + EPS;
                if (t >= s && t <= e) return true;
            }
        } catch {}
        return false;
    }
    function canPlayAt(media, t) {
        try {
            const rs = Number(media.readyState || 0);
            if (!isFinite(t)) return false;
            // HAVE_FUTURE_DATA (3) or better means imminent playback
            if (rs >= 3) return true; // FIX: rely on readyState for can-play gate
            return timeInBuffered(media, t);
        } catch { return false; }
    }
    function bothPlayableAt(t) {
        return canPlayAt(videoEl, t) && canPlayAt(audio, t);
    }

    function safeSetCT(media, t) {
        try {
            if (!isFinite(t) || t < 0) return;
            // NOTE: expects a *native* media element (videoEl/audio), not the video.js player
            media.currentTime = t;
        } catch {}
    }

    function clearSyncLoop() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
            try { audio.playbackRate = 1; } catch {}
        }
    }

    function startSyncLoop() {
        clearSyncLoop();
        syncInterval = setInterval(() => {
            const vt = Number(video.currentTime());
            const at = Number(audio.currentTime);
            if (!isFinite(vt) || !isFinite(at)) return;
            const delta = vt - at;
            if (Math.abs(delta) > BIG_DRIFT) {
                safeSetCT(audio, vt);
                try { audio.playbackRate = 1; } catch {}
                return;
            }
            if (Math.abs(delta) > MICRO_DRIFT) {
                const targetRate = 1 + (delta * 0.12);
                try { audio.playbackRate = Math.max(0.85, Math.min(1.15, targetRate)); } catch {}
            } else {
                try { audio.playbackRate = 1; } catch {}
            }
        }, SYNC_INTERVAL_MS);
    }

    // FIX: co-play verification
    const markVPlaying = () => { vIsPlaying = true; maybeUnmuteRestore(); };
    const markAPlaying = () => { aIsPlaying = true; maybeUnmuteRestore(); };
    const markVNotPlaying = () => { vIsPlaying = false; };
    const markANotPlaying = () => { aIsPlaying = false; };

    function bothActivelyPlaying() { return vIsPlaying && aIsPlaying; }

    function maybeUnmuteRestore() {
        if (!pendingUnmute) return;
        if (bothActivelyPlaying()) {
            pendingUnmute = false;
            // small defer so decoders settle
            setTimeout(() => {
                try { video.muted(prevVideoMuted); } catch {}
                try { audio.muted = prevAudioMuted; } catch {}
            }, 120);
        }
    }

    // FIX: unified play/pause coordinators (no ping-pong)
    async function playTogether({ allowMutedRetry = true } = {}) {
        if (syncing || restarting || seekingInProgress) return; // FIX: don't start while seeking
        syncing = true;
        try {
            // align clocks first
            const t = Number(video.currentTime());
            if (isFinite(t) && Math.abs(Number(audio.currentTime) - t) > 0.05) safeSetCT(audio, t);

            // first attempt: keep existing mute states
            let vOk = true, aOk = true;
            try { const p = video.play(); if (p && p.then) await p; } catch { vOk = false; }
            try { const p = audio.play(); if (p && p.then) await p; } catch { aOk = false; }

            // if either failed due to autoplay policy, retry both muted exactly once
            if (allowMutedRetry && (!vOk || !aOk)) {
                prevVideoMuted = !!video.muted();
                prevAudioMuted = !!audio.muted;
                pendingUnmute = true;
                try { video.muted(true); } catch {}
                try { audio.muted = true; } catch {}

                vOk = true; aOk = true;
                try { const p = video.play(); if (p && p.then) await p; } catch { vOk = false; }
                try { const p = audio.play(); if (p && p.then) await p; } catch { aOk = false; }
            }

            if (!syncInterval) startSyncLoop();

            // NEW: after we coordinate a play, let things settle—keep arbiter hands-off briefly
            arbiterCooldownUntil = now() + ACTION_COOLDOWN_MS;
        } finally {
            syncing = false;
        }
    }

    function pauseTogether() {
        if (syncing) return;
        syncing = true;
        try {
            try { video.pause(); } catch {}
            try { audio.pause(); } catch {}
            clearSyncLoop();
            // NEW: also cool down arbiter to avoid immediate re-pauses
            arbiterCooldownUntil = now() + ACTION_COOLDOWN_MS;
        } finally {
            syncing = false;
        }
    }

    function tryStart() {
        if (audioReady && videoReady && !restarting) {
            const t = Number(video.currentTime());
            if (isFinite(t) && Math.abs(Number(audio.currentTime) - t) > 0.1) safeSetCT(audio, t);
            if (bothPlayableAt(t)) {
                playTogether({ allowMutedRetry: true });
            } else {
                pauseTogether();
            }
            setupMediaSession();
        }
    }

    function attachRetry(elm, resolveSrc, markReady) {
        const src = resolveSrc?.();
        const onLoaded = () => {
            try { elm._didRetry = false; } catch {}
            markReady();
            tryStart();
        };
        elm.addEventListener('loadeddata', onLoaded, { once: true });
        elm.addEventListener('loadedmetadata', onLoaded, { once: true });
    }

    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: document.title || 'Video',
                    artist: '',
                    album: '',
                    artwork: []
                });
            } catch {}

            // Only control the *video* here; audio follows via coordinator
            navigator.mediaSession.setActionHandler('play', () => { playTogether({ allowMutedRetry: true }); });
            navigator.mediaSession.setActionHandler('pause', () => { pauseTogether(); });
            navigator.mediaSession.setActionHandler('seekbackward', ({ seekOffset }) => {
                const skip = seekOffset || 10;
                const to = Math.max(0, Number(video.currentTime()) - skip);
                video.currentTime(to);
                safeSetCT(audio, to);
            });
            navigator.mediaSession.setActionHandler('seekforward', ({ seekOffset }) => {
                const skip = seekOffset || 10;
                const to = Number(video.currentTime()) + skip;
                video.currentTime(to);
                safeSetCT(audio, to);
            });
            navigator.mediaSession.setActionHandler('seekto', ({ seekTime, fastSeek }) => {
                if (!isFinite(seekTime)) return;
                if (fastSeek && 'fastSeek' in audio)
                    try { audio.fastSeek(seekTime); } catch { safeSetCT(audio, seekTime); }
                else safeSetCT(audio, seekTime);
                video.currentTime(seekTime);
            });
            navigator.mediaSession.setActionHandler('stop', () => {
                pauseTogether();
                try { video.currentTime(0); } catch {}
                try { audio.currentTime = 0; } catch {}
            });
        }
    }

    document.addEventListener('keydown', e => {
        if (restarting) return;
        switch (e.code) {
            case 'AudioPlay':
            case 'MediaPlayPause':
                if (video.paused()) playTogether({ allowMutedRetry: true });
                else pauseTogether();
                break;
            case 'AudioPause':
                pauseTogether();
                break;
            case 'AudioNext':
            case 'MediaTrackNext': {
                const tFwd = Number(video.currentTime()) + 10;
                video.currentTime(tFwd); safeSetCT(audio, tFwd);
                break;
            }
            case 'AudioPrevious':
            case 'MediaTrackPrevious': {
                const tBwd = Math.max(0, Number(video.currentTime()) - 10);
                video.currentTime(tBwd); safeSetCT(audio, tBwd);
                break;
            }
        }
    });

    // FIX: one-time "unlock" to enable later programmatic plays on Safari/iOS
    let mediaUnlocked = false;
    const unlock = () => {
        if (mediaUnlocked) return;
        mediaUnlocked = true;
        // Try a quick muted play/pause to grant future play permission
        try { audio.muted = true; audio.play().then(() => { audio.pause(); }).catch(()=>{}); } catch {}
        try { const was = !!video.muted(); video.muted(true); video.play().then(()=>{ video.pause(); video.muted(was); }).catch(()=>{}); } catch {}
    };
    window.addEventListener('click', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });

    if (qua !== "medium") {
        attachRetry(audio, pickAudioSrc, () => { audioReady = true; });
        attachRetry(videoEl, () => {
            const s = video.src();
            return Array.isArray(s) ? (s[0] && s[0].src) : (s || videoSrc);
        }, () => { videoReady = true; });

        const clamp = v => Math.max(0, Math.min(1, Number(v)));
        video.on('volumechange', () => {
            try { audio.volume = clamp(video.volume()); audio.muted = video.muted(); } catch {}
        });
        // remove audio->video volume mirroring to avoid feedback loops
        // audio.addEventListener('volumechange', () => { ... });

        video.on('ratechange', () => { try { audio.playbackRate = video.playbackRate(); } catch {} });

        // NEW: only bridge plays when *not* in quiesce/cooldown AND both are playable at T
        video.on('play', () => {
            if (restarting || seekingInProgress || inQuiesce()) return; // FIX
            vIsPlaying = true;
            const t = Number(video.currentTime());
            if (!aIsPlaying && bothPlayableAt(t)) {
                queueMicrotask(() => playTogether({ allowMutedRetry: true }));
            }
        });
        audio.addEventListener('play', () => {
            if (restarting || seekingInProgress || inQuiesce()) return; // FIX
            aIsPlaying = true;
            const t = Number(video.currentTime());
            if (!vIsPlaying && bothPlayableAt(t)) {
                queueMicrotask(() => playTogether({ allowMutedRetry: true }));
            }
        });

        video.on('pause', () => {
            if (restarting || seekingInProgress || inQuiesce()) return; // FIX
            vIsPlaying = false;
            pauseTogether();
        });
        audio.addEventListener('pause', () => {
            if (restarting || seekingInProgress || inQuiesce()) return; // FIX
            aIsPlaying = false;
            pauseTogether();
        });

        video.on('waiting', () => {
            if (restarting || seekingInProgress || inQuiesce()) return; // FIX
            vIsPlaying = false;
            try { audio.pause(); } catch{};
            clearSyncLoop();
        });
        audio.addEventListener('waiting', () => { aIsPlaying = false; });

        video.on('playing', markVPlaying);
        audio.addEventListener('playing', markAPlaying);

        const errorBox = document.getElementById('loopedIndicator');
        video.on('error', () => {
            const mediaError = video.error();
            let message = 'An unknown error occurred.';
            if (mediaError) {
                if (mediaError.code === 1) return;
                message = `Error ${mediaError.code}: ${mediaError.message || 'No message provided'} try to refresh the page?`;
            }
            if (errorBox) {
                errorBox.textContent = message;
                errorBox.style.display = 'block';
                errorBox.style.width = 'fit-content';
            }
        });

        // FIX: tiny helper to wait until both are actually playable near a time
        const waitUntilPlayable = (t, timeoutMs = 800) => new Promise(resolve => {
            const start = performance.now();
            const tick = () => {
                if (bothPlayableAt(t)) return resolve(true);
                if (performance.now() - start > timeoutMs) return resolve(false);
                setTimeout(tick, 40);
            };
            tick();
        });

        // suppress spurious 'ended' right after seeks (mobile/browser quirk guard)
        let wasPlayingBeforeSeek = false;

        video.on('seeking', () => {
            if (restarting) return;
            seekingInProgress = true;          // FIX
            wasPlayingBeforeSeek = !video.paused();
            resumeAfterSeek = wasPlayingBeforeSeek; // FIX

            // NEW: quiesce event storm around first seek
            quiesceUntil = now() + SEEK_QUIESCE_MS;

            try { audio.pause(); } catch {}
            clearSyncLoop();

            const vt = Number(video.currentTime());
            if (Math.abs(vt - Number(audio.currentTime)) > 0.1) safeSetCT(audio, vt);

            vIsPlaying = false; aIsPlaying = false; // FIX
        });

        video.on('seeked', async () => {
            if (restarting) return;

            // NEW: extend quiesce a bit into post-seek stabilization window
            quiesceUntil = now() + SEEK_QUIESCE_MS;

            const vt = Number(video.currentTime());
            if (Math.abs(vt - Number(audio.currentTime)) > 0.05) safeSetCT(audio, vt);

            // FIX: only resume once the new point is playable; avoid first-load ping-pong
            if (resumeAfterSeek) {
                // NEW: give first seek more headroom on slow devices
                const ok = await waitUntilPlayable(vt, 1200);
                if (ok) {
                    playTogether({ allowMutedRetry: false });
                } else {
                    pauseTogether();
                }
            } else {
                pauseTogether();
            }

            seekingInProgress = false; // FIX
            resumeAfterSeek = false;   // FIX
        });

        video.on('canplaythrough', () => {
            if (restarting || seekingInProgress) return; // FIX
            const vt = Number(video.currentTime());
            if (Math.abs(vt - Number(audio.currentTime)) > 0.1) safeSetCT(audio, vt);
        });
        audio.addEventListener('canplaythrough', () => {
            if (restarting || seekingInProgress) return; // FIX
            const vt = Number(video.currentTime());
            if (Math.abs(vt - Number(audio.currentTime)) > 0.1) safeSetCT(audio, vt);
        });

        // --- unconditional looping with anti-pingpong ---
        async function restartLoop() {
            if (restarting) return;
            restarting = true;
            try {
                clearSyncLoop();
                pauseTogether();

                // tiny offset so 'ended' doesn't immediately refire
                const startAt = 0.001;
                suppressEndedUntil = performance.now() + 800;

                video.currentTime(startAt);
                safeSetCT(audio, startAt);

                // NEW: suppress arbiter and other bridges briefly as we restart
                quiesceUntil = now() + SEEK_QUIESCE_MS;
                arbiterCooldownUntil = now() + ACTION_COOLDOWN_MS;

                await waitUntilPlayable(startAt, 1000);
                await playTogether({ allowMutedRetry: true });
            } finally {
                restarting = false;
            }
        }

        video.on('ended', () => {
            if (restarting) return;
            if (performance.now() < suppressEndedUntil) return;
            if (desiredLoop) restartLoop();
            else { pauseTogether(); }
        });
        audio.addEventListener('ended', () => {
            if (restarting) return;
            if (performance.now() < suppressEndedUntil) return;
            if (desiredLoop) restartLoop();
            else { pauseTogether(); }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && !restarting) {
                pauseTogether();
            }
        });

        // FIX: start the state-arbiter watchdog
        startArbiter();
    }
});

 // https://codeberg.org/ashley/poke/src/branch/main/src/libpoketube/libpoketube-youtubei-objects.json

  
const FORMATS = {
    "5": { ext: "flv", width: 400, height: 240, acodec: "mp3", abr: 64, vcodec: "h263" },
    "6": { ext: "flv", width: 450, height: 270, acodec: "mp3", abr: 64, vcodec: "h263" },
    "13": { ext: "3gp", acodec: "aac", vcodec: "mp4v" },
    "17": { ext: "3gp", width: 176, height: 144, acodec: "aac", abr: 24, vcodec: "mp4v" },
    "18": { ext: "mp4", width: 640, height: 360, acodec: "aac", abr: 96, vcodec: "h264" },
    "34": { ext: "flv", width: 640, height: 360, acodec: "aac", abr: 128, vcodec: "h264" },
    "35": { ext: "flv", width: 854, height: 480, acodec: "aac", abr: 128, vcodec: "h264" },
    "36": { ext: "3gp", width: 320, acodec: "aac", vcodec: "mp4v" },
    "37": { ext: "mp4", width: 1920, height: 1080, acodec: "aac", abr: 192, vcodec: "h264" },
    "38": { ext: "mp4", width: 4096, height: 3072, acodec: "aac", abr: 192, vcodec: "h264" },
    "43": { ext: "webm", width: 640, height: 360, acodec: "vorbis", abr: 128, vcodec: "vp8" },
    "44": { ext: "webm", width: 854, height: 480, acodec: "vorbis", abr: 128, vcodec: "vp8" },
    "45": { ext: "webm", width: 1280, height: 720, acodec: "vorbis", abr: 192, vcodec: "vp8" },
    "46": { ext: "webm", width: 1920, height: 1080, acodec: "vorbis", abr: 192, vcodec: "vp8" },
    "59": { ext: "mp4", width: 854, height: 480, acodec: "aac", abr: 128, vcodec: "h264" },
    "78": { ext: "mp4", width: 854, height: 480, acodec: "aac", abr: 128, vcodec: "h264" },
    
    // 3D videos
    "82": { ext: "mp4", height: 360, format: "3D", acodec: "aac", abr: 128, vcodec: "h264" },
    "83": { ext: "mp4", height: 480, format: "3D", acodec: "aac", abr: 128, vcodec: "h264" },
    "84": { ext: "mp4", height: 720, format: "3D", acodec: "aac", abr: 192, vcodec: "h264" },
    "85": { ext: "mp4", height: 1080, format: "3D", acodec: "aac", abr: 192, vcodec: "h264" },
    "100": { ext: "webm", height: 360, format: "3D", acodec: "vorbis", abr: 128, vcodec: "vp8" },
    "101": { ext: "webm", height: 480, format: "3D", acodec: "vorbis", abr: 192, vcodec: "vp8" },
    "102": { ext: "webm", height: 720, format: "3D", acodec: "vorbis", abr: 192, vcodec: "vp8" },

    // Apple HTTP Live Streaming
    "91": { ext: "mp4", height: 144, format: "HLS", acodec: "aac", abr: 48, vcodec: "h264" },
    "92": { ext: "mp4", height: 240, format: "HLS", acodec: "aac", abr: 48, vcodec: "h264" },
    "93": { ext: "mp4", height: 360, format: "HLS", acodec: "aac", abr: 128, vcodec: "h264" },
    "94": { ext: "mp4", height: 480, format: "HLS", acodec: "aac", abr: 128, vcodec: "h264" },
    "95": { ext: "mp4", height: 720, format: "HLS", acodec: "aac", abr: 256, vcodec: "h264" },
    "96": { ext: "mp4", height: 1080, format: "HLS", acodec: "aac", abr: 256, vcodec: "h264" },
    "132": { ext: "mp4", height: 240, format: "HLS", acodec: "aac", abr: 48, vcodec: "h264" },
    "151": { ext: "mp4", height: 72, format: "HLS", acodec: "aac", abr: 24, vcodec: "h264" },

    // DASH mp4 video
    "133": { ext: "mp4", height: 240, format: "DASH video", vcodec: "h264" },
    "134": { ext: "mp4", height: 360, format: "DASH video", vcodec: "h264" },
    "135": { ext: "mp4", height: 480, format: "DASH video", vcodec: "h264" },
    "136": { ext: "mp4", height: 720, format: "DASH video", vcodec: "h264" },
    "137": { ext: "mp4", height: 1080, format: "DASH video", vcodec: "h264" },
    "138": { ext: "mp4", format: "DASH video", vcodec: "h264" }, // Height can vary
    "160": { ext: "mp4", height: 144, format: "DASH video", vcodec: "h264" },
    "212": { ext: "mp4", height: 480, format: "DASH video", vcodec: "h264" },
    "264": { ext: "mp4", height: 1440, format: "DASH video", vcodec: "h264" },
    "298": { ext: "mp4", height: 720, format: "DASH video", vcodec: "h264", fps: 60 },
    "299": { ext: "mp4", height: 1080, format: "DASH video", vcodec: "h264", fps: 60 },
    "266": { ext: "mp4", height: 2160, format: "DASH video", vcodec: "h264" },

    // Dash mp4 audio
    "139": { ext: "m4a", format: "DASH audio", acodec: "aac", abr: 48, container: "m4a_dash" },
    "140": { ext: "m4a", format: "DASH audio", acodec: "aac", abr: 128, container: "m4a_dash" },
    "141": { ext: "m4a", format: "DASH audio", acodec: "aac", abr: 256, container: "m4a_dash" },
    "256": { ext: "m4a", format: "DASH audio", acodec: "aac", container: "m4a_dash" },
    "258": { ext: "m4a", format: "DASH audio", acodec: "aac", container: "m4a_dash" },
    "325": { ext: "m4a", format: "DASH audio", acodec: "dtse", container: "m4a_dash" },
    "328": { ext: "m4a", format: "DASH audio", acodec: "ec-3", container: "m4a_dash" },

    // Dash webm
    "167": { ext: "webm", height: 360, width: 640, vcodec: "vp9", acodec: "vorbis" },
    "171": { ext: "webm", height: 480, width: 854, vcodec: "vp9", acodec: "vorbis" },
    "172": { ext: "webm", height: 720, width: 1280, vcodec: "vp9", acodec: "vorbis" },
    "248": { ext: "webm", height: 1080, width: 1920, vcodec: "vp9", acodec: "vorbis" },
    "249": { ext: "webm", height: 1440, width: 2560, vcodec: "vp9", acodec: "vorbis" },
    "250": { ext: "webm", height: 2160, width: 3840, vcodec: "vp9", acodec: "vorbis" },

    // Extra formats
    "264": { ext: "mp4", height: 1440, vcodec: "h264" }
};



// youtube client stuff 
const YoutubeAPI = {
  DEFAULT_API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
  ANDROID_API_KEY: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",

  ANDROID_APP_VERSION: "20.20.41",
  ANDROID_USER_AGENT:  "com.google.android.youtube/20.20.41 (Linux; U; Android 16; en_US; SM-S908E Build/TP1A.220624.014) gzip",
  ANDROID_SDK_VERSION: 36,
  ANDROID_VERSION: "16",

  ANDROID_TS_APP_VERSION: "1.9",
  ANDROID_TS_USER_AGENT:
    "com.google.android.youtube/1.9 (Linux; U; Android 1; US) gzip",

  IOS_APP_VERSION: "20.11.6",
  IOS_USER_AGENT:
    "com.google.ios.youtube/20.11.6 (iPhone14,5; U; CPU iOS 18_5 like Mac OS X;)",
  IOS_VERSION: "18.5.0.22F76",

  WINDOWS_VERSION: "10.0",

  ClientType: {
    web: "Web",
    web_embedded_player: "WebEmbeddedPlayer",
    web_mobile: "WebMobile",
    web_screen_embed: "WebScreenEmbed",
    android: "Android",
    android_embedded_player: "AndroidEmbeddedPlayer",
    android_screen_embed: "AndroidScreenEmbed",
    android_test_suite: "AndroidTestSuite",
    ios: "IOS",
    ios_embedded: "IOSEmbedded",
    ios_music: "IOSMusic",
    tv_html5: "TvHtml5",
    tv_html5_screen_embed: "TvHtml5ScreenEmbed"
  },

  HARDCODED_CLIENTS: {
    // Web
    web: {
      name: "WEB",
      name_proto: "1",
      version: "2.20250917.02.00",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      screen: "WATCH_FULL_SCREEN",
      os_name: "Windows",
      os_version: "10.0",
      platform: "DESKTOP"
    },
    web_embedded_player: {
      name: "WEB_EMBEDDED_PLAYER",
      name_proto: "56",
      version: "1.20250907.01.00",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      screen: "EMBED",
      os_name: "Windows",
      os_version: "10.0",
      platform: "DESKTOP"
    },
    web_mobile: {
      name: "MWEB",
      name_proto: "2",
      version: "2.20250909.02.00",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      os_name: "Android",
      os_version: "16",
      platform: "MOBILE"
    },
    web_screen_embed: {
      name: "WEB",
      name_proto: "1",
      version: "2.20250909.02.00",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      screen: "EMBED",
      os_name: "Windows",
      os_version: "10.0",
      platform: "DESKTOP"
    },

    // Android
    android: {
      name: "ANDROID",
      name_proto: "3",
      version: "20.20.41",
      api_key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      android_sdk_version: 36,
      user_agent:
        "com.google.android.youtube/20.20.41 (Linux; U; Android 16; en_US; SM-S908E Build/TP1A.220624.014) gzip",
      os_name: "Android",
      os_version: "16",
      platform: "MOBILE"
    },
    android_embedded_player: {
      name: "ANDROID_EMBEDDED_PLAYER",
      name_proto: "55",
      version: "20.20.41",
      api_key: "AIzaSyCjc_pVEDi4qsv5MtC2dMXzpIaDoRFLsxw"
    },
    android_screen_embed: {
      name: "ANDROID",
      name_proto: "3",
      version: "20.20.41",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      screen: "EMBED",
      android_sdk_version: 36,
      user_agent:
        "com.google.android.youtube/20.20.41 (Linux; U; Android 16; en_US; SM-S908E Build/TP1A.220624.014) gzip",
      os_name: "Android",
      os_version: "16",
      platform: "MOBILE"
    },
    android_test_suite: {
      name: "ANDROID_TESTSUITE",
      name_proto: "30",
      version: "1.9",
      api_key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      android_sdk_version: 36,
      user_agent:
        "com.google.android.youtube/1.9 (Linux; U; Android 16; US) gzip",
      os_name: "Android",
      os_version: "16",
      platform: "MOBILE"
    },

    // iOS
    ios: {
      name: "IOS",
      name_proto: "5",
      version: "20.11.6",
      api_key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
      user_agent:
        "com.google.ios.youtube/20.11.6 (iPhone14,5; U; CPU iOS 18_5 like Mac OS X;)",
      device_make: "Apple",
      device_model: "iPhone14,5",
      os_name: "iPhone",
      os_version: "18.5.0.22F76",
      platform: "MOBILE"
    },
    ios_embedded: {
      name: "IOS_MESSAGES_EXTENSION",
      name_proto: "66",
      version: "20.11.6",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      user_agent:
        "com.google.ios.youtube/20.11.6 (iPhone14,5; U; CPU iOS 18_5 like Mac OS X;)",
      device_make: "Apple",
      device_model: "iPhone14,5",
      os_name: "iPhone",
      os_version: "18.5.0.22F76",
      platform: "MOBILE"
    },
    ios_music: {
      name: "IOS_MUSIC",
      name_proto: "26",
      version: "7.14",
      api_key: "AIzaSyBAETezhkwP0ZWA02RsqT1zu78Fpt0bC_s",
      user_agent:
        "com.google.ios.youtubemusic/7.14 (iPhone14,5; U; CPU iOS 17_6 like Mac OS X;)",
      device_make: "Apple",
      device_model: "iPhone14,5",
      os_name: "iPhone",
      os_version: "18.5.0.22F76",
      platform: "MOBILE"
    },

    // TV
    tv_html5: {
      name: "TVHTML5",
      name_proto: "7",
      version: "7.20250219.14.00",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
    },
    tv_html5_screen_embed: {
      name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      name_proto: "85",
      version: "2.0",
      api_key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      screen: "EMBED"
    }
  },

  DEFAULT_CLIENT_CONFIG: {
    client_type: "web",
    region: "US"
  }
};




// player base 
const base_player_old_old = "https://www.youtube.com/s/player/a87a9450/player_ias.vflset/en_US/base.js"
const base_player_old = "https://www.youtube.com/s/player/2d24ba15/player_ias.vflset/en_US/base.js";
const base_player_broken = "https://www.youtube.com/s/player/6740c111/player_ias.vflset/en_US/base.js";
const hey = " please dont use the above player base stuff!! tyyyyyyyy <3 "


const youtubeobjects = "https://codeberg.org/ashley/poke/raw/branch/main/src/libpoketube/libpoketube-youtubei-objects.json"

const base_player = "https://www.youtube.com/s/player/0004de42/player_ias.vflset/en_US/base.js";

const base_player_poketube = "https://poketube.fun/s/player/0004de42/player_ias.vflset/en_US/base.js";

function extractPlayerData(playerUrl) {
    const segments = playerUrl.split('/');
    const domain = segments[2];
    const version = segments[segments.length - 2];
    const fileName = segments[segments.length - 1];
    const key = generateKey(domain, version, fileName);

    return {
        domain,
        version,
        fileName,
        key,
        timestamp: Date.now(),
    };
}

function generateKey(domain, version, fileName) {
    const rawString = `${domain}|${version}|${fileName}|${Date.now()}`;
    return Array.from(rawString)
        .map((char) => char.charCodeAt(0) * 3)
        .reduce((acc, val) => (acc + val) % 997, 1)
        .toString(36);
}

function initializePlayer(data) {
    const context = createPlayerContext(data.key, data.version);
    const frameData = calculateFrames(data.timestamp, data.fileName);

    const playerObject = {
        context,
        frameData,
        ready: false,
    };

    if (validatePlayerObject(playerObject)) {
        playerObject.ready = true;
    }

    return playerObject;
}

function createPlayerContext(key, version) {
    const contextMap = new Map();
    const modifiers = key.length + version.length;

    contextMap.set("encryptionLevel", modifiers % 5);
    contextMap.set("versionHash", Array.from(version).reduce((acc, char) => acc + char.charCodeAt(0), 0));
    contextMap.set("keyWeight", key.split('').reduce((acc, char) => acc * char.charCodeAt(0), 1));

    return contextMap;
}

function calculateFrames(timestamp, fileName) {
    const base = fileName.split('_').length + timestamp.toString().length;
    const frameCount = base % 128 + 10;

    return Array.from({ length: frameCount }, (_, index) => ({
        frame: index,
        delay: (timestamp % (index + 1)) + 20,
    }));
}

function validatePlayerObject(player) {
    const { context, frameData } = player;
    const frameHash = frameData.reduce((acc, frame) => acc + frame.frame * frame.delay, 0);
    const contextHash = Array.from(context.values()).reduce((acc, value) => acc + value, 0);

    return (frameHash + contextHash) % 13 === 0;
}

const extractedData = extractPlayerData(base_player_poketube);
const initializedPlayer = initializePlayer(extractedData);
 

 const saa = document.createElement('style');
saa.innerHTML = `
.vjs-play-progress{background-image:linear-gradient(to right,#ff0045,#ff0e55,#ff1d79)}

/* move the whole controls panel up a bit so buttons fit */
.video-js .vjs-control-bar{bottom:12px!important}

/* poster border radius to 16px */
.vjs-poster {
  border-radius: 16px;
}

/* poster border radius to 16px */
.vjs-poster img {
  border-radius: 16px;
}

/* control bar: clean baseline */
.vjs-control-bar{
  background:transparent!important;border:none!important;box-shadow:none!important;
  display:flex!important;align-items:center!important;gap:2px;padding:6px 10px;border-radius:16px
}
.vjs-remaining-time,.vjs-fullscreen-control{background-color:transparent!important}

/* glassy circular controls */
.vjs-control-bar .vjs-button{
  width:38px;height:38px;min-width:38px;border-radius:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.08));
  -webkit-backdrop-filter:blur(12px) saturate(160%);backdrop-filter:blur(12px) saturate(160%);
  border:1px solid rgba(255,255,255,.18);
  box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.10);
  display:inline-flex;align-items:center;justify-content:center;margin:0 6px;
  transition:transform .12s ease,box-shadow .2s ease,background .2s ease;vertical-align:middle
}
.vjs-control-bar .vjs-button:hover{background:linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,.12));box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.16);transform:translateY(-1px)}
.vjs-control-bar .vjs-button:active{transform:translateY(0)}
.vjs-control-bar .vjs-button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(255,0,90,.35),inset 0 0 0 1px rgba(255,255,255,.2)}
.vjs-control-bar .vjs-icon-placeholder:before{font-size:18px;line-height:38px}

/* center the time text vertically like buttons */
.vjs-current-time,.vjs-time-divider,.vjs-duration,.vjs-remaining-time{
  background:transparent;padding:0 8px;border-radius:999px;box-shadow:none;margin:0;
  height:38px;line-height:1;display:inline-flex;align-items:center
}

/* progress: glass capsule like the buttons */
.vjs-progress-control{
  flex:1 1 auto;display:flex!important;align-items:center!important;margin:0 6px;padding:0;height:38px
}
.vjs-progress-control .vjs-progress-holder{
  height:8px!important;border-radius:999px!important;background:transparent!important;border:none;box-shadow:none;
  position:relative;margin:0;width:100%
}
/* glass capsule background (same vibe as circular buttons) */
.vjs-progress-control .vjs-progress-holder::before{
position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.08));
  -webkit-backdrop-filter:blur(12px) saturate(160%);backdrop-filter:blur(12px) saturate(160%);
  border:1px solid rgba(255,255,255,.18);
  box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.10);
  pointer-events:none
}
/* keep bars above the capsule bg */
.vjs-progress-control .vjs-load-progress,
.vjs-progress-control .vjs-play-progress{position:relative;z-index:1;border-radius:inherit!important}
.vjs-progress-control .vjs-play-progress{background-image:linear-gradient(to right,#ff0045,#ff0e55,#ff1d79)!important}
.vjs-progress-control .vjs-slider-handle{
  width:14px!important;height:14px!important;border-radius:50%!important;background:#fff!important;border:1px solid rgba(255,255,255,.9);
  box-shadow:0 6px 18px rgba(0,0,0,.35),0 0 0 3px rgba(255,0,90,.20);top:-4px!important;z-index:2
}

/* volume aligned to baseline; simple track */
.vjs-volume-panel{gap:8px;align-items:center!important;padding:0;height:38px}
.vjs-volume-bar{height:6px!important;border-radius:999px!important;background:#2c2c2c!important;border:none;box-shadow:none;position:relative}
.vjs-volume-level{border-radius:inherit!important;background-image:linear-gradient(to right,#ff0045,#ff1d79)!important}
.vjs-volume-bar .vjs-slider-handle{
  width:12px!important;height:12px!important;border-radius:50%!important;background:#fff!important;border:1px solid rgba(255,255,255,.9);
  top:-3px!important;box-shadow:0 4px 14px rgba(0,0,0,.3),0 0 0 3px rgba(255,0,90,.18)
}

/* small screens */
@media (max-width:640px){
  .video-js .vjs-control-bar{bottom:10px!important}
  .vjs-control-bar{gap:8px;padding:6px 8px}
  .vjs-control-bar .vjs-button{width:34px;height:34px;min-width:34px}
  .vjs-control-bar .vjs-icon-placeholder:before{font-size:16px;line-height:34px}
  .vjs-current-time,.vjs-time-divider,.vjs-duration,.vjs-remaining-time{height:34px}
  .vjs-progress-control{height:34px}
  .vjs-progress-control .vjs-slider-handle{width:12px!important;height:12px!important;top:-3px!important}
}
`;
document.head.appendChild(saa);


window.pokePlayer = {
    ver:`21-6740c111-vjs-${videojs.VERSION}`,
    canHasAmbientMode:true,
    videoID:new URLSearchParams(window.location.search).get('v'),
    supported_itag_list:["136", "140", "298", "18", "400", "401", "313", "271"],
    formats:["SD", "HD", "4k", "2k"],
	YoutubeAPI,
    clientVideoPlayerID:"0004de42",
    
}


/* video js plugins */


















/*  github: https://github.com/afrmtbl/videojs-youtube-annotations */

class AnnotationParser {
	static get defaultAppearanceAttributes() {
		return {
			bgColor: 0xFFFFFF,
			bgOpacity: 0.80,
			fgColor: 0,
			textSize: 3.15
		};
	}

	static get attributeMap() {
		return {
			type: "tp",
			style: "s",
			x: "x",
			y: "y",
			width: "w",
			height: "h",

			sx: "sx",
			sy: "sy",

			timeStart: "ts",
			timeEnd: "te",
			text: "t",

			actionType: "at",
			actionUrl: "au",
			actionUrlTarget: "aut",
			actionSeconds: "as",

			bgOpacity: "bgo",
			bgColor: "bgc",
			fgColor: "fgc",
			textSize: "txsz"
		};
	}

	/* AR ANNOTATION FORMAT */
	deserializeAnnotation(serializedAnnotation) {
		const map = this.constructor.attributeMap;
		const attributes = serializedAnnotation.split(",");
		const annotation = {};
		for (const attribute of attributes) {
			const [ key, value ] = attribute.split("=");
			const mappedKey = this.getKeyByValue(map, key);

			let finalValue = "";

			if (["text", "actionType", "actionUrl", "actionUrlTarget", "type", "style"].indexOf(mappedKey) > -1) {
				finalValue = decodeURIComponent(value);
			}
			else {
				finalValue = parseFloat(value, 10);
			}
			annotation[mappedKey] = finalValue;
		}
		return annotation;
	}
	serializeAnnotation(annotation) {
		const map = this.constructor.attributeMap;
		let serialized = "";
		for (const key in annotation) {
			const mappedKey = map[key];
			if ((["text", "actionType", "actionUrl", "actionUrlTarget"].indexOf(key) > -1) && mappedKey && annotation.hasOwnProperty(key)) {
				let text = encodeURIComponent(annotation[key]);
				serialized += `${mappedKey}=${text},`;
			}
			else if ((["text", "actionType", "actionUrl", "actionUrlTarget"].indexOf("key") === -1) && mappedKey && annotation.hasOwnProperty(key)) {
				serialized += `${mappedKey}=${annotation[key]},`;
			}
		}
		// remove trailing comma
		return serialized.substring(0, serialized.length - 1);
	}

	deserializeAnnotationList(serializedAnnotationString) {
		const serializedAnnotations = serializedAnnotationString.split(";");
		serializedAnnotations.length = serializedAnnotations.length - 1;
		const annotations = [];
		for (const annotation of serializedAnnotations) {
			annotations.push(this.deserializeAnnotation(annotation));
		}
		return annotations;
	}
	serializeAnnotationList(annotations) {
		let serialized = "";
		for (const annotation of annotations) {
			serialized += this.serializeAnnotation(annotation) + ";";
		}
		return serialized;
	}

	/* PARSING YOUTUBE'S ANNOTATION FORMAT */
	xmlToDom(xml) {
		const parser = new DOMParser();
		const dom = parser.parseFromString(xml, "application/xml");
		return dom;
	}
	getAnnotationsFromXml(xml) {
		const dom = this.xmlToDom(xml);
		return dom.getElementsByTagName("annotation");
	}
	parseYoutubeAnnotationList(annotationElements) {
		const annotations = [];
		for (const el of annotationElements) {
			const parsedAnnotation = this.parseYoutubeAnnotation(el);
			if (parsedAnnotation) annotations.push(parsedAnnotation);
		}
		return annotations;
	}
	parseYoutubeAnnotation(annotationElement) {
		const base = annotationElement;
		const attributes = this.getAttributesFromBase(base);
		if (!attributes.type || attributes.type === "pause") return null;

		const text = this.getTextFromBase(base);
		const action = this.getActionFromBase(base);

		const backgroundShape = this.getBackgroundShapeFromBase(base);
		if (!backgroundShape) return null;
		const timeStart = backgroundShape.timeRange.start;
		const timeEnd = backgroundShape.timeRange.end;

		if (isNaN(timeStart) || isNaN(timeEnd) || timeStart === null || timeEnd === null) {
			return null;
		}

		const appearance = this.getAppearanceFromBase(base);

		// properties the renderer needs
		let annotation = {
			// possible values: text, highlight, pause, branding
			type: attributes.type,
			// x, y, width, and height as percent of video size
			x: backgroundShape.x, 
			y: backgroundShape.y, 
			width: backgroundShape.width, 
			height: backgroundShape.height,
			// what time the annotation is shown in seconds
			timeStart,
			timeEnd
		};
		// properties the renderer can work without
		if (attributes.style) annotation.style = attributes.style;
		if (text) annotation.text = text;
		if (action) annotation = Object.assign(action, annotation);
		if (appearance) annotation = Object.assign(appearance, annotation);

		if (backgroundShape.hasOwnProperty("sx")) annotation.sx = backgroundShape.sx;
		if (backgroundShape.hasOwnProperty("sy")) annotation.sy = backgroundShape.sy;

		return annotation;
	}
	getBackgroundShapeFromBase(base) {
		const movingRegion = base.getElementsByTagName("movingRegion")[0];
		if (!movingRegion) return null;
		const regionType = movingRegion.getAttribute("type");

		const regions = movingRegion.getElementsByTagName(`${regionType}Region`);
		const timeRange = this.extractRegionTime(regions);

		const shape = {
			type: regionType,
			x: parseFloat(regions[0].getAttribute("x"), 10),
			y: parseFloat(regions[0].getAttribute("y"), 10),
			width: parseFloat(regions[0].getAttribute("w"), 10),
			height: parseFloat(regions[0].getAttribute("h"), 10),
			timeRange
		}

		const sx = regions[0].getAttribute("sx");
		const sy = regions[0].getAttribute("sy");

		if (sx) shape.sx = parseFloat(sx, 10);
		if (sy) shape.sy = parseFloat(sy, 10);
		
		return shape;
	}
	getAttributesFromBase(base) {
		const attributes = {};
		attributes.type = base.getAttribute("type");
		attributes.style = base.getAttribute("style");
		return attributes;
	}
	getTextFromBase(base) {
		const textElement = base.getElementsByTagName("TEXT")[0];
		if (textElement) return textElement.textContent;
	}
	getActionFromBase(base) {
		const actionElement = base.getElementsByTagName("action")[0];
		if (!actionElement) return null;
		const typeAttr = actionElement.getAttribute("type");

		const urlElement = actionElement.getElementsByTagName("url")[0];
		if (!urlElement) return null;
		const actionUrlTarget = urlElement.getAttribute("target");
		const href = urlElement.getAttribute("value");
		// only allow links to youtube
		// can be changed in the future
		if (href.startsWith("https://www.youtube.com/")) {
			const url = new URL(href);
			const srcVid = url.searchParams.get("src_vid");
			const toVid = url.searchParams.get("v");

			return this.linkOrTimestamp(url, srcVid, toVid, actionUrlTarget);
		}
	}
	linkOrTimestamp(url, srcVid, toVid, actionUrlTarget) {
		// check if it's a link to a new video
		// or just a timestamp
		if (srcVid && toVid && srcVid === toVid) {
			let seconds = 0;
			const hash = url.hash;
			if (hash && hash.startsWith("#t=")) {
				const timeString = url.hash.split("#t=")[1];
				seconds = this.timeStringToSeconds(timeString);
			}
			return {actionType: "time", actionSeconds: seconds}
		}
		else {
			return {actionType: "url", actionUrl: url.href, actionUrlTarget};
		}
	}
	getAppearanceFromBase(base) {
		const appearanceElement = base.getElementsByTagName("appearance")[0];
		const styles = this.constructor.defaultAppearanceAttributes;

		if (appearanceElement) {
			const bgOpacity = appearanceElement.getAttribute("bgAlpha");
			const bgColor = appearanceElement.getAttribute("bgColor");
			const fgColor = appearanceElement.getAttribute("fgColor");
			const textSize = appearanceElement.getAttribute("textSize");
			// not yet sure what to do with effects 
			// const effects = appearanceElement.getAttribute("effects");

			// 0.00 to 1.00
			if (bgOpacity) styles.bgOpacity = parseFloat(bgOpacity, 10);
			// 0 to 256 ** 3
			if (bgColor) styles.bgColor = parseInt(bgColor, 10);
			if (fgColor) styles.fgColor = parseInt(fgColor, 10);
			// 0.00 to 100.00?
			if (textSize) styles.textSize = parseFloat(textSize, 10);
		}

		return styles;
	}

	/* helper functions */
	extractRegionTime(regions) {
		let timeStart = regions[0].getAttribute("t");
		timeStart = this.hmsToSeconds(timeStart);

		let timeEnd = regions[regions.length - 1].getAttribute("t");
		timeEnd = this.hmsToSeconds(timeEnd);

		return {start: timeStart, end: timeEnd}
	}
	// https://stackoverflow.com/a/9640417/10817894
	hmsToSeconds(hms) {
	    let p = hms.split(":");
	    let s = 0;
	    let m = 1;

	    while (p.length > 0) {
	        s += m * parseFloat(p.pop(), 10);
	        m *= 60;
	    }
	    return s;
	}
	timeStringToSeconds(time) {
		let seconds = 0;

		const h = time.split("h");
	  	const m = (h[1] || time).split("m");
	  	const s = (m[1] || time).split("s");
		  
	  	if (h[0] && h.length === 2) seconds += parseInt(h[0], 10) * 60 * 60;
	  	if (m[0] && m.length === 2) seconds += parseInt(m[0], 10) * 60;
	  	if (s[0] && s.length === 2) seconds += parseInt(s[0], 10);

		return seconds;
	}
	getKeyByValue(obj, value) {
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (obj[key] === value) {
					return key;
				}
			}
		}
	}
}
class AnnotationRenderer {
	constructor(annotations, container, playerOptions, updateInterval = 1000) {
		if (!annotations) throw new Error("Annotation objects must be provided");
		if (!container) throw new Error("An element to contain the annotations must be provided");

		if (playerOptions && playerOptions.getVideoTime && playerOptions.seekTo) {
			this.playerOptions = playerOptions;
		}
		else {
			console.info("AnnotationRenderer is running without a player. The update method will need to be called manually.");
		}

		this.annotations = annotations;
		this.container = container;

		this.annotationsContainer = document.createElement("div");
		this.annotationsContainer.classList.add("__cxt-ar-annotations-container__");
		this.annotationsContainer.setAttribute("data-layer", "4");
		this.annotationsContainer.addEventListener("click", e => {
			this.annotationClickHandler(e);
		});
		this.container.prepend(this.annotationsContainer);

		this.createAnnotationElements();

		// in case the dom already loaded
		this.updateAllAnnotationSizes();
		window.addEventListener("DOMContentLoaded", e => {
			this.updateAllAnnotationSizes();
		});

		this.updateInterval = updateInterval;
		this.updateIntervalId = null;
	}
	changeAnnotationData(annotations) {
		this.stop();
		this.removeAnnotationElements();
		this.annotations = annotations;
		this.createAnnotationElements();
		this.start();
	}
	createAnnotationElements() {
		for (const annotation of this.annotations) {
			const el = document.createElement("div");
			el.classList.add("__cxt-ar-annotation__");

			annotation.__element = el;
			el.__annotation = annotation;

			// close button
			const closeButton = this.createCloseElement();
			closeButton.addEventListener("click", e => {
				el.setAttribute("hidden", "");
				el.setAttribute("data-ar-closed", "");
				if (el.__annotation.__speechBubble) {
					const speechBubble = el.__annotation.__speechBubble;
					speechBubble.style.display = "none";
				}
			});
			el.append(closeButton);

			if (annotation.text) {
				const textNode = document.createElement("span");
				textNode.textContent = annotation.text;
				el.append(textNode);
				el.setAttribute("data-ar-has-text", "");
			}

			if (annotation.style === "speech") {
				const containerDimensions = this.container.getBoundingClientRect();
				const speechX = this.percentToPixels(containerDimensions.width, annotation.x);
				const speechY = this.percentToPixels(containerDimensions.height, annotation.y);

				const speechWidth = this.percentToPixels(containerDimensions.width, annotation.width);
				const speechHeight = this.percentToPixels(containerDimensions.height, annotation.height);

				const speechPointX = this.percentToPixels(containerDimensions.width, annotation.sx);
				const speechPointY = this.percentToPixels(containerDimensions.height, annotation.sy);

				const bubbleColor = this.getFinalAnnotationColor(annotation, false);
				const bubble = this.createSvgSpeechBubble(speechX, speechY, speechWidth, speechHeight, speechPointX, speechPointY, bubbleColor, annotation.__element);
				bubble.style.display = "none";
				bubble.style.overflow = "visible";
				el.style.pointerEvents = "none";
				bubble.__annotationEl = el;
				annotation.__speechBubble = bubble;

				const path = bubble.getElementsByTagName("path")[0];
				path.addEventListener("mouseover", () => {
					closeButton.style.display = "block";
					// path.style.cursor = "pointer";
					closeButton.style.cursor = "pointer";
					path.setAttribute("fill", this.getFinalAnnotationColor(annotation, true));
				});
				path.addEventListener("mouseout", e => {
					if (!e.relatedTarget.classList.contains("__cxt-ar-annotation-close__")) {
						closeButton.style.display ="none";
						// path.style.cursor = "default";
						closeButton.style.cursor = "default";
						path.setAttribute("fill", this.getFinalAnnotationColor(annotation, false));
					}
				});

				closeButton.addEventListener("mouseleave", () => {
					closeButton.style.display = "none";
					path.style.cursor = "default";
					closeButton.style.cursor = "default";
					path.setAttribute("fill", this.getFinalAnnotationColor(annotation, false));
				});

				el.prepend(bubble);
			}
			else if (annotation.type === "highlight") {
				el.style.backgroundColor = "";
				el.style.border = `2.5px solid ${this.getFinalAnnotationColor(annotation, false)}`;
				if (annotation.actionType === "url")
					el.style.cursor = "pointer";
			}
			else if (annotation.style !== "title") {
				el.style.backgroundColor = this.getFinalAnnotationColor(annotation);
				el.addEventListener("mouseenter", () => {
					el.style.backgroundColor = this.getFinalAnnotationColor(annotation, true);
				});
				el.addEventListener("mouseleave", () => {
					el.style.backgroundColor = this.getFinalAnnotationColor(annotation, false);
				});
				if (annotation.actionType === "url")
					el.style.cursor = "pointer";
			}

			el.style.color = `#${this.decimalToHex(annotation.fgColor)}`;

			el.setAttribute("data-ar-type", annotation.type);
			el.setAttribute("hidden", "");
			this.annotationsContainer.append(el);
		}
	}
	createCloseElement() {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 100 100")
		svg.classList.add("__cxt-ar-annotation-close__");

		const path = document.createElementNS(svg.namespaceURI, "path");
		path.setAttribute("d", "M25 25 L 75 75 M 75 25 L 25 75");
		path.setAttribute("stroke", "#bbb");
		path.setAttribute("stroke-width", 10)
		path.setAttribute("x", 5);
		path.setAttribute("y", 5);

		const circle = document.createElementNS(svg.namespaceURI, "circle");
		circle.setAttribute("cx", 50);
		circle.setAttribute("cy", 50);
		circle.setAttribute("r", 50);

		svg.append(circle, path);
		return svg;
	}
	createSvgSpeechBubble(x, y, width, height, pointX, pointY, color = "white", element, svg) {

		const horizontalBaseStartMultiplier = 0.17379070765180116;
		const horizontalBaseEndMultiplier = 0.14896346370154384;

		const verticalBaseStartMultiplier = 0.12;
		const verticalBaseEndMultiplier = 0.3;

		let path;

		if (!svg) {
			svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.classList.add("__cxt-ar-annotation-speech-bubble__");

			path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("fill", color);
			svg.append(path);
		}
		else {
			path = svg.children[0];
		}

		svg.style.position = "absolute";
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.style.left = "0";
		svg.style.top = "0";

		let positionStart;

		let baseStartX = 0;
		let baseStartY = 0;

		let baseEndX = 0;
		let baseEndY = 0;

		let pointFinalX = pointX;
		let pointFinalY = pointY;

		let commentRectPath;
		const pospad = 20;

		let textWidth = 0;
		let textHeight = 0;
		let textX = 0;
		let textY = 0;

		let textElement;
		let closeElement;

		if (element) {
			textElement = element.getElementsByTagName("span")[0];
			closeElement = element.getElementsByClassName("__cxt-ar-annotation-close__")[0];
		}

		if (pointX > ((x + width) - (width / 2)) && pointY > y + height) {
			positionStart = "br";
			baseStartX = width - ((width * horizontalBaseStartMultiplier) * 2);
			baseEndX = baseStartX + (width * horizontalBaseEndMultiplier);
			baseStartY = height;
			baseEndY = height;

			pointFinalX = pointX - x;
			pointFinalY = pointY - y;
			element.style.height = pointY - y;
			commentRectPath = `L${width} ${height} L${width} 0 L0 0 L0 ${baseStartY} L${baseStartX} ${baseStartY}`;
			if (textElement) {
				textWidth = width;
				textHeight = height;
				textX = 0;
				textY = 0;
			}
		}
		else if (pointX < ((x + width) - (width / 2)) && pointY > y + height) {
			positionStart = "bl";
			baseStartX = width * horizontalBaseStartMultiplier;
			baseEndX = baseStartX + (width * horizontalBaseEndMultiplier);
			baseStartY = height;
			baseEndY = height;

			pointFinalX = pointX - x;
			pointFinalY = pointY - y;
			element.style.height = `${pointY - y}px`;
			commentRectPath = `L${width} ${height} L${width} 0 L0 0 L0 ${baseStartY} L${baseStartX} ${baseStartY}`;
			if (textElement) {
				textWidth = width;
				textHeight = height;
				textX = 0;
				textY = 0;
			}
		}
		else if (pointX > ((x + width) - (width / 2)) && pointY < (y - pospad)) {
			positionStart = "tr";
			baseStartX = width - ((width * horizontalBaseStartMultiplier) * 2);
			baseEndX = baseStartX + (width * horizontalBaseEndMultiplier);

			const yOffset = y - pointY;
			baseStartY = yOffset;
			baseEndY = yOffset;
			element.style.top = y - yOffset + "px";
			element.style.height = height + yOffset + "px";

			pointFinalX = pointX - x;
			pointFinalY = 0;
			commentRectPath = `L${width} ${yOffset} L${width} ${height + yOffset} L0 ${height + yOffset} L0 ${yOffset} L${baseStartX} ${baseStartY}`;
			if (textElement) {
				textWidth = width;
				textHeight = height;
				textX = 0;
				textY = yOffset;
			}
		}
		else if (pointX < ((x + width) - (width / 2)) && pointY < y) {
			positionStart = "tl";
			baseStartX = width * horizontalBaseStartMultiplier;
			baseEndX = baseStartX + (width * horizontalBaseEndMultiplier);

			const yOffset = y - pointY;
			baseStartY = yOffset;
			baseEndY = yOffset;
			element.style.top = y - yOffset + "px";
			element.style.height = height + yOffset + "px";

			pointFinalX = pointX - x;
			pointFinalY = 0;
			commentRectPath = `L${width} ${yOffset} L${width} ${height + yOffset} L0 ${height + yOffset} L0 ${yOffset} L${baseStartX} ${baseStartY}`;

			if (textElement) {
				textWidth = width;
				textHeight = height;
				textX = 0;
				textY = yOffset;
			}
		}
		else if (pointX > (x + width) && pointY > (y - pospad) && pointY < ((y + height) - pospad)) {
			positionStart = "r";

			const xOffset = pointX - (x + width);

			baseStartX = width;
			baseEndX = width;

			element.style.width = width + xOffset + "px";

			baseStartY = height * verticalBaseStartMultiplier;
			baseEndY = baseStartY + (height * verticalBaseEndMultiplier);

			pointFinalX = width + xOffset;
			pointFinalY = pointY - y;
			commentRectPath = `L${baseStartX} ${height} L0 ${height} L0 0 L${baseStartX} 0 L${baseStartX} ${baseStartY}`;
			if (textElement) {
				textWidth = width;
				textHeight = height;
				textX = 0;
				textY = 0;
			}
		}
		else if (pointX < x && pointY > y && pointY < (y + height)) {
			positionStart = "l";

			const xOffset = x - pointX;

			baseStartX = xOffset;
			baseEndX = xOffset;

			element.style.left = x - xOffset + "px";
			element.style.width = width + xOffset + "px";

			baseStartY = height * verticalBaseStartMultiplier;
			baseEndY = baseStartY + (height * verticalBaseEndMultiplier);

			pointFinalX = 0;
			pointFinalY = pointY - y;
			commentRectPath = `L${baseStartX} ${height} L${width + baseStartX} ${height} L${width + baseStartX} 0 L${baseStartX} 0 L${baseStartX} ${baseStartY}`;
			if (textElement) {
				textWidth = width;
				textHeight = height;
				textX = xOffset;
				textY = 0;
			}
		}
		else {
			return svg;
		}

		if (textElement) {
			textElement.style.left = textX + "px";
			textElement.style.top = textY + "px";
			textElement.style.width = textWidth + "px";
			textElement.style.height = textHeight + "px";
		}
		if (closeElement) {
			const closeSize = parseFloat(this.annotationsContainer.style.getPropertyValue("--annotation-close-size"), 10);
			if (closeSize) {
				closeElement.style.left = ((textX + textWidth) + (closeSize / -1.8)) + "px";
				closeElement.style.top = (textY + (closeSize / -1.8)) + "px";
			}
		}

		const pathData = `M${baseStartX} ${baseStartY} L${pointFinalX} ${pointFinalY} L${baseEndX} ${baseEndY} ${commentRectPath}`;
		path.setAttribute("d", pathData);

		return svg;
	}
	getFinalAnnotationColor(annotation, hover = false) {
		const alphaHex = hover ? (0xE6).toString(16) : Math.floor((annotation.bgOpacity * 255)).toString(16);
		if (!isNaN(annotation.bgColor)) {
			const bgColorHex = this.decimalToHex(annotation.bgColor);

			const backgroundColor = `#${bgColorHex}${alphaHex}`;
			return backgroundColor;
		}
	}
	removeAnnotationElements() {
		for (const annotation of this.annotations) {
			annotation.__element.remove();
		}
	}
	update(videoTime) {
		for (const annotation of this.annotations) {
			const el = annotation.__element;
			if (el.hasAttribute("data-ar-closed")) continue;
			const start = annotation.timeStart;
			const end = annotation.timeEnd;

			if (el.hasAttribute("hidden") && (videoTime >= start && videoTime < end)) {
				el.removeAttribute("hidden");
				if (annotation.style === "speech" && annotation.__speechBubble) {
					annotation.__speechBubble.style.display = "block";
				}
			}
			else if (!el.hasAttribute("hidden") && (videoTime < start || videoTime > end)) {
				el.setAttribute("hidden", "");
				if (annotation.style === "speech" && annotation.__speechBubble) {
					annotation.__speechBubble.style.display = "none";
				}
			}
		}
	}
	start() {
		if (!this.playerOptions) throw new Error("playerOptions must be provided to use the start method");

		const videoTime = this.playerOptions.getVideoTime();
		if (!this.updateIntervalId) {
			this.update(videoTime);
			this.updateIntervalId = setInterval(() => {
				const videoTime = this.playerOptions.getVideoTime();
				this.update(videoTime);
				window.dispatchEvent(new CustomEvent("__ar_renderer_start"));
			}, this.updateInterval);
		}
	}
	stop() {
		if (!this.playerOptions) throw new Error("playerOptions must be provided to use the stop method");

		const videoTime = this.playerOptions.getVideoTime();
		if (this.updateIntervalId) {
			this.update(videoTime);
			clearInterval(this.updateIntervalId);
			this.updateIntervalId = null;
			window.dispatchEvent(new CustomEvent("__ar_renderer_stop"));
		}
	}

	updateAnnotationTextSize(annotation, containerHeight) {
		if (annotation.textSize) {
			const textSize = (annotation.textSize / 100) * containerHeight;
			annotation.__element.style.fontSize = `${textSize}px`;
		}
	}
	updateTextSize() {
		const containerHeight = this.container.getBoundingClientRect().height;
		// should be run when the video resizes
		for (const annotation of this.annotations) {
			this.updateAnnotationTextSize(annotation, containerHeight);
		}
	}
	updateCloseSize(containerHeight) {
		if (!containerHeight) containerHeight = this.container.getBoundingClientRect().height;
		const multiplier = 0.0423;
		this.annotationsContainer.style.setProperty("--annotation-close-size", `${containerHeight * multiplier}px`);
	}
	updateAnnotationDimensions(annotations, videoWidth, videoHeight) {
		const playerWidth = this.container.getBoundingClientRect().width;
		const playerHeight = this.container.getBoundingClientRect().height;

		const widthDivider = playerWidth / videoWidth;
		const heightDivider = playerHeight / videoHeight;

		let scaledVideoWidth = playerWidth;
		let scaledVideoHeight = playerHeight;

		if (widthDivider % 1 !== 0 || heightDivider % 1 !== 0) {
			// vertical bars
			if (widthDivider > heightDivider) {
				scaledVideoWidth = (playerHeight / videoHeight) * videoWidth;
				scaledVideoHeight = playerHeight;
			}
			// horizontal bars
			else if (heightDivider > widthDivider) {
				scaledVideoWidth = playerWidth;
				scaledVideoHeight = (playerWidth / videoWidth) * videoHeight;
			}
		}

		const verticalBlackBarWidth = (playerWidth - scaledVideoWidth) / 2;
		const horizontalBlackBarHeight = (playerHeight - scaledVideoHeight) / 2;

		const widthOffsetPercent = (verticalBlackBarWidth / playerWidth * 100);
		const heightOffsetPercent = (horizontalBlackBarHeight / playerHeight * 100);

		const widthMultiplier = (scaledVideoWidth / playerWidth);
		const heightMultiplier = (scaledVideoHeight / playerHeight);

		for (const annotation of annotations) {
			const el = annotation.__element;

			let ax = widthOffsetPercent + (annotation.x * widthMultiplier);
			let ay = heightOffsetPercent + (annotation.y * heightMultiplier);
			let aw = annotation.width * widthMultiplier;
			let ah = annotation.height * heightMultiplier;

			el.style.left = `${ax}%`;
			el.style.top = `${ay}%`;

			el.style.width = `${aw}%`;
			el.style.height = `${ah}%`;

			let horizontalPadding = scaledVideoWidth * 0.008;
			let verticalPadding = scaledVideoHeight * 0.008;

			if (annotation.style === "speech" && annotation.text) {
				const pel = annotation.__element.getElementsByTagName("span")[0];
				horizontalPadding *= 2;
				verticalPadding *= 2;

				pel.style.paddingLeft = horizontalPadding + "px";
				pel.style.paddingRight = horizontalPadding + "px";
				pel.style.paddingBottom = verticalPadding + "px";
				pel.style.paddingTop = verticalPadding + "px";
			}
			else if (annotation.style !== "speech") {
				el.style.paddingLeft = horizontalPadding + "px";
				el.style.paddingRight = horizontalPadding + "px";
				el.style.paddingBottom = verticalPadding + "px";
				el.style.paddingTop = verticalPadding + "px";
			}

			if (annotation.__speechBubble) {
				const asx = this.percentToPixels(playerWidth, ax);
				const asy = this.percentToPixels(playerHeight, ay);
				const asw = this.percentToPixels(playerWidth, aw);
				const ash = this.percentToPixels(playerHeight, ah);

				let sx = widthOffsetPercent + (annotation.sx * widthMultiplier);
				let sy = heightOffsetPercent + (annotation.sy * heightMultiplier);
				sx = this.percentToPixels(playerWidth, sx);
				sy = this.percentToPixels(playerHeight, sy);

				this.createSvgSpeechBubble(asx, asy, asw, ash, sx, sy, null, annotation.__element, annotation.__speechBubble);
			}

			this.updateAnnotationTextSize(annotation, scaledVideoHeight);
			this.updateCloseSize(scaledVideoHeight);
		}
	}

	updateAllAnnotationSizes() {
		if (this.playerOptions && this.playerOptions.getOriginalVideoWidth && this.playerOptions.getOriginalVideoHeight) {
			const videoWidth = this.playerOptions.getOriginalVideoWidth();
			const videoHeight = this.playerOptions.getOriginalVideoHeight();
			this.updateAnnotationDimensions(this.annotations, videoWidth, videoHeight);
		}
		else {
			const playerWidth = this.container.getBoundingClientRect().width;
			const playerHeight = this.container.getBoundingClientRect().height;
			this.updateAnnotationDimensions(this.annotations, playerWidth, playerHeight);
		}
	}

	hideAll() {
		for (const annotation of this.annotations) {
			annotation.__element.setAttribute("hidden", "");
		}
	}
	annotationClickHandler(e) {
		let annotationElement = e.target;
		// if we click on annotation text instead of the actual annotation element
		if (!annotationElement.matches(".__cxt-ar-annotation__") && !annotationElement.closest(".__cxt-ar-annotation-close__")) {
			annotationElement = annotationElement.closest(".__cxt-ar-annotation__");
			if (!annotationElement) return null;
		} 
		let annotationData = annotationElement.__annotation;

		if (!annotationElement || !annotationData) return;

		if (annotationData.actionType === "time") {
			const seconds = annotationData.actionSeconds;
			if (this.playerOptions) {
				this.playerOptions.seekTo(seconds);
				const videoTime = this.playerOptions.getVideoTime();
				this.update(videoTime);
			}
			window.dispatchEvent(new CustomEvent("__ar_seek_to", {detail: {seconds}}));
		}
		else if (annotationData.actionType === "url") {
			const data = {url: annotationData.actionUrl, target: annotationData.actionUrlTarget || "current"};

			const timeHash = this.extractTimeHash(new URL(data.url));
			if (timeHash && timeHash.hasOwnProperty("seconds")) {
				data.seconds = timeHash.seconds;
			}
			window.dispatchEvent(new CustomEvent("__ar_annotation_click", {detail: data}));
		}
	}

	setUpdateInterval(ms) {
		this.updateInterval = ms;
		this.stop();
		this.start();
	}
	// https://stackoverflow.com/a/3689638/10817894
	decimalToHex(dec) {
		let hex = dec.toString(16);
		hex = "000000".substr(0, 6 - hex.length) + hex; 
		return hex;
	}
	extractTimeHash(url) {
		if (!url) throw new Error("A URL must be provided");
		const hash = url.hash;

		if (hash && hash.startsWith("#t=")) {
			const timeString = url.hash.split("#t=")[1];
			const seconds = this.timeStringToSeconds(timeString);
			return {seconds};
		}
		else {
			return false;
		}
	}
	timeStringToSeconds(time) {
		let seconds = 0;

		const h = time.split("h");
	  	const m = (h[1] || time).split("m");
	  	const s = (m[1] || time).split("s");
		  
	  	if (h[0] && h.length === 2) seconds += parseInt(h[0], 10) * 60 * 60;
	  	if (m[0] && m.length === 2) seconds += parseInt(m[0], 10) * 60;
	  	if (s[0] && s.length === 2) seconds += parseInt(s[0], 10);

		return seconds;
	}
	percentToPixels(a, b) {
		return a * b / 100;
	}
}
function youtubeAnnotationsPlugin(options) {
	if (!options.annotationXml) throw new Error("Annotation data must be provided");
	if (!options.videoContainer) throw new Error("A video container to overlay the data on must be provided");

	const player = this;

	const xml = options.annotationXml;
	const parser = new AnnotationParser();
	const annotationElements = parser.getAnnotationsFromXml(xml);
	const annotations = parser.parseYoutubeAnnotationList(annotationElements);

	const videoContainer = options.videoContainer;

	const playerOptions = {
		getVideoTime() {
			return player.currentTime();
		},
		seekTo(seconds) {
			player.currentTime(seconds);
		},
		getOriginalVideoWidth() {
			return player.videoWidth();
		},
		getOriginalVideoHeight() {
			return player.videoHeight();
		}
	};

	raiseControls();
	const renderer = new AnnotationRenderer(annotations, videoContainer, playerOptions, options.updateInterval);
	setupEventListeners(player, renderer);
	renderer.start();
}

function setupEventListeners(player, renderer) {
	if (!player) throw new Error("A video player must be provided");
	// should be throttled for performance
	player.on("playerresize", e => {
		renderer.updateAllAnnotationSizes(renderer.annotations);
	});
	// Trigger resize since the video can have different dimensions than player
	player.one("loadedmetadata", e => {
		renderer.updateAllAnnotationSizes(renderer.annotations);
	});

	player.on("pause", e => {
		renderer.stop();
	});
	player.on("play", e => {
		renderer.start();
	});
	player.on("seeking", e => {
		renderer.update();
	});
	player.on("seeked", e => {
		renderer.update();
	});
}

function raiseControls() {
	const styles = document.createElement("style");
	styles.textContent = `
	.vjs-control-bar {
		z-index: 21;
	}
	`;
	document.body.append(styles);
}
