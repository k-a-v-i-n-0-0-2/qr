const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

async function testDrive() {
    console.log('\n--- Testing Google Drive Connection ---\n');
    
    // Check env vars
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID || '❌ Missing');
    console.log('');

    try {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

        const drive = google.drive({ version: 'v3', auth });

        // Test 1: Try to get access token (will fail if refresh token expired)
        console.log('1. Testing refresh token validity...');
        const tokenResponse = await auth.getAccessToken();
        console.log('   ✅ Refresh token is valid! Got access token.');

        // Test 2: Try to list files in the target folder
        console.log('\n2. Testing folder access...');
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const listResponse = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime desc',
            pageSize: 5
        });

        console.log(`   ✅ Folder accessible! Found ${listResponse.data.files.length} recent files:`);
        listResponse.data.files.forEach(f => {
            console.log(`      - ${f.name} (${f.createdTime})`);
        });

        // Test 3: Try a test upload
        console.log('\n3. Testing file upload...');
        const { Readable } = require('stream');
        const testBuffer = Buffer.from('test upload from diagnostic script');
        const testStream = new Readable();
        testStream.push(testBuffer);
        testStream.push(null);

        const uploadResponse = await drive.files.create({
            resource: {
                name: `TEST_DELETE_ME_${Date.now()}.txt`,
                parents: [folderId]
            },
            media: {
                mimeType: 'text/plain',
                body: testStream
            },
            fields: 'id, name'
        });

        console.log(`   ✅ Upload works! Created: ${uploadResponse.data.name} (ID: ${uploadResponse.data.id})`);
        
        // Clean up test file
        await drive.files.delete({ fileId: uploadResponse.data.id });
        console.log('   🧹 Cleaned up test file.');

        console.log('\n✅ ALL TESTS PASSED - Google Drive connection is working!\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
            console.log('\n🔑 Your refresh token has EXPIRED!');
            console.log('   This happens because your Google Cloud project is in "Testing" mode.');
            console.log('   Refresh tokens expire every 7 days in testing mode.\n');
            console.log('   FIX: Run "node setup-auth.js" to get a new refresh token,');
            console.log('   then update GOOGLE_REFRESH_TOKEN in your Netlify environment variables.\n');
            console.log('   PERMANENT FIX: Go to Google Cloud Console → OAuth consent screen');
            console.log('   → Publish the app to "Production" to get non-expiring refresh tokens.\n');
        } else if (error.message.includes('insufficient')) {
            console.log('\n📁 The folder ID might be wrong or the account lacks permission.');
        } else {
            console.log('\nFull error:', error);
        }
    }
}

testDrive();
