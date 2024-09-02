document.addEventListener("DOMContentLoaded", () => {
    const video = videojs('video', {
        controls: true,
        autoplay: false,
        preload: 'auto',

    });

    const qua = new URLSearchParams(window.location.search).get("quality") || "";
    localStorage.setItem(`progress-${new URLSearchParams(window.location.search).get('v')}`, 0);

    if (qua !== "medium") {
        const audio = document.getElementById('aud');

        const syncVolume = () => {
            audio.volume = video.volume();
        };

        const syncVolumeWithVideo = () => {
            video.volume(audio.volume);
        };

        const checkAudioBuffer = () => {
            const buffered = audio.buffered;
            const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
            return audio.currentTime <= bufferedEnd;
        };

        const isVideoBuffered = () => {
            // Check if video has enough buffered data
            const buffered = video.buffered();
            return buffered.length > 0 && buffered.end(buffered.length - 1) >= video.currentTime();
        };

        const handleSeek = () => {
            // Pause video and audio when seeking
            video.pause();
            audio.pause();

            // Sync audio with video during seeking
            if (Math.abs(video.currentTime() - audio.currentTime) > 0.3) {
                audio.currentTime = video.currentTime();
            }

            // Wait for audio to be buffered sufficiently
            if (!checkAudioBuffer()) {
                audio.addEventListener('canplay', () => {
                    if (video.paused && isVideoBuffered()) {
                        video.play();
                        audio.play();
                    }
                }, {
                    once: true
                });
            }
        };

        video.on('play', () => {
            if (Math.abs(video.currentTime() - audio.currentTime) > 0.3) {
                audio.currentTime = video.currentTime();
            }

            if (isVideoBuffered()) {
                audio.play();
            } else {
                video.pause();
            }
        });

        video.on('pause', () => {
            audio.pause();
        });



        video.on('seeking', handleSeek);

        video.on('seeked', () => {
            if (isVideoBuffered()) {
                video.play();
            }
            audio.play(); // Ensure audio is playing after seek
        });

        video.on('volumechange', syncVolume);
        audio.addEventListener('volumechange', syncVolumeWithVideo);

        // Listen for media control events
        document.addEventListener('play', () => {
            video.play();
            audio.play();
        });

        document.addEventListener('pause', () => {
            video.pause();
            audio.pause();
        });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                video.pause();
                audio.pause();
            }
        });
    }
});

window.pokePlayer = {
    ver:`16-vjs-${videojs.VERSION}`,
    canHasAmbientMode:true,
    video:new URLSearchParams(window.location.search).get('v'),
    supported_itag_list:["136", "140", "298", "18"],
    formats:["SD", "HD"],
}

var _yt_player= videojs;