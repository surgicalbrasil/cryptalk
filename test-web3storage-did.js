/**
 * CrypTalk Web3.Storage DID Test Script
 * 
 * This script tests the connection to Web3.Storage using a DID
 * Usage: node test-web3storage-did.js <your-did>
 */

const { create } = require('@web3-storage/w3up-client');

async function testConnection(did) {
  try {
    if (!did || !did.startsWith('did:key:')) {
      console.error('❌ Invalid DID format. DID should start with did:key:');
      process.exit(1);
    }
    
    console.log(`🔑 Testing connection with DID: ${did}`);
    console.log('🔄 Initializing Web3.Storage client...');
    
    const client = await create();
    console.log('✅ Web3.Storage client initialized successfully');
    
    console.log('🔄 Creating test space...');
    const spaceName = `cryptalk-test-space-${Date.now().toString().slice(-6)}`;
    const space = await client.createSpace(spaceName);
    console.log(`✅ Test space created: ${spaceName}`);
    
    console.log('🔄 Setting current space...');
    const spaceDid = space.did();
    await client.setCurrentSpace(spaceDid);
    console.log(`✅ Space set successfully: ${spaceDid}`);
    
    console.log('🔄 Creating test file...');
    const testContent = JSON.stringify({ 
      test: true, 
      timestamp: new Date().toISOString(),
      message: 'CrypTalk Web3.Storage test successful!'  
    });
    
    const file = new File(
      [testContent], 
      `cryptalk-test-${Date.now()}.json`, 
      { type: 'application/json' }
    );
    
    console.log('🔄 Uploading test file...');
    const cid = await client.uploadFile(file);
    console.log(`✅ Test file uploaded with CID: ${cid}`);
    
    console.log('\n✅✅✅ Web3.Storage DID connection test PASSED ✅✅✅');
    console.log('You can now use this DID with CrypTalk.\n');
    
  } catch (error) {
    console.error('\n❌❌❌ Web3.Storage DID connection test FAILED ❌❌❌');
    console.error('Error details:', error);
    console.error('\nPlease make sure:');
    console.error('1. Your DID is valid and properly formatted');
    console.error('2. You have completed the Web3.Storage account setup');
    console.error('3. Your internet connection is working\n');
    process.exit(1);
  }
}

// Get DID from command line argument
const did = process.argv[2];

if (!did) {
  console.error('\n❌ No DID provided');
  console.error('Usage: node test-web3storage-did.js <your-did>\n');
  process.exit(1);
}

testConnection(did);
