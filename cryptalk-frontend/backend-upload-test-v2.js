import { create } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import { Signer } from '@ucanto/principal/ed25519'
import * as fs from 'fs'

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
    
    // Get account info
    console.log('2. Getting account info...');
    const account = await client.accounts();
    console.log('   Accounts:', account);
    
    // List existing spaces
    console.log('\n3. Listing existing spaces...');
    const spaces = await client.spaces();
    console.log('   Found', spaces.length, 'space(s)');
    spaces.forEach(space => {
      console.log(`   - ${space.did()} (${space.name || 'unnamed'})`);
    });
    
    // Try to use the configured space
    console.log('\n4. Attempting to use configured space...');
    console.log('   Target Space DID:', SPACE_DID);
    
    let currentSpace;
    try {
      // First check if we have access to this space
      const hasSpace = spaces.some(s => s.did() === SPACE_DID);
      
      if (hasSpace) {
        await client.setCurrentSpace(SPACE_DID);
        currentSpace = SPACE_DID;
        console.log('✅ Using configured space');
      } else {
        console.log('⚠️  Configured space not accessible, creating new space...');
        const newSpace = await client.createSpace('cryptalk-backend-test');
        await client.setCurrentSpace(newSpace.did());
        currentSpace = newSpace.did();
        console.log('✅ Created and using new space:', currentSpace);
      }
    } catch (spaceError) {
      console.error('❌ Space error:', spaceError.message);
      // Create a new space as fallback
      const newSpace = await client.createSpace('cryptalk-backend-test');
      await client.setCurrentSpace(newSpace.did());
      currentSpace = newSpace.did();
      console.log('✅ Created fallback space:', currentSpace);
    }
    
    // Create test content
    console.log('\n5. Creating test file...');
    const content = `CrypTalk Backend Test Upload
Generated at: ${new Date().toISOString()}
Target Space: ${SPACE_DID}
Current Space: ${currentSpace}
Agent: ${principal.did()}

This is a test upload from the backend to verify Web3Storage integration.`;
    
    // Write to a temporary file
    const filename = `backend-test-${Date.now()}.txt`;
    fs.writeFileSync(filename, content);
    console.log('   File created:', filename);
    console.log('   File size:', content.length, 'bytes');
    
    // Upload using the CLI-style approach
    console.log('\n6. Uploading file to Web3Storage...');
    
    try {
      // Read file as Uint8Array
      const bytes = fs.readFileSync(filename);
      
      // Create a Blob from the bytes
      const blob = new Blob([bytes], { type: 'text/plain' });
      
      // Upload the blob
      const cid = await client.uploadFile(blob);
      
      console.log('\n✅ UPLOAD SUCCESSFUL!');
      console.log('   CID:', cid.toString());
      console.log('   Gateway URL:', `https://w3s.link/ipfs/${cid}`);
      console.log('\n📋 To verify uploads, run: w3 ls');
      
      // Clean up
      fs.unlinkSync(filename);
      
    } catch (uploadError) {
      console.error('\n❌ Upload failed:', uploadError.message);
      console.error('Full error:', uploadError);
      
      // Clean up
      fs.unlinkSync(filename);
      
      if (uploadError.message.includes('space/blob/add')) {
        console.log('\n💡 Solution:');
        console.log('1. Use the space created by this script:', currentSpace);
        console.log('2. Update your .env.local with:');
        console.log(`   VITE_W3S_SPACE_DID=${currentSpace}`);
      }
    }
    
    // List current uploads
    console.log('\n7. Listing uploads in current space...');
    try {
      const uploads = [];
      for await (const upload of client.list()) {
        uploads.push(upload);
      }
      console.log(`   Found ${uploads.length} upload(s) in space ${currentSpace}`);
      uploads.forEach((upload, i) => {
        console.log(`   ${i + 1}. ${upload.root}`);
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