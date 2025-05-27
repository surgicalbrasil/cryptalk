/**
 * Node.js Web3.Storage Upload Test
 * Tests direct upload from Node.js to Web3.Storage using DID
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===== Node.js Web3.Storage Upload Test =====');

// Get user DID
let userDid;
try {
    userDid = execSync('w3 whoami', { encoding: 'utf8' }).trim();
    console.log(`Using DID: ${userDid}`);
} catch (error) {
    console.error('Error getting DID. Make sure you are logged in to Web3.Storage:');
    console.error(error.message);
    process.exit(1);
}

// Create a test file with timestamp
const timestamp = new Date().toISOString();
const testFilePath = path.join(__dirname, `test-file-${Date.now()}.txt`);
const testContent = `This is a test file for CrypTalk Web3.Storage integration.
Created at: ${timestamp}
DID: ${userDid}
`;

fs.writeFileSync(testFilePath, testContent);
console.log(`✅ Created test file: ${testFilePath}`);

// Upload using w3cli
console.log('Uploading file to Web3.Storage...');
try {
    const uploadResult = execSync(`w3 up "${testFilePath}"`, { encoding: 'utf8' });
    console.log('✅ Upload successful:');
    console.log(uploadResult);

    // Extract URL from upload result
    const urlMatch = uploadResult.match(/https:\/\/\S+/);
    if (urlMatch) {
        console.log(`Access your file at: ${urlMatch[0]}`);
    }
} catch (error) {
    console.error('❌ Upload failed:');
    console.error(error.message);
}

console.log('Test completed!');