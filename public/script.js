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
const switchCameraBtn = document.getElementById('switch-camera-btn');
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
let currentFacingMode = 'environment'; // Default to back camera for event guests

// Initialize
if (liveWatermark) {
    liveWatermark.textContent = EVENT_NAME;
}
const eventTitle = document.getElementById('event-title');
if (eventTitle) {
    eventTitle.textContent = EVENT_NAME;
}

// Switch Views
function showView(viewName) {
    Object.values(views).forEach(v => {
        if (v) v.classList.remove('active');
    });
    if (views[viewName]) views[viewName].classList.add('active');
}

// Camera Functions
async function startCamera() {
    stopCamera(); // Stop any active stream first
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode
            },
            audio: false
        });
        cameraFeed.srcObject = stream;
        
        // Handle mirroring style visually for selfie view
        if (currentFacingMode === 'user') {
            cameraFeed.classList.add('mirror');
        } else {
            cameraFeed.classList.remove('mirror');
        }
        
        showView('camera');
    } catch (err) {
        console.error("Camera access error:", err);
        // Fallback: If environment (back) camera is requested but fails (e.g. on PC), try selfie camera
        if (currentFacingMode === 'environment') {
            console.log("Back camera failed, falling back to selfie camera...");
            currentFacingMode = 'user';
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: currentFacingMode
                    },
                    audio: false
                });
                cameraFeed.srcObject = stream;
                cameraFeed.classList.add('mirror');
                showView('camera');
            } catch (fallbackErr) {
                console.error("Selfie camera fallback failed:", fallbackErr);
                alert("Unable to access camera. Please check permissions or ensure you are using HTTPS.");
            }
        } else {
            alert("Unable to access camera. Please check permissions or ensure you are using HTTPS.");
        }
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

async function toggleCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await startCamera();
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

    // Handle horizontal flip if we are using the selfie camera
    if (currentFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }

    // Draw video frame to canvas
    ctx.drawImage(cameraFeed, 0, 0, width, height);

    // Reset horizontal flip transformation so the watermark text is NOT mirrored/backwards
    if (currentFacingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Watermark removed by request

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

            // Watermark removed by request

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
        const statusText = uploadStatus.querySelector('p');
        if (statusText) statusText.textContent = 'Uploading your memory...';
        
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
        
        const statusText = uploadStatus.querySelector('p');
        if (statusText) {
            statusText.textContent = `Upload failed: ${error.message}. Please try again.`;
            statusText.style.color = '#b05a5a';
        }
        
        // Go back to landing page after error
        setTimeout(() => {
            showView('landing');
            uploadStatus.style.display = 'none';
            if (loader) loader.style.display = 'block';
            if (statusText) statusText.style.color = '';
        }, 3500);
    }
}

// Event Listeners
if (startCameraBtn) {
    startCameraBtn.addEventListener('click', startCamera);
}
if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', toggleCamera);
}
if (uploadGalleryBtn) {
    uploadGalleryBtn.addEventListener('click', () => fileUpload.click());
}
if (fileUpload) {
    fileUpload.addEventListener('change', handleFileUpload);
}
if (cancelCameraBtn) {
    cancelCameraBtn.addEventListener('click', () => {
        stopCamera();
        showView('landing');
    });
}
if (captureBtn) {
    captureBtn.addEventListener('click', capturePhoto);
}
if (takeAnotherBtn) {
    takeAnotherBtn.addEventListener('click', () => {
        showView('landing');
    });
}
