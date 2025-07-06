const form = document.getElementById('upload-form');
const imageFile = document.getElementById('image-file');
const statusMessage = document.getElementById('status-message');
const RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_SITE_KEY';
// This should be the URL from your API Gateway trigger
const API_ENDPOINT_URL = 'YOUR_API_GATEWAY_ENDPOINT_URL';

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


// I still need to troubleshoot this part of the code ...
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusMessage.textContent = 'Processing...';

    if (!imageFile.files || imageFile.files.length === 0) {
        statusMessage.textContent = 'Please select an image file.';
        return;
    }

    const file = imageFile.files[0];
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);

    // 1. NSFWJS Check
    const predictions = await nsfwModel.classify(image);
    const isSafe = predictions.every(p => p.className !== 'Porn' && p.className !== 'Hentai' && p.className !== 'Sexy');

    if (!isSafe) {
        statusMessage.textContent = 'Error: Image was flagged as inappropriate.';
        return;
    }
    statusMessage.textContent = 'Image is safe. Proceeding...';

    // 2. reCAPTCHA v3 Token
    grecaptcha.ready(() => {
        grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' }).then(async (token) => {
            // 3. Send to Lambda
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                // We send the base64 string, but remove the data URL prefix
                const base64Image = reader.result.split(',')[1];

                try {
                    const response = await fetch(API_ENDPOINT_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            imageName: file.name,
                            imageBody: base64Image,
                            recaptchaToken: token
                        }),
                    });

                    const result = await response.json();
                    if (response.ok) {
                        statusMessage.textContent = `Success: ${result.message}`;
                    } else {
                        statusMessage.textContent = `Error: ${result.message}`;
                    }
                } catch (error) {
                    statusMessage.textContent = 'An error occurred while uploading.';
                    console.error(error);
                }
            };
        });
    });
});