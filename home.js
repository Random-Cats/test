// Configuration
const RATE_LIMIT_MS = 100; // Minimum time between clicks (10 clicks per second max)
const COOKIE_EXPIRY_DAYS = 1;

// Track last click time for rate limiting
let lastClickTime = 0;

// Initialize seen images set from cookie on load
let seenImages = new Set(getCookie('seenImages')?.split(',').filter(Boolean) || []);

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

    // Update local storage count
    let localClicks = parseInt(localStorage.getItem('catButtonClicks') || '0');
    localStorage.setItem('catButtonClicks', ++localClicks);
    
    // Update CountAPI (global count)
    try {
        const response = await fetch('https://msouthwick.com/command.add-cat-click');
        const data = await response.json();
        document.getElementById('globalClickCounter').textContent = data.value;
    } catch (error) {
        console.error('Error updating global click count:', error);
    }

    // Update local click display
    document.getElementById('localClickCounter').textContent = localClicks;

    // Handle image selection
    await showRandomCatImage();
}

async function showRandomCatImage() {
    // This assumes you have an array of all possible image URLs
    const allImages = await getAllImageUrls(); // You'll need to implement this based on your GitHub structure
    
    // Reset if all images have been seen
    if (seenImages.size >= allImages.length) {
        seenImages.clear();
        setCookie('seenImages', '', COOKIE_EXPIRY_DAYS);
    }

    // Find an unseen image
    let availableImages = allImages.filter(img => !seenImages.has(img));
    let selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];

    // Update seen images
    seenImages.add(selectedImage);
    setCookie('seenImages', Array.from(seenImages).join(','), COOKIE_EXPIRY_DAYS);

    // Display the image
    document.getElementById('catImage').src = 'Cat-Imgs/'+selectedImage;
}

// Initial setup
window.onload = async () => {
    // Initialize click counters
    const localClicks = localStorage.getItem('catButtonClicks') || '0';
    document.getElementById('localClickCounter').textContent = localClicks;

    try {
        const response = await fetch('https://msouthwick.com/command.cat-clicks');
        const data = await response.text();
        document.getElementById('globalClickCounter').textContent = data.value;
    } catch (error) {
        console.error('Error fetching global click count:', error);
    }

    // Add click handler
    document.getElementById('catButton').addEventListener('click', handleCatButtonClick);
};

async function getAllImageUrls() {

    let req= fetch('paths.txt');
    let text = req.text();

    return text;

}


// In your JavaScript file
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// On page load, check saved preference
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
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








