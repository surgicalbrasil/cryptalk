import { create } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import { Signer } from '@ucanto/principal/ed25519'
import * as Delegation from '@ucanto/core/delegation'
import { CarReader } from '@ipld/car'
import * as fs from 'fs'

console.log('🧪 Final Backend Upload Test with Delegation\n');

// Your configuration
const AGENT_KEY = 'MgCaFJgP8V6nzKfpK2biH0bPjf7oC7dJuudJgal1k7s9cr+0BeDbAvLXJedmkkPSK94BMDpHPwAIfNyo7SXjHCkDIP2Q=';
const DELEGATION_BASE64 = fs.readFileSync('delegation.base64', 'utf8').trim();

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
    
    // Import the delegation
    console.log('2. Importing delegation...');
    const delegationBytes = Buffer.from(DELEGATION_BASE64, 'base64');
    const reader = await CarReader.fromBytes(delegationBytes);
    const blocks = [];
    for await (const block of reader.blocks()) {
      blocks.push(block);
    }
    
    // Extract delegation from CAR blocks
    const delegation = await Delegation.extract(blocks);
    if (!delegation.ok) {
      throw new Error('Failed to extract delegation');
    }
    
    // Add the proof
    const space = await client.addSpace(delegation.ok);
    await client.setCurrentSpace(space.did());
    
    console.log('✅ Delegation imported successfully');
    console.log('   Space DID:', space.did());
    console.log('   Space name:', space.name);
    
    // Create test content
    console.log('\n3. Creating test file...');
    const content = `CrypTalk Backend Upload - FINAL TEST
Generated at: ${new Date().toISOString()}
Space: ${space.did()}
Agent: ${principal.did()}

This upload is using delegated permissions from the provisioned space.
If you see this file in your Web3Storage account, the integration is working!`;
    
    // Create a Blob
    const blob = new Blob([content], { type: 'text/plain' });
    
    console.log('   Content size:', content.length, 'bytes');
    
    // Upload the blob
    console.log('\n4. Uploading to Web3Storage...');
    
    try {
      const cid = await client.uploadFile(blob, {
        onShardStored: (shard) => {
          console.log('   Shard stored:', shard.cid.toString());
        }
      });
      
      console.log('\n✅ UPLOAD SUCCESSFUL!');
      console.log('   CID:', cid.toString());
      console.log('   Gateway URL:', `https://w3s.link/ipfs/${cid}`);
      console.log('\n📋 Verify with: w3 ls');
      console.log('   Or visit: https://console.web3.storage/');
      
      // Save the working configuration
      console.log('\n5. Saving working configuration...');
      const config = {
        VITE_W3S_SPACE_DID: space.did(),
        VITE_W3S_DELEGATION: DELEGATION_BASE64
      };
      
      fs.writeFileSync('working-config.json', JSON.stringify(config, null, 2));
      console.log('✅ Configuration saved to working-config.json');
      
    } catch (uploadError) {
      console.error('\n❌ Upload failed:', uploadError.message);
      console.error('Full error:', uploadError);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
testUpload();