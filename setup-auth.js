const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_ID.includes('YOUR_CLIENT_ID')) {
  console.log('\n❌ Google Client ID or Secret missing in .env file.');
  console.log('Please ensure your .env file has GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

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
    
    let envContent = fs.readFileSync('.env', 'utf8');
    
    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }
    
    fs.writeFileSync('.env', envContent);
    
    console.log('✅ Updated GOOGLE_REFRESH_TOKEN in your .env file.');
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
