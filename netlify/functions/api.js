const { google } = require('googleapis');
const { Readable } = require('stream');

async function getDriveService() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      `Missing credentials: CLIENT_ID=${!!clientId}, CLIENT_SECRET=${!!clientSecret}, REFRESH_TOKEN=${!!refreshToken}`
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  // Force a token refresh to catch expired tokens early
  await auth.getAccessToken();

  return google.drive({ version: 'v3', auth });
}

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' }),
    };
  }

  // Route: only handle /upload
  const path = event.path.replace('/.netlify/functions/api', '').replace('/api', '');
  if (path !== '/upload' && path !== '/upload/') {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, message: `Unknown route: ${path}` }),
    };
  }

  console.log('--- Upload Started ---');

  try {
    const body = JSON.parse(event.body || '{}');
    const { image, eventName = 'Event' } = body;

    if (!image) {
      console.warn('Upload failed: No image data in request body');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'No image provided' }),
      };
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      console.error('GOOGLE_DRIVE_FOLDER_ID is missing in environment');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: 'Server configuration error: missing folder ID' }),
      };
    }

    console.log('Initializing Google Drive Service...');
    const drive = await getDriveService();

    console.log('Processing image buffer...');
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const safeEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeEventName}_${timestamp}_${randomId}.jpg`;

    console.log(`Uploading "${fileName}" to Google Drive (Folder: ${folderId})...`);

    const response = await drive.files.create({
      resource: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'image/jpeg',
        body: bufferStream,
      },
      fields: 'id',
    });

    console.log('✅ Upload Successful! File ID:', response.data.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileId: response.data.id,
        message: 'Uploaded successfully 🎉',
      }),
    };
  } catch (error) {
    console.error('❌ Upload Error:', error.message);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    let userMessage = 'Upload failed. Please try again.';
    if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
      userMessage = 'Server auth expired. Please contact the event organizer.';
      console.error('🔑 REFRESH TOKEN EXPIRED - Need to re-run setup-auth.js and update Netlify env vars');
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: userMessage,
        error: error.message,
      }),
    };
  } finally {
    console.log('--- Upload Request Finished ---');
  }
};
