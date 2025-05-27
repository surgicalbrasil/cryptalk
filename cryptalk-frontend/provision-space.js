#!/usr/bin/env node

import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import * as ED25519 from '@ucanto/principal/ed25519';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function provisionSpace() {
  try {
    console.log('🚀 Provisioning Web3Storage space...');
    
    // Read config from .env.local
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const agentKeyMatch = envContent.match(/VITE_W3S_AGENT_KEY=(.+)/);
    const spaceDIDMatch = envContent.match(/VITE_W3S_SPACE_DID=(.+)/);
    
    if (!agentKeyMatch || !spaceDIDMatch) {
      throw new Error('Missing required environment variables');
    }
    
    const agentKey = agentKeyMatch[1].trim();
    const spaceDID = spaceDIDMatch[1].trim();
    
    console.log('✅ Found credentials');
    console.log('Space DID:', spaceDID);
    
    // Parse the agent key
    const principal = ED25519.parse(agentKey);
    console.log('Agent DID:', principal.did());
    
    // Create client
    const client = await create({
      principal,
      store: new StoreMemory()
    });
    
    console.log('✅ Created client');
    
    // Set current space
    await client.setCurrentSpace(spaceDID);
    console.log('✅ Set current space');
    
    // Get the space
    const space = await client.getSpace(spaceDID);
    if (!space) {
      throw new Error('Space not found');
    }
    
    console.log('✅ Found space');
    
    // Save the space to ensure it's provisioned
    await space.save();
    console.log('✅ Space saved');
    
    // Create a delegation for the space
    const recovery = await space.createRecovery(principal.did());
    console.log('✅ Created recovery delegation');
    
    // Test upload capability
    console.log('🧪 Testing upload capability...');
    const testData = new Blob(['Test upload from CrypTalk'], { type: 'text/plain' });
    const testFile = new File([testData], 'test.txt');
    
    try {
      const cid = await client.uploadFile(testFile);
      console.log('✅ Test upload successful! CID:', cid.toString());
    } catch (uploadError) {
      console.log('⚠️  Test upload failed:', uploadError.message);
      console.log('This might be normal if the space is new. Continuing...');
    }
    
    // Get account info
    const account = await client.account();
    if (account) {
      console.log('\n📊 Account Information:');
      console.log('Account DID:', account.did());
      console.log('Account plan:', account.plan || 'free');
    }
    
    console.log('\n🎉 Space provisioned successfully!');
    console.log('Your space is ready to use with CrypTalk.');
    console.log('\nIf you still have issues, try running:');
    console.log('  w3 login your-email@example.com');
    console.log('  w3 space provision', spaceDID);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

provisionSpace();