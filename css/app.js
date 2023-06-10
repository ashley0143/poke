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

// Handle click events on links
const links = document.querySelectorAll('a:not([data-onclick="jump_to_time"])');
links.forEach(link => {
  link.addEventListener('click', e => {
    if (!link.href.includes('#')) {
      e.preventDefault();
      const spinner = document.createElement('div');
      spinner.classList.add('spinner');
      const loading = document.createElement('div');
      loading.classList.add('loading');
      loading.appendChild(spinner);
      document.body.appendChild(loading);
      setTimeout(() => {
        window.location.href = link.href;
      }, 100);
    }
  });
});

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

// Fetch URLs and handle progress saving
const urls = document.querySelectorAll('a[href*="/watch?v="]');
const spinner = document.createElement('div');
spinner.id = 'fetch-spinner';
spinner.classList.add('hide');
document.body.appendChild(spinner);
const text = document.createElement('div');
text.id = 'fetch-text';
text.classList.add('hide');
document.body.appendChild(text);
document.body.classList.add('blur');

let fetchedCount = 0;

urls.forEach(link => {
  const url = new URL(link.href);
  if (url.host !== 'www.youtube.com' && url.host !== 'youtube.com' && url.host !== "redirect.poketube.fun") {
    console.log(`Fetching ${url.origin}`);
    spinner.classList.remove('hide');
    text.classList.remove('hide');
    fetch(url.href)
      .then(response => {
        if (response.status === 500) {
          // do nothing
        }
        console.log(`Fetched ${url.origin}`);
        fetchedCount++;
        console.clear()
        if (fetchedCount === urls.length) {
          spinner.classList.add('hide');
          text.classList.add('hide');
          document.body.classList.remove('blur');
        }
      })
      .catch(error => {
        spinner.classList.add('hide');
        text.classList.add('hide');
        console.clear()
        if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
          console.error(`Error fetching ${url.origin}: ${error}`);
        }
      });
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

// Fetch channel URLs
const channelUrls = document.querySelectorAll('a[href*="/channel?id="]');
let fetchedCountChannel = 0;

channelUrls.forEach(link => {
  const url = new URL(link.href);
  if (url.host !== 'www.youtube.com' && url.host !== 'youtube.com' && url.host !== "redirect.poketube.fun") {
    console.log(`Fetching ${url.origin}`);
    fetch(url.href)
      .then(response => {
        if (response.status === 500) {
          // do nothing
        }
        console.log(`Fetched ${url.origin}`);
        fetchedCountChannel++;
        console.clear()
        if (fetchedCountChannel === channelUrls.length) {
          document.body.classList.remove('blur');
        }
      })
      .catch(error => {
        console.clear()
        if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
          console.error(`Error fetching ${url.origin}: ${error}`);
        }
      });
  }
});

// Fetch download URLs
const downloadUrls = document.querySelectorAll('a[href*="/download?v="]');
downloadUrls.forEach(link => {
  const url = new URL(link.href);
  if (url.host !== 'www.youtube.com' && url.host !== 'youtube.com' && url.host !== "redirect.poketube.fun") {
    console.log(`Fetching ${url.origin}`);
    fetch(url.href)
      .then(response => {
        if (response.status === 500) {
          // do nothing
        }
        console.log(`Fetched ${url.origin}`);
        console.clear()
      })
      .catch(error => {
        console.clear()
        if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
          console.error(`Error fetching ${url.origin}: ${error}`);
        }
      });
  }
});
// @license-end