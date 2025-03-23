
console.log("JavaScript is running");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM is loaded");
});

// Configuration
const RATE_LIMIT_MS = 100; // Minimum time between clicks (10 clicks per second max)
const COOKIE_EXPIRY_DAYS = 1;

// Track last click time for rate limiting
let lastClickTime = 0;

// Initialize seen images set from cookie on load
let seenImages = new Set(getCookie('seenImages')?.split(',').filter(Boolean) || []);
let images = [];
let preloadedImages = [];

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

async function handleCatButtonClick() {
    // Rate limiting check
    const now = Date.now();
    if (now - lastClickTime < RATE_LIMIT_MS) {
        return; // Ignore clicks that are too fast
    }
    lastClickTime = now;
    showRandomCatImage();

    // Update local storage count
    let localClicks = parseInt(localStorage.getItem('catButtonClicks') || '0');
    localStorage.setItem('catButtonClicks', ++localClicks);
    
    // Update CountAPI (global count)
    try {
        fetch('https://msouthwick.com/command.add-cat-click').then(async response=>{
            const data = await response.text();
            displayGlobalClicks(data);
        });
    } catch (error) {
        console.error('Error updating global click count:', error);
    }

    // Update local click display
    document.getElementById('localClickCounter').textContent = localClicks;
}

async function showRandomCatImage() {
    const allImages = await getAllImageUrls();

    // Reset if all images have been seen
    if (seenImages.size >= allImages.length) {
        seenImages.clear();
        setCookie('seenImages', '', COOKIE_EXPIRY_DAYS);
    }

    // If preloaded images are empty, preload the next 6
    if (preloadedImages.length === 0) {
        preloadNextImages(6);
        console.log("next 6 images")
    }

    // Use the first preloaded image
    let selectedImage = preloadedImages.shift();

    // Update seen images
    seenImages.add(selectedImage);
    setCookie('seenImages', Array.from(seenImages).join(','), COOKIE_EXPIRY_DAYS);

    // Display the image
    document.getElementById('catImage').src = 'Cat-Imgs/' + selectedImage;
    console.log("loaded")
}

// Function to preload next `count` images
function preloadNextImages(count) {
    const allImages = images.length > 0 ? images : getAllImageUrls();
    let availableImages = allImages.filter(img => !seenImages.has(img));

    let numToPreload = Math.min(count, availableImages.length);
    for (let i = 0; i < numToPreload; i++) {
        let imgSrc = availableImages[i];
        let img = new Image();
        img.src = 'Cat-Imgs/' + imgSrc; // Preload the image
        preloadedImages.push(imgSrc);
    }
}

window.onload = async () => {
    // Initialize click counters
    const localClicks = localStorage.getItem('catButtonClicks') || '0';
    document.getElementById('localClickCounter').textContent = localClicks;
    displayGlobalClicks();
    // Add click handler
    document.getElementById('catButton').addEventListener('click', handleCatButtonClick);
    showRandomCatImage();
};

function displayGlobalClicks(n){
    if(n){
        document.getElementById('globalClickCounter').textContent = n + ' as of '+new Date().toLocaleTimeString({hour12:true});
    }
    try {
        fetch('https://msouthwick.com/command.cat-clicks').then(async response=>{
            const data = await response.text();
            document.getElementById('globalClickCounter').textContent = data + ' as of '+new Date().toLocaleTimeString({hour12:true});
        })
    } catch (error) {
        console.error('Error fetching global click count:', error);
    }
}

getAllImageUrls();

async function getAllImageUrls() {
    if(images.length == 0){
        let req = await fetch('paths.txt', { cache: "no-store" });
        let text = await req.text();
        images = text.split('\n').filter(e=>e);
        shuffleArray(images);
        document.querySelector('#total_images').innerHTML = images.length;
        return images;
    } else {
        return images;
    }
}

// Utility function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    console.log("images shuffled!")
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// On page load, check saved preference
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
		document.getElementById('toggle').checked = false;
    }
	else {
		document.getElementById('toggle').checked = true;
	}
});

function downloadCurrentImage() {
    // Get the current image
    const img = document.getElementById('catImage');
    const imgUrl = img.src;

    // Create a temporary link
    const link = document.createElement('a');
    link.href = imgUrl;

    // Get the filename from the URL
    const filename = imgUrl.split('/').pop();
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


