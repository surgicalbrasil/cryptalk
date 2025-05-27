// Simple script to test Web3.Storage IPFS functionality
const { Web3Storage } = require('web3.storage');

// Your Web3.Storage token
const token = 'z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';
const client = new Web3Storage({ token });

// Function to create and upload a file
async function testUpload() {
  console.log('Testing Web3.Storage with your token...');
  
  try {
    // Create a test file
    const testContent = `This is a test file created at ${new Date().toISOString()}`;
    const file = new File([testContent], 'test-web3storage.txt', { type: 'text/plain' });
    
    console.log('Uploading file to IPFS via Web3.Storage...');
    const cid = await client.put([file], { name: 'test-file' });
    
    console.log(`✅ Success! File uploaded to Web3.Storage.`);
    console.log(`🔗 CID: ${cid}`);
    console.log(`🌐 View at: https://${cid}.ipfs.w3s.link/test-web3storage.txt`);
    
    // Try to retrieve the file status
    console.log('Checking file status...');
    const status = await client.status(cid);
    console.log(`📊 File status: ${status ? 'Found' : 'Not found'}`);
    
    // List recent uploads
    console.log('Listing recent uploads...');
    let count = 0;
    for await (const upload of client.list({ maxResults: 5 })) {
      console.log(`- ${upload.name || 'Unnamed'} (${upload.cid}) - Created: ${upload.created}`);
      count++;
    }
    console.log(`Found ${count} uploads.`);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Web3.Storage:', error.message);
    return false;
  }
}

// Run the test
testUpload()
  .then(success => {
    if (success) {
      console.log('✅ Web3.Storage key test completed successfully!');
    } else {
      console.error('❌ Web3.Storage key test failed.');
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });
