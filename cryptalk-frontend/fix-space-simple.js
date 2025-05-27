#!/usr/bin/env node

// Simple fix for Web3Storage space issue
// This creates a minimal client setup

import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import * as Client from '@web3-storage/w3up-client';
import fs from 'fs';

console.log('🚀 Fixing Web3Storage configuration...');

async function fixSpace() {
  try {
    // Create a client without credentials (will create new ones)
    console.log('📦 Creating new Web3Storage client...');
    const client = await Client.create();
    
    // Login with email (this creates an account)
    const email = 'cryptalk-test@example.com';
    console.log(`📧 Creating account for: ${email}`);
    
    const account = await client.login(email);
    console.log('✅ Account created/accessed');
    
    // Wait for email verification (in dev, auto-verified)
    await account.plan.wait();
    console.log('✅ Account verified');
    
    // Create a space
    console.log('🏗️  Creating space...');
    const space = await client.createSpace('cryptalk-production');
    console.log('✅ Space created:', space.did());
    
    // Save space
    await space.save();
    console.log('✅ Space saved');
    
    // Set as current
    await client.setCurrentSpace(space.did());
    console.log('✅ Space set as current');
    
    // Get the agent data
    const agentData = await client.agent();
    const principal = agentData.principal;
    
    // Export the key
    const exportedKey = principal.export();
    const base64Key = Buffer.from(exportedKey).toString('base64');
    
    console.log('\n🔑 New credentials:');
    console.log('=====================================');
    console.log('VITE_W3S_DID=' + principal.did());
    console.log('VITE_W3S_SPACE_DID=' + space.did());
    console.log('VITE_W3S_AGENT_KEY=' + base64Key);
    console.log('=====================================');
    
    // Update .env.local
    const envPath = '.env.local';
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Update or add each variable
    const updates = {
      'VITE_W3S_DID': principal.did(),
      'VITE_W3S_SPACE_DID': space.did(),
      'VITE_W3S_AGENT_KEY': base64Key
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Updated .env.local');
    
    // Test upload
    console.log('\n🧪 Testing upload...');
    const testFile = new File(['Hello from CrypTalk!'], 'test.txt');
    const cid = await client.uploadFile(testFile);
    console.log('✅ Test upload successful! CID:', cid.toString());
    
    console.log('\n🎉 Success! Web3Storage is configured.');
    console.log('Please restart the development server.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

fixSpace();