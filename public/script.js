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
    // Scale down if image is too large (max 1200px)
    const MAX_DIM = 1200;
    let width = cameraFeed.videoWidth;
    let height = cameraFeed.videoHeight;
    if (width > height) {
        if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
        }
    } else {
        if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
        }
    }

    photoCanvas.width = width;
    photoCanvas.height = height;
    const ctx = photoCanvas.getContext('2d');

    // Draw video frame to canvas
    ctx.drawImage(cameraFeed, 0, 0, width, height);

    // Add Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `bold ${Math.max(20, height * 0.05)}px 'Outfit', sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = 'right';
    ctx.fillText(EVENT_NAME, width - 40, height - 40);

    // Compress image to base64 JPEG (0.6 quality for faster upload)
    const compressedDataUrl = photoCanvas.toDataURL('image/jpeg', 0.6);
    
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
            // Scale down if image is too large (max 1200px)
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                }
            } else {
                if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                }
            }

            photoCanvas.width = width;
            photoCanvas.height = height;
            const ctx = photoCanvas.getContext('2d');

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Add Watermark
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = `bold ${Math.max(20, height * 0.05)}px 'Outfit', sans-serif`;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.textAlign = 'right';
            ctx.fillText(EVENT_NAME, width - 40, height - 40);

            // Compress image to base64 JPEG (0.6 quality)
            const compressedDataUrl = photoCanvas.toDataURL('image/jpeg', 0.6);
            
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
        uploadStatus.style.display = 'flex';
        uploadStatus.querySelector('p').textContent = 'Inking the page...';
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: dataUrl,
                eventName: EVENT_NAME
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error (${response.status})`);
        }

        const result = await response.json();

        if (result.success) {
            showView('success');
        } else {
            throw new Error(result.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload Error:', error);
        const loader = uploadStatus.querySelector('.modern-loader');
        if (loader) loader.style.display = 'none';
        uploadStatus.querySelector('p').textContent = `Upload failed: ${error.message}. Please try again.`;
        uploadStatus.querySelector('p').style.color = '#ef4444';
        
        // Go back to landing page after error
        setTimeout(() => {
            showView('landing');
            uploadStatus.style.display = 'none';
            const loader = uploadStatus.querySelector('.modern-loader');
            if (loader) loader.style.display = 'block';
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
