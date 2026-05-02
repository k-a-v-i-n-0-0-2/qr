# Capture Memories QR System

A complete web-based photo capture system that allows event guests to snap photos via their mobile browser and automatically uploads them to Google Drive.

## Tech Stack
- Frontend: HTML, CSS, Vanilla JS (Mobile First)
- Backend: Node.js, Express, Multer
- Storage: Google Drive API v3

## Setup Instructions

### 1. Set up Google Cloud & Google Drive API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "Event Photo Capture").
3. Navigate to **APIs & Services** > **Library**.
4. Search for **Google Drive API** and click **Enable**.

### 2. Create Service Account Credentials
1. In the Google Cloud Console, go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **Service account**.
3. Fill in the service account details and click **Create and Continue**.
4. Skip assigning roles (not strictly needed for just uploading to a shared folder) and click **Done**.
5. Find the created service account in the list, click the pencil icon to edit it.
6. Go to the **Keys** tab, click **Add Key** > **Create new key**.
7. Choose **JSON** and click **Create**. A JSON file will be downloaded.
8. Rename this file to `service-account.json` and place it in the root directory of this backend project. **DO NOT commit this file to GitHub!**

### 3. Set Up Google Drive Folder
1. Go to your personal or business Google Drive.
2. Create a new folder where you want the images to be uploaded (e.g., "Wedding Photos").
3. **Important**: Right-click the folder and click **Share**.
4. Share the folder with the `client_email` address found inside your `service-account.json` file. Give it **Editor** permissions.
5. Copy the Folder ID from the URL. (e.g., if the URL is `https://drive.google.com/drive/folders/1aBcD...`, the ID is `1aBcD...`).

### 4. Configure Environment Variables
1. Copy `.env.example` to `.env`.
2. Add your Google Drive Folder ID to the `.env` file.

```env
PORT=3000
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

// If deploying to Vercel/Netlify where you can't upload a JSON file, add these:
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="your_private_key_with_newlines_escaped_or_quoted"
```

### 5. Running Locally
1. Run `npm install` to install dependencies.
2. Run `node server.js` to start the backend.
3. Open `http://localhost:3000` in your browser. (Note: Camera access requires HTTPS or localhost).

### 6. Deployment
This project is designed to be easily deployed to a service like Vercel, Render, or Railway.
- **Render/Railway**: You can deploy the Node.js server directly. Add your environment variables in the dashboard.
- **Vercel**: You can use Vercel for the frontend and configure the `server.js` as a serverless function, or just deploy the frontend to Vercel and the backend to Render. If deploying together on a Node host, ensure the `public` folder is served statically as it currently is in `server.js`.

### 7. Generating the QR Code
Once deployed, your app will have a public URL (e.g., `https://my-event-app.onrender.com`).
1. Go to a free QR code generator like [QR Code Generator](https://www.qr-code-generator.com/) or use the built-in Chrome "Create QR Code" feature.
2. Enter your deployed URL.
3. Download the QR code and print it for your event! Guests just need to scan it to start snapping photos.
