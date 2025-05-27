/**
 * CrypTalk Web3.Storage Large File Upload Test
 * 
 * This script tests large file uploads to Web3.Storage
 * to ensure the integration can handle files of significant size
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const TEST_FILE_SIZE_MB = 5; // Size of test file in MB
const TEST_FILE_PATH = path.join(__dirname, `large-test-file-${Date.now()}.dat`);

console.log('===== CrypTalk Web3.Storage Large File Upload Test =====');

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

// Create a large test file
console.log(`Creating ${TEST_FILE_SIZE_MB}MB test file...`);
createLargeFile(TEST_FILE_PATH, TEST_FILE_SIZE_MB * 1024 * 1024);
console.log(`✅ Created test file: ${TEST_FILE_PATH}`);

// Upload using w3cli
console.log('Uploading large file to Web3.Storage...');
console.log('This may take a while depending on your connection speed...');
const startTime = Date.now();

try {
    const uploadResult = execSync(`w3 up "${TEST_FILE_PATH}"`, { encoding: 'utf8' });
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    
    console.log(`✅ Upload successful in ${duration.toFixed(2)} seconds:`);
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

// Clean up test file
try {
    fs.unlinkSync(TEST_FILE_PATH);
    console.log(`✅ Test file cleaned up: ${TEST_FILE_PATH}`);
} catch (error) {
    console.error(`⚠️ Could not delete test file: ${error.message}`);
}

console.log('Large file upload test completed!');

/**
 * Creates a file of specified size filled with random data
 * @param {string} filePath - Path where the file should be created
 * @param {number} sizeBytes - Size of the file in bytes
 */
function createLargeFile(filePath, sizeBytes) {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const fd = fs.openSync(filePath, 'w');
    
    let bytesWritten = 0;
    
    while (bytesWritten < sizeBytes) {
        const currentChunkSize = Math.min(chunkSize, sizeBytes - bytesWritten);
        const buffer = crypto.randomBytes(currentChunkSize);
        fs.writeSync(fd, buffer, 0, currentChunkSize);
        bytesWritten += currentChunkSize;
        
        // Show progress
        const progress = Math.floor((bytesWritten / sizeBytes) * 100);
        process.stdout.write(`\rProgress: ${progress}% (${Math.floor(bytesWritten / (1024 * 1024))}MB/${Math.floor(sizeBytes / (1024 * 1024))}MB)`);
    }
    
    fs.closeSync(fd);
    console.log(''); // New line after progress
}