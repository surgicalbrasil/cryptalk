/**
 * CrypTalk Web3.Storage Debug Utility
 * 
 * This script helps diagnose issues with Web3.Storage integration
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

console.log('===== CrypTalk Web3.Storage Debug Utility =====');

// Check system information
console.log('\n== System Information ==');
console.log(`OS: ${os.type()} ${os.release()}`);
console.log(`Node.js: ${process.version}`);
try {
    const npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
    console.log(`npm: ${npmVersion}`);
} catch (error) {
    console.error('❌ npm not found!');
}

// Check w3cli installation
console.log('\n== w3cli Installation ==');
try {
    const w3Version = execSync('w3 --version', { encoding: 'utf8' }).trim();
    console.log(`✅ w3cli version: ${w3Version}`);
} catch (error) {
    console.error('❌ w3cli not installed! Please run setup-w3up.ps1 first.');
    process.exit(1);
}

// Check login status and DID
console.log('\n== Web3.Storage Authentication ==');
try {
    const whoami = execSync('w3 whoami', { encoding: 'utf8' }).trim();
    console.log(`✅ Logged in as: ${whoami}`);
    
    // Check spaces
    try {
        const spaces = execSync('w3 space ls', { encoding: 'utf8' }).trim();
        console.log('\n== Available Spaces ==');
        console.log(spaces);
    } catch (err) {
        console.error('❌ Error listing spaces:', err.message);
    }

    // Check current space
    console.log('\n== Current Space ==');
    try {
        const currentSpace = execSync('w3 space use', { encoding: 'utf8' }).trim();
        console.log(`✅ Using space: ${currentSpace}`);
    } catch (err) {
        console.error('❌ No space currently in use');
    }
} catch (error) {
    console.error('❌ Not logged in to Web3.Storage! Run w3 login first.');
    process.exit(1);
}

// Check connection
console.log('\n== Connection Test ==');
const testFilePath = path.join(os.tmpdir(), `w3-test-${Date.now()}.txt`);
try {
    fs.writeFileSync(testFilePath, `Test file created at ${new Date().toISOString()}`);
    console.log(`✅ Created test file: ${testFilePath}`);
    
    console.log('Uploading test file...');
    const uploadResult = execSync(`w3 up "${testFilePath}"`, { encoding: 'utf8' });
    console.log('✅ Upload successful!');
    
    // Extract URL from upload result
    const urlMatch = uploadResult.match(/https:\/\/\S+/);
    if (urlMatch) {
        const url = urlMatch[0];
        console.log(`✅ File accessible at: ${url}`);
        
        // Check if file is accessible
        console.log('Checking file accessibility...');
        try {
            const result = execSync(`w3 open "${url.split('/').pop()}"`, { encoding: 'utf8' });
            console.log('✅ File is accessible');
        } catch (err) {
            console.warn('⚠️ Could not verify file accessibility:', err.message);
        }
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log(`✅ Test file cleaned up`);
} catch (error) {
    console.error('❌ Connection test failed:', error.message);
}

// Check integration with extension
console.log('\n== Extension Integration ==');
console.log('To test the extension:');
console.log('1. Open VS Code and run this extension in debug mode (F5)');
console.log('2. In the new VS Code window, run the "MCP Extension Sample: Add Gist Source" command');
console.log('3. Enter a gist URL containing MCP server definitions');
console.log('4. Verify that your MCP extension is communicating with Web3.Storage');

console.log('\n===== Debug Complete =====');