const form = document.getElementById('upload-form');
const imageFile = document.getElementById('image-file');
const statusMessage = document.getElementById('status-message');
// const RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_SITE_KEY';
// This should be the URL from your API Gateway trigger
const API_ENDPOINT_URL = 'https://czwnbsdbq3.execute-api.us-west-1.amazonaws.com/default/generateUploadURL';

let nsfwModel;
nsfwjs.load().then(model => {
    nsfwModel = model;
    console.log('NSFWJS Model Loaded.');
});

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function showToast(message, duration = 1000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
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



document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Please select an image");

  try {
    // Step 1: Get a pre-signed URL from your Lambda API
    const res = await fetch(API_ENDPOINT_URL);
    const { uploadURL } = await res.json();

    // Step 2: Upload the file directly to S3
    await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });

    alert("✅ Image uploaded successfully!");
  } catch (err) {
    console.error(err);
    alert("❌ Upload failed.");
  }
});