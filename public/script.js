const EVENT_NAME = "Zara's 1st Birthday";

// DOM Elements
const views = {
    landing: document.getElementById('landing-view'),
    camera: document.getElementById('camera-view'),
    preview: document.getElementById('preview-view'),
    success: document.getElementById('success-view')
};

const startCameraBtn = document.getElementById('start-camera-btn');
const cancelCameraBtn = document.getElementById('cancel-camera-btn');
const captureBtn = document.getElementById('capture-btn');
const takeAnotherBtn = document.getElementById('take-another-btn');
const cameraFeed = document.getElementById('camera-feed');
const photoPreview = document.getElementById('photo-preview');
const photoCanvas = document.getElementById('photo-canvas');
const uploadStatus = document.getElementById('upload-status');
const liveWatermark = document.getElementById('live-watermark');
const uploadGalleryBtn = document.getElementById('upload-gallery-btn');
const fileUpload = document.getElementById('file-upload');

let stream = null;

// Initialize
liveWatermark.textContent = EVENT_NAME;
document.getElementById('event-title').textContent = EVENT_NAME;

// Switch Views
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
}

// Camera Functions
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Prefer back camera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        cameraFeed.srcObject = stream;
        showView('camera');
    } catch (err) {
        console.error("Camera access error:", err);
        alert("Unable to access camera. Please check permissions or ensure you are using HTTPS.");
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Capture & Process Image
function capturePhoto() {
    // Set canvas dimensions to match video feed
    photoCanvas.width = cameraFeed.videoWidth;
    photoCanvas.height = cameraFeed.videoHeight;
    const ctx = photoCanvas.getContext('2d');

    // Draw video frame to canvas
    ctx.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);

    // Add Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `bold ${Math.max(20, photoCanvas.height * 0.05)}px 'Playfair Display', serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = 'right';
    ctx.fillText(EVENT_NAME, photoCanvas.width - 40, photoCanvas.height - 40);

    // Compress image to base64 JPEG (0.8 quality)
    const compressedDataUrl = photoCanvas.toDataURL('image/jpeg', 0.8);
    
    // Show Preview
    photoPreview.src = compressedDataUrl;
    showView('preview');
    stopCamera();

    // Wait 1 second before uploading
    setTimeout(() => {
        uploadPhoto(compressedDataUrl);
    }, 1000);
}

// Handle Gallery Upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Set canvas dimensions
            photoCanvas.width = img.width;
            photoCanvas.height = img.height;
            const ctx = photoCanvas.getContext('2d');

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, photoCanvas.width, photoCanvas.height);

            // Add Watermark
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = `bold ${Math.max(20, photoCanvas.height * 0.05)}px 'Playfair Display', serif`;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.textAlign = 'right';
            ctx.fillText(EVENT_NAME, photoCanvas.width - 40, photoCanvas.height - 40);

            // Compress image to base64 JPEG (0.8 quality)
            const compressedDataUrl = photoCanvas.toDataURL('image/jpeg', 0.8);
            
            // Show Preview
            photoPreview.src = compressedDataUrl;
            showView('preview');

            // Wait 1 second before uploading
            setTimeout(() => {
                uploadPhoto(compressedDataUrl);
            }, 1000);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    event.target.value = '';
}

// Upload to Backend
async function uploadPhoto(dataUrl) {
    try {
        uploadStatus.style.display = 'flex';
        uploadStatus.querySelector('p').textContent = 'Uploading...';
        uploadStatus.querySelector('p').style.color = 'white';
        uploadStatus.querySelector('.spinner').style.display = 'block';

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: dataUrl,
                eventName: EVENT_NAME
            })
        });

        const result = await response.json();

        if (result.success) {
            showView('success');
        } else {
            throw new Error(result.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload Error:', error);
        uploadStatus.querySelector('.spinner').style.display = 'none';
        uploadStatus.querySelector('p').textContent = `Upload failed: ${error.message}. Please try again.`;
        uploadStatus.querySelector('p').style.color = '#ef4444';
        
        // Go back to landing page after error
        setTimeout(() => {
            showView('landing');
            uploadStatus.style.display = 'none';
            uploadStatus.querySelector('.spinner').style.display = 'block';
        }, 3000);
    }
}

// Event Listeners
startCameraBtn.addEventListener('click', startCamera);
if (uploadGalleryBtn) {
    uploadGalleryBtn.addEventListener('click', () => fileUpload.click());
}
if (fileUpload) {
    fileUpload.addEventListener('change', handleFileUpload);
}
cancelCameraBtn.addEventListener('click', () => {
    stopCamera();
    showView('landing');
});
captureBtn.addEventListener('click', capturePhoto);
takeAnotherBtn.addEventListener('click', () => {
    showView('landing');
});
