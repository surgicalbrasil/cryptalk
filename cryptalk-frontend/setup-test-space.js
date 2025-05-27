#!/usr/bin/env node

import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/access/stores/memory';
import * as Signer from '@ucanto/principal/ed25519';

console.log('🚀 Criando espaço de teste para CrypTalk...\n');

async function setupTestSpace() {
  try {
    // Create a client with memory store for testing
    const principal = await Signer.generate();
    const store = new StoreMemory();
    const client = await create({ principal, store });
    
    // Create a test space
    const space = await client.createSpace('cryptalk-test-space');
    console.log('✅ Espaço criado com sucesso!');
    console.log(`   Nome: ${space.name}`);
    console.log(`   DID: ${space.did()}`);
    
    // Save the space
    await client.setCurrentSpace(space.did());
    await space.save();
    
    console.log('\n📝 Adicione este DID ao seu .env.local:');
    console.log(`VITE_W3S_SPACE_DID=${space.did()}`);
    
    console.log('\n⚠️  NOTA: Este é um espaço de teste local.');
    console.log('Para um espaço real com billing, execute:');
    console.log('w3 space create cryptalk-storage --no-recovery');
    
  } catch (error) {
    console.error('❌ Erro ao criar espaço:', error.message);
  }
}

setupTestSpace();