const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');

// You need to get these from Google Cloud Console -> Credentials -> OAuth client ID (Desktop app)
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';

if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
  console.log('\n❌ Please edit setup-auth.js and replace YOUR_CLIENT_ID_HERE and YOUR_CLIENT_SECRET_HERE');
  console.log('To get them:');
  console.log('1. Go to Google Cloud Console -> APIs & Services -> Credentials');
  console.log('2. Click "Create Credentials" -> "OAuth client ID"');
  console.log('3. Choose "Desktop app" as Application type');
  console.log('4. Copy the Client ID and Client Secret into this file.\n');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Forces it to give us a refresh token
});

console.log('\n=============================================');
console.log('1. Click this link to authorize the app:');
console.log(authUrl);
console.log('=============================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const express = require('express');
const app = express();
let server;

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send('Error: No code found in URL');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    res.send('<h1>Success!</h1><p>You can close this tab and return to your terminal.</p>');
    
    console.log('\n✅ Successfully got tokens!');
    console.log('Refresh Token:', tokens.refresh_token);
    
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }
    
    envContent += `\nGOOGLE_CLIENT_ID=${CLIENT_ID}\nGOOGLE_CLIENT_SECRET=${CLIENT_SECRET}\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    fs.writeFileSync('.env', envContent);
    
    console.log('✅ Appended GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to your .env file.');
    console.log('You can now restart your server (node server.js) and it will use your personal quota!\n');
    
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error retrieving access token', err);
    res.send('Error retrieving access token: ' + err.message);
  }
});

server = app.listen(3000, () => {
  console.log('Waiting for you to log in...');
});
