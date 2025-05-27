#!/usr/bin/env node

// Test direct upload without space management
import { create } from '@web3-storage/w3up-client';
import * as ED25519 from '@ucanto/principal/ed25519';
import fs from 'fs';

async function testUpload() {
  try {
    console.log('🧪 Testing direct upload to Web3Storage...');
    
    // Read credentials
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const agentKeyMatch = envContent.match(/VITE_W3S_AGENT_KEY=(.+)/);
    
    if (!agentKeyMatch) {
      // Create new client without existing credentials
      console.log('📦 Creating new client...');
      const client = await create();
      
      // Generate space
      const space = await client.createSpace('cryptalk-test-' + Date.now());
      console.log('✅ Created space:', space.did());
      
      // Provision space
      await space.provision('did:web:web3.storage');
      console.log('✅ Space provisioned');
      
      // Save and use
      await space.save();
      await client.setCurrentSpace(space.did());
      
      // Test upload
      console.log('📤 Testing upload...');
      const testData = new Blob(['CrypTalk test upload ' + new Date().toISOString()]);
      const cid = await client.uploadFile(new File([testData], 'test.txt'));
      console.log('✅ Upload successful! CID:', cid.toString());
      
      // Export credentials
      const principal = await client.agent();
      const exportedKey = principal.did();
      
      console.log('\n🔑 Use these credentials in .env.local:');
      console.log('VITE_W3S_SPACE_DID=' + space.did());
      console.log('VITE_W3S_DID=' + exportedKey);
      
    } else {
      console.log('📦 Using existing credentials...');
      const agentKey = agentKeyMatch[1].trim();
      const principal = ED25519.parse(agentKey);
      
      // Create basic client
      const client = await create({ principal });
      
      // Try direct upload without space management
      console.log('📤 Attempting direct upload...');
      const testData = new Blob(['CrypTalk direct test ' + new Date().toISOString()]);
      
      try {
        const cid = await client.uploadFile(new File([testData], 'test-direct.txt'));
        console.log('✅ Direct upload successful! CID:', cid.toString());
      } catch (uploadError) {
        console.log('❌ Direct upload failed:', uploadError.message);
        
        // Try creating a new space
        console.log('\n🏗️  Creating new space...');
        const space = await client.createSpace('cryptalk-' + Date.now());
        console.log('Space created:', space.did());
        
        // Try to provision
        try {
          await space.provision('did:web:web3.storage');
          console.log('✅ Space provisioned');
        } catch (provError) {
          console.log('⚠️  Provision failed:', provError.message);
        }
        
        await space.save();
        await client.setCurrentSpace(space.did());
        
        // Retry upload
        const cid = await client.uploadFile(new File([testData], 'test-retry.txt'));
        console.log('✅ Upload successful after new space! CID:', cid.toString());
        
        console.log('\n📝 Update .env.local with:');
        console.log('VITE_W3S_SPACE_DID=' + space.did());
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpload();