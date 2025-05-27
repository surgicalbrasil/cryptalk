#!/usr/bin/env node

import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import * as ED25519 from '@ucanto/principal/ed25519';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createSpace() {
  try {
    console.log('🚀 Creating Web3Storage space...');
    
    // Read agent key from .env.local
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const agentKeyMatch = envContent.match(/VITE_W3S_AGENT_KEY=(.+)/);
    
    if (!agentKeyMatch) {
      throw new Error('VITE_W3S_AGENT_KEY not found in .env.local');
    }
    
    const agentKey = agentKeyMatch[1].trim();
    console.log('✅ Found agent key');
    
    // Parse the agent key
    const principal = ED25519.parse(agentKey);
    console.log('✅ Parsed principal:', principal.did());
    
    // Create client
    const client = await create({
      principal,
      store: new StoreMemory()
    });
    
    console.log('✅ Created client');
    
    // Create a new space
    const spaceName = 'cryptalk-storage';
    console.log(`📦 Creating space: ${spaceName}`);
    
    const space = await client.createSpace(spaceName);
    const spaceDid = space.did();
    
    console.log('✅ Space created successfully!');
    console.log('Space DID:', spaceDid);
    
    // Set as current space
    await client.setCurrentSpace(spaceDid);
    console.log('✅ Set as current space');
    
    // Update .env.local with the new space DID
    let newEnvContent = envContent;
    if (envContent.includes('VITE_W3S_SPACE_DID=')) {
      // Replace existing
      newEnvContent = envContent.replace(
        /VITE_W3S_SPACE_DID=.*/,
        `VITE_W3S_SPACE_DID=${spaceDid}`
      );
    } else {
      // Add new
      newEnvContent += `\nVITE_W3S_SPACE_DID=${spaceDid}\n`;
    }
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ Updated .env.local with new space DID');
    
    console.log('\n🎉 Success! Your Web3Storage space is ready.');
    console.log('Please restart the development server to use the new space.');
    
  } catch (error) {
    console.error('❌ Error creating space:', error.message);
    process.exit(1);
  }
}

createSpace();