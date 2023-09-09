// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-3.0-or-later  

// Retrieve volume from local storage or set to max if not available
const initialVolume = localStorage.getItem('playerVolume') || 1;
const video = document.getElementById('video');
video.volume = initialVolume;

// Save volume to local storage whenever it changes
video.addEventListener('volumechange', function() {
  localStorage.setItem('playerVolume', this.volume);
});

// Get the progress bar and container elements
const progressBar = document.querySelector(".progress-bar");
const progressContainer = document.querySelector(".progress-container");

// Set the initial width of the progress bar to 0%
progressBar.style.width = "0%";
progressContainer.style.display = 'block';

// Attach an event listener to the window object to listen for the 'load' event
window.addEventListener("load", () => {
  progressBar.style.width = "100%";
  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 500);
});

// Lazy load background images
document.addEventListener('DOMContentLoaded', function() {
  const bgs = document.querySelectorAll('[data-bg]');
  let bgCount = bgs.length;

  function loadBg(index) {
    const bg = bgs[index];
    const bgUrl = bg.getAttribute('data-bg');
    bg.style.backgroundImage = `url(${bgUrl})`;
    bg.removeAttribute('data-bg');
    bg.classList.add('loaded');
  }

  function lazyLoadBg() {
    for (let i = 0; i < bgCount; i++) {
      const bg = bgs[i];
      const bgRect = bg.getBoundingClientRect();
      if (bgRect.top < window.innerHeight && bgRect.bottom > 0) {
        loadBg(i);
      }
    }
  }

  lazyLoadBg();

  window.addEventListener('scroll', lazyLoadBg);
  window.addEventListener('resize', lazyLoadBg);
});

// Fade in elements on scroll or fullscreen change
function fadeInElements() {
  const elements = document.querySelectorAll('.fade-in');
  const viewportHeight = window.innerHeight;
  elements.forEach(element => {
    const elementTop = element.getBoundingClientRect().top;
    const elementBottom = element.getBoundingClientRect().bottom;
    const isVisible = (elementTop < viewportHeight && elementBottom > 0);
    if (isVisible || document.fullscreenElement) {
      element.classList.add('fade-in-active');
    }
  });
}

window.addEventListener('scroll', fadeInElements);
document.addEventListener('fullscreenchange', fadeInElements);
setInterval(fadeInElements, 500);
 
function jumpToTime(e) {
  e.preventDefault();
  
  const link = e.target;
  const video = document.getElementById('video');
  const time = link.dataset.jumpTime;
  
  video.currentTime = time;

  window.location.hash = 'top'; // Add #video to the URL

  setTimeout(() => {
    history.replaceState(null, null, ' '); // Remove #video after 1 second
  }, 250);
}


// Handle click events for time-based links
const timeLinks = document.querySelectorAll('a[data-onclick="jump_to_time"]');
timeLinks.forEach(link => {
  const href = link.getAttribute('href');
  if (link.dataset.jumpTime && href && href.includes('&t=')) {
    const params = new URLSearchParams(href.split('?')[1]);
    const time = params.get('t');
    if (time) {
      link.dataset.jumpTime = time;
      link.addEventListener('click', jumpToTime);
      link.removeAttribute('href');
    }
  }
});

  

// Save and resume video progress
const videoId = new URLSearchParams(window.location.search).get('v');
const localStorageKey = `progress-${videoId}`;

function saveProgress() {
  localStorage.setItem(localStorageKey, video.currentTime);
}

function removeProgress() {
  localStorage.removeItem(localStorageKey);
}

function resumeProgress() {
  const progress = localStorage.getItem(localStorageKey);
  if (progress) {
    video.currentTime = progress;
  }
}

video.addEventListener('timeupdate', () => {
  if (Math.floor(video.currentTime) % 1 === 0) {
    saveProgress();
  }
});

video.addEventListener('ended', () => {
  removeProgress();
});

window.addEventListener('load', () => {
  resumeProgress();
});

// Adjust video element style on fullscreen change
const videoElement = document.getElementById("video");
videoElement.addEventListener("fullscreenchange", () => {
  videoElement.style.borderRadius = document.fullscreenElement === videoElement ? "0em" : "16px";
});

function fetchUrls(urls) {
  let fetchedCount = 0;

  urls.forEach(link => {
    const url = new URL(link.href);
    if (url.host !== 'www.youtube.com' && url.host !== 'youtube.com' && url.host !== "redirect.poketube.fun") {
      console.log(`Fetching ${url.origin}`);
      fetch(url.href)
        .then(response => {
          if (response.status === 500) {
            // do nothing
          }
          console.log(`Fetched ${url.origin}`);
          fetchedCount++;
          console.clear();
          if (fetchedCount === urls.length) {
            document.body.classList.remove('blur');
          }
        })
        .catch(error => {
          console.clear();
          if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
            console.error(`Error fetching ${url.origin}: ${error}`);
          }
        });
    }
  });
}

// Fetch channel URLs
const channelUrls = document.querySelectorAll('a[href*="/channel?id="]');
fetchUrls(channelUrls);

// Fetch download URLs
const downloadUrls = document.querySelectorAll('a[href*="/download?v="]');
fetchUrls(downloadUrls);

// fetch videos urls
const urls = document.querySelectorAll('a[href*="/watch?v="]');
fetchUrls(urls);

 var popupMenu = document.getElementById("popupMenu");
        var loopOption = document.getElementById("loopOption");
        var speedOption = document.getElementById("speedOption");

         video.addEventListener("contextmenu", function(event) {
            event.preventDefault();  

             popupMenu.style.display = "block";
            popupMenu.style.left = event.pageX + "px";
            popupMenu.style.top = event.pageY + "px";
        });

        // Hide the popup menu when clicking outside of it
        window.addEventListener("click", function(event) {
            if (event.target !== video) {
                popupMenu.style.display = "none";
            }
        });
  
    loopOption.addEventListener("click", function() {
            video.loop = !video.loop;
            if (video.loop) {
                alert("Looped!");
            } else {
              alert("unlooped!")
            }
        });

 speedOption.addEventListener("click", function() {
            var currentSpeed = video.playbackRate;
            var newSpeed = getNextSpeed(currentSpeed);
            video.playbackRate = newSpeed;
            speedOption.textContent = "Speed: " + newSpeed.toFixed(2) + "x";
        });

        function getNextSpeed(currentSpeed) {
            if (currentSpeed === 2) {
                return 0.25;
            } else if (currentSpeed === 0.25) {
                return 0.5;
            } else if (currentSpeed === 0.5) {
                return 0.75;
            } else if (currentSpeed === 0.75) {
                return 1;
            } else {
                return 2;
            }
        }

// @license-end