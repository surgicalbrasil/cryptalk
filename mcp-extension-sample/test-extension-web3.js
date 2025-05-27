/**
 * CrypTalk Extension Web3.Storage Test 
 * 
 * This script tests the integration between the MCP extension and Web3.Storage
 */
const fs = require('fs');
const path = require('path');

// Your DID from Web3.Storage
const userDid = process.env.W3_DID || 'did:key:z6Mkqgr8azLX7omHiisB8AWwrHcQwJ29HiKyYzP9cHb5z3cH';

console.log('\n===== CrypTalk Web3.Storage Integration Test =====\n');
console.log(`Using DID: ${userDid}`);

// Check if the DID value is available
if (!userDid) {
  console.error('Error: No Web3.Storage DID found. Please set W3_DID environment variable.');
  process.exit(1);
}

// Create a test message file
const testMessage = {
  content: "This is a test message for CrypTalk",
  timestamp: new Date().toISOString(),
  sender: userDid.substring(0, 20) + '...',
  type: 'text'
};

const testFilePath = path.join(__dirname, 'test-message.json');
fs.writeFileSync(testFilePath, JSON.stringify(testMessage, null, 2));
console.log(`✅ Created test message file at: ${testFilePath}`);

console.log('\n===== Test Instructions =====');
console.log('1. Launch VS Code with your extension (F5 or "Run Extension" in Debug)');
console.log('2. In the new VS Code window, run the "CrypTalk: Configure Web3.Storage with DID" command');
console.log(`3. Enter your DID: ${userDid}`);
console.log('4. Run the "CrypTalk: Test Web3.Storage DID Connection" command');
console.log('5. If successful, you should see a success message');
console.log('6. Try uploading the test message file using the extension');

console.log('\nNote: To test with the MCP functionality:');
console.log('1. Run the "Add Gist Source" command');
console.log('2. Enter a gist URL containing MCP server definitions');
console.log('3. Test the chat functionality with Web3.Storage integration');
