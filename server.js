const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configure Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function getDriveService() {
  let auth;
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
     auth = new google.auth.JWT(
       process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
       null,
       process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
       SCOPES
     );
  } else if (fs.existsSync(path.join(__dirname, 'service-account.json'))) {
     auth = new google.auth.GoogleAuth({
       keyFile: path.join(__dirname, 'service-account.json'),
       scopes: SCOPES,
     });
  } else {
     throw new Error("Google API credentials not found. Check README.md for setup instructions.");
  }

  return google.drive({ version: 'v3', auth });
}

// Upload endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const { image, eventName = 'Event' } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      console.error('GOOGLE_DRIVE_FOLDER_ID is missing in env');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const drive = await getDriveService();

    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create a readable stream from the buffer
    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);

    // Generate filename: eventName_timestamp_randomID.jpg
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    // Sanitize event name to prevent spaces/special chars in filename
    const safeEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeEventName}_${timestamp}_${randomId}.jpg`;

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: 'image/jpeg',
      body: bufferStream
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    res.json({
      success: true,
      fileId: response.data.id,
      message: 'Uploaded successfully 🎉'
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
