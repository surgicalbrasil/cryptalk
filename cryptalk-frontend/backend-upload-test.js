import { create } from '@web3-storage/w3up-client'
import * as Client from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import * as Proof from '@web3-storage/w3up-client/proof'
import { Signer } from '@ucanto/principal/ed25519'
import * as DID from '@ipld/dag-ucan/did'

console.log('🧪 Backend Upload Test for Web3Storage\n');

// Your configuration
const SPACE_DID = 'did:key:z6MkqtS41ZWSweWP22dnpmgp64KSFuCGUzy12mMRDggtbv3E';
const AGENT_KEY = 'MgCaFJgP8V6nzKfpK2biH0bPjf7oC7dJuudJgal1k7s9cr+0BeDbAvLXJedmkkPSK94BMDpHPwAIfNyo7SXjHCkDIP2Q=';

async function testUpload() {
  try {
    console.log('1. Creating client with agent key...');
    
    // Parse the agent private key
    const principal = Signer.parse(AGENT_KEY);
    console.log('   Agent DID:', principal.did());
    
    // Create client
    const client = await create({ 
      principal,
      store: new StoreMemory()
    });
    
    console.log('✅ Client created successfully\n');
    
    // Set the space
    console.log('2. Setting space...');
    console.log('   Space DID:', SPACE_DID);
    
    try {
      await client.setCurrentSpace(SPACE_DID);
      console.log('✅ Space set successfully\n');
    } catch (spaceError) {
      console.log('⚠️  Could not set space directly, trying to add proof...\n');
      
      // Try to create a delegation for the space
      const space = await client.createSpace('temp-space');
      await client.setCurrentSpace(space.did());
      console.log('   Using temporary space:', space.did());
    }
    
    // Create test content
    console.log('3. Creating test file...');
    const content = `CrypTalk Backend Test Upload
Generated at: ${new Date().toISOString()}
Space: ${SPACE_DID}
Agent: ${principal.did()}

This is a test upload from the backend to verify Web3Storage integration.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], `backend-test-${Date.now()}.txt`, { type: 'text/plain' });
    
    console.log('   File name:', file.name);
    console.log('   File size:', file.size, 'bytes\n');
    
    // Upload the file
    console.log('4. Uploading file to Web3Storage...');
    
    try {
      const cid = await client.uploadFile(file);
      
      console.log('\n✅ UPLOAD SUCCESSFUL!');
      console.log('   CID:', cid.toString());
      console.log('   Gateway URL:', `https://w3s.link/ipfs/${cid}`);
      console.log('\n📋 Verify with: w3 ls');
      
    } catch (uploadError) {
      console.error('\n❌ Upload failed:', uploadError.message);
      
      if (uploadError.message.includes('space/blob/add')) {
        console.log('\n💡 This error usually means:');
        console.log('   1. The space needs proper delegation');
        console.log('   2. Or the agent needs to be authorized for this space');
        console.log('\n🔧 Try running these commands:');
        console.log('   w3 space use', SPACE_DID);
        console.log('   w3 up backend-upload-test.js');
      }
    }
    
    // List current uploads
    console.log('\n5. Listing uploads in current space...');
    try {
      const uploads = [];
      for await (const upload of client.list()) {
        uploads.push(upload);
      }
      console.log(`   Found ${uploads.length} upload(s)`);
      uploads.forEach((upload, i) => {
        console.log(`   ${i + 1}. ${upload.root} (${upload.shards?.length || 0} shards)`);
      });
    } catch (listError) {
      console.log('   Could not list uploads:', listError.message);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
testUpload();