

// Array of image paths - replace with your actual image paths
const images = [
    '/path/to/image1.jpg',
    '/path/to/image2.jpg',
    '/path/to/image3.jpg',
    // Add more image paths as needed
];

let localClicks = parseInt(localStorage.getItem('localClicks')) || 0;
let globalClicks = 0; // This would normally be fetched from a server

// Update initial display
document.getElementById('localCounter').textContent = localClicks;
document.getElementById('globalCounter').textContent = globalClicks;

function handleClick() {
    // Update local clicks
    localClicks++;
    localStorage.setItem('localClicks', localClicks);
    document.getElementById('localCounter').textContent = localClicks;

    // Update global clicks (would normally involve a server call)
    globalClicks++;
    document.getElementById('globalCounter').textContent = globalClicks;

    // Change image
    changeImage();
}

function changeImage() {
    const img = document.getElementById('randomImage');
    const randomIndex = Math.floor(Math.random() * images.length);
    img.src = images[randomIndex];
}

// Change image on page load
changeImage();



