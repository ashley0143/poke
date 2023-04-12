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
const progressBar1 = document.querySelector(".progress-bar");
const progressContainer1 = document.querySelector(".progress-container");

// Set the initial width of the progress bar to 0%
progressBar1.style.width = "0%";
progressContainer1.style.display = 'block';

// Attach an event listener to the window object to listen for the 'load' event
window.addEventListener("load", () => {
  progressBar1.style.width = "100%";
  setTimeout(() => {
    progressContainer1.style.display = 'none';
  }, 500);
});
  
document.addEventListener('DOMContentLoaded', function() {
let bgs = document.querySelectorAll('[data-bg]');
let bgCount = bgs.length;
  
function loadBg(index) {
 let bg = bgs[index];
let bgUrl = bg.getAttribute('data-bg');
  bg.style.backgroundImage = `url(${bgUrl})`;
    bg.removeAttribute('data-bg');
    bg.classList.add('loaded');
  }

  function lazyLoadBg() {
    for (let i = 0; i < bgCount; i++) {
      let bg = bgs[i];
      let bgRect = bg.getBoundingClientRect();
      if (bgRect.top < window.innerHeight && bgRect.bottom > 0) {
        loadBg(i);
      }
    }
  }
  
  lazyLoadBg();
  
  window.addEventListener('scroll', lazyLoadBg);
  window.addEventListener('resize', lazyLoadBg);
});
  
  const fadeInElements = () => {
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
};

fadeInElements();

window.addEventListener('scroll', fadeInElements);

document.addEventListener('fullscreenchange', () => {
  fadeInElements();
});

setInterval(fadeInElements, 500);


// Get all anchor links on the page except for links with "jump_to_time" onclick attribute
const links = document.querySelectorAll('a:not([data-onclick="jump_to_time"])');

// Add a click event listener to each link
links.forEach(link => {
  link.addEventListener('click', e => {
    // Check if the link's href includes a hash character
    if (!link.href.includes('#')) {
      e.preventDefault(); // Prevent the default link behavior

      // Create a loading spinner element
      const spinner = document.createElement('div');
      spinner.classList.add('spinner');

      // Create a loading overlay element
      const loading = document.createElement('div');
      loading.classList.add('loading');
      loading.appendChild(spinner);

      // Add the loading overlay to the body
      document.body.appendChild(loading);

      // Redirect to the link after a short delay to show the loading overlay
      setTimeout(() => {
        window.location.href = link.href;
      }, 100);
    }
  });
});

  
const a = document.querySelectorAll('a[data-onclick="jump_to_time"]');

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

a.forEach(link => {
  const href = link.getAttribute('href');
    if (link.dataset.jumpTime) {
    link.removeAttribute('href');
  }

  if (href && href.includes('&t=')) {
    const params = new URLSearchParams(href.split('?')[1]);
    const time = params.get('t');
    
    if (time) {
      link.dataset.jumpTime = time;
      link.addEventListener('click', jumpToTime);
      link.removeAttribute('href');
    }
  }
});


const urls = document.querySelectorAll('a[href*="/watch?v="]'); // get all links with "/watch?v=" in href attribute

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

  if (url.host !== 'www.youtube.com' && url.host !== 'youtube.com') {
      if (url.host !== "redirect.poketube.fun") {

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
        // Do something with the response
      })
      .catch(error => {
        spinner.classList.add('hide');
        text.classList.add('hide');
       console.clear()
        // Ignore network errors
        if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
          console.error(`Error fetching ${url.origin}: ${error}`);
        }
      
      });
  }
      }

});

console.clear()

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
  if (Math.floor(video.currentTime) % 1 === 0) { // save progress every 1 second
    saveProgress();
  }
});

video.addEventListener('ended', () => {
  removeProgress();
});

window.addEventListener('load', () => {
  resumeProgress();
});

  
const videoElement = document.getElementById("video");

// Listen for full screen change events on the video element
videoElement.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement === videoElement) {
          // If the video element is in full screen mode, remove the border radius
          videoElement.style.borderRadius = "0em ";
        } else {
          // If the video element exits full screen mode, restore the border radius
          videoElement.style.borderRadius = "16px";
        }
      });
// @license-end