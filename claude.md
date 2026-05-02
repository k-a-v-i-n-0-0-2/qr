You are a senior full-stack developer.

Build a complete web-based QR photo capture system for event guests with the following requirements:

GOAL:
Guests scan a QR code → opens a mobile-friendly web page → opens camera → captures photo → automatically uploads to my Google Drive.

TECH STACK:

* Frontend: HTML, CSS, Vanilla JavaScript (mobile-first)
* Backend: Node.js (Express)
* Storage: Google Drive API
* Hosting-ready (Netlify/Vercel for frontend + Node backend)

FEATURES:

1. LANDING PAGE

* Clean UI with event title (e.g., "Capture Memories")
* Button: "Open Camera"
* Works smoothly on mobile browsers (Chrome, Safari)

2. CAMERA FUNCTIONALITY

* Use getUserMedia API
* Show live camera preview
* Capture button
* After capture → show preview for 1 second → auto upload

3. AUTO UPLOAD SYSTEM

* Send captured image (base64 or blob) to backend
* Backend uploads image to Google Drive folder
* File naming format:
  eventName_timestamp_randomID.jpg

4. GOOGLE DRIVE INTEGRATION

* Use Google Drive API
* Authenticate using service account JSON
* Upload images to a specific folder ID
* Return success response

5. BACKEND (Node.js)

* Endpoint: POST /upload
* Accept image file
* Upload to Google Drive
* Return JSON success/failure

6. QR CODE

* Generate a QR code that points to deployed frontend URL

7. UI/UX

* Minimal, fast, no login required
* Show "Uploading..." indicator
* Show "Uploaded Successfully 🎉"

8. OPTIONAL (if possible)

* Add watermark text (event name)
* Compress image before upload

OUTPUT FORMAT:

* Full frontend code (index.html, style.css, script.js)
* Full backend code (server.js)
* Instructions to:

  * Set up Google Cloud
  * Enable Drive API
  * Add credentials
  * Deploy project
  * Generate QR code

IMPORTANT:

* Ensure compatibility with mobile browsers
* Handle camera permission errors
* Handle upload failures gracefully
* Optimize for low network speed

DO NOT give partial code. Provide complete working system.
