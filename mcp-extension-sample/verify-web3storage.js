// Web3.Storage verification script
const fs = require('fs');
const path = require('path');

console.log('Starting Web3.Storage verification test...');

// Test functions
async function checkEnvironment() {
  console.log('Checking environment...');
  
  try {
    // Check if Node.js is available
    console.log(`Node.js version: ${process.version}`);
    
    // Check if Web3.Storage tools are available
    try {
      // Try to require web3.storage (if you've installed it)
      require.resolve('web3.storage');
      console.log('✅ web3.storage package is installed');
    } catch (e) {
      console.log('⚠️ web3.storage package is not installed. Run: npm install web3.storage');
    }
    
    // Check for the w3cli tool
    const { execSync } = require('child_process');
    try {
      const w3Version = execSync('w3 --version', { stdio: 'pipe' }).toString().trim();
      console.log(`✅ w3cli is installed: ${w3Version}`);
    } catch (e) {
      console.log('⚠️ w3cli is not installed or not in PATH. Run: npm install -g @web3-storage/w3cli');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Environment check failed:', error.message);
    return false;
  }
}

async function checkW3Setup() {
  console.log('\nChecking W3 setup...');
  
  try {
    const { execSync } = require('child_process');
    
    // Check if w3 is logged in
    try {
      const didOutput = execSync('w3 whoami', { stdio: 'pipe' }).toString().trim();
      console.log('✅ W3 account setup detected');
      console.log(`DID: ${didOutput}`);
      return true;
    } catch (e) {
      console.log('⚠️ W3 account not set up. Run the setup-w3up.ps1 script');
      return false;
    }
  } catch (error) {
    console.error('❌ W3 setup check failed:', error.message);
    return false;
  }
}

async function testStorage() {
  const testFilePath = path.join(__dirname, 'test-file.txt');
  
  console.log('\nCreating test file...');
  // Create a test file
  fs.writeFileSync(testFilePath, `Test file content created at ${new Date().toISOString()}`);
  console.log(`✅ Created test file at ${testFilePath}`);
  
  console.log('\nTo upload this file to Web3.Storage using w3cli, run:');
  console.log('w3 up ' + testFilePath);
  
  console.log('\nVerification tasks completed!');
}

// Run verification
async function runVerification() {
  try {
    const envOk = await checkEnvironment();
    const w3Ok = await checkW3Setup();
    await testStorage();
    
    console.log('\n===============================');
    if (envOk && w3Ok) {
      console.log('✅ Your environment is ready for Web3.Storage integration');
    } else {
      console.log('⚠️ Some setup steps are needed. Follow the instructions above.');
    }
    console.log('===============================');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

runVerification();