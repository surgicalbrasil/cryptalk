// Basic test for Web3.Storage
const fs = require('fs');
const path = require('path');

// Function to check if w3 command is available
async function checkW3Command() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('w3 --version', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ w3cli not found: ${error.message}`);
        resolve(false);
        return;
      }
      console.log(`✅ w3cli version: ${stdout.trim()}`);
      resolve(true);
    });
  });
}

// Function to test upload using w3cli
async function testUpload() {
  return new Promise((resolve) => {
    const testFile = path.join(__dirname, 'test-file.txt');
    
    // Create test file if it doesn't exist
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, `Test content created at ${new Date().toISOString()}`);
      console.log('Created test file');
    }
    
    const { exec } = require('child_process');
    console.log('Attempting to upload file using w3 up command...');
    
    exec(`w3 up "${testFile}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Upload failed: ${error.message}`);
        if (stderr) console.error(stderr);
        resolve(false);
        return;
      }
      
      console.log('✅ Upload successful!');
      console.log(stdout);
      resolve(true);
    });
  });
}

// Run tests
async function runTests() {
  console.log('=== Web3.Storage Basic Test ===');
  
  const w3Available = await checkW3Command();
  if (!w3Available) {
    console.log('Please install w3cli first: npm install -g @web3-storage/w3cli');
    console.log('Then run "w3 login" to authenticate');
    return;
  }
  
  await testUpload();
  console.log('=== Test Complete ===');
}

runTests();
