const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { google } = require('googleapis');
const { Readable } = require('stream');

const app = express();
app.use(cors());
// Increase payload limit for base64 images
app.use(express.json({ limit: '10mb' }));

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveService() {
  let auth;
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  } else {
     throw new Error("Google API credentials not found in environment.");
  }

  return google.drive({ version: 'v3', auth });
}

const router = express.Router();

router.post('/upload', async (req, res) => {
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

    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const drive = await getDriveService();

    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
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

app.use('/api', router);

module.exports.handler = serverless(app);
