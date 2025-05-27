// Test W3Up DID Integration
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting W3Up DID Integration Test...');

// Test functions
async function checkW3UpTools() {
  console.log('Checking W3Up tools...');
  
  try {
    // Check for w3cli
    try {
      const w3Version = execSync('w3 --version', { stdio: 'pipe' }).toString().trim();
      console.log(`✅ w3cli installed: ${w3Version}`);
    } catch (e) {
      console.error('❌ w3cli not installed. Please run: npm install -g @web3-storage/w3cli');
      return false;
    }
      // Check for DID
    try {
      const did = execSync('w3 whoami', { stdio: 'pipe' }).toString().trim();
      console.log(`✅ DID found: ${did}`);
      return did;
    } catch (e) {
      console.error('❌ DID not set up. Please run setup-w3up.ps1 first');
      return false;
    }
  } catch (error) {
    console.error('❌ Tool check failed:', error.message);
    return false;
  }
}

async function testUpload() {
  try {
    console.log('\nTesting file upload with w3up...');
    
    // Create test file
    const testFilePath = path.join(__dirname, `test-file-${Date.now()}.txt`);
    fs.writeFileSync(testFilePath, `Test content created at ${new Date().toISOString()}`);
    console.log(`✅ Created test file at ${testFilePath}`);
    
    // Try uploading with w3
    try {
      console.log('Uploading to Web3.Storage...');
      const uploadResult = execSync(`w3 up "${testFilePath}"`, { stdio: 'pipe' }).toString().trim();
      console.log(`✅ Upload successful: ${uploadResult}`);
      return uploadResult;
    } catch (e) {
      console.error('❌ Upload failed:', e.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    return false;
  }
}

async function runIntegrationTest() {
  try {
    console.log('====================================');
    console.log('W3Up DID Integration Test');
    console.log('====================================\n');
    
    const did = await checkW3UpTools();
    if (!did) {
      console.error('❌ Setup incomplete. Please run setup-w3up.ps1 first.');
      return;
    }
    
    const uploadResult = await testUpload();
    if (!uploadResult) {
      console.error('❌ Upload test failed. Please check your setup.');
      return;
    }
    
    console.log('\n====================================');
    console.log('✅ W3Up DID Integration Test Passed!');
    console.log('====================================');
    
    console.log('\nNext Steps:');
    console.log('1. Make sure your CrypTalk extension uses this DID:', did);
    console.log('2. Access your uploaded content at:', uploadResult);
    console.log('3. Run your MCP extension with: "Run Extension" in VS Code Debug view');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

runIntegrationTest();