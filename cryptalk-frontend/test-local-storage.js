import { create } from '@web3-storage/w3up-client';
import * as Client from '@web3-storage/w3up-client';
import * as Signer from '@ucanto/principal/ed25519';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';

console.log('🧪 Teste de Upload Local (sem provisionamento)\n');

async function testLocalUpload() {
  try {
    // Create a new client with memory store
    const principal = await Signer.generate();
    const store = new StoreMemory();
    const client = await create({ principal, store });
    
    console.log('✅ Cliente criado');
    console.log(`   DID: ${client.did()}`);
    
    // Create a space locally
    const space = await client.createSpace('test-local-space');
    await client.setCurrentSpace(space.did());
    
    console.log('\n✅ Espaço local criado');
    console.log(`   Space DID: ${space.did()}`);
    
    // Try to create delegation
    const account = await client.login('surgical.brasil@gmail.com');
    
    console.log('\n✅ Login iniciado');
    console.log('   Verifique seu email para o link de confirmação');
    
    // Create test content
    const content = 'CrypTalk Test - ' + new Date().toISOString();
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt');
    
    console.log('\n📤 Preparado para upload após confirmação do email');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    
    if (error.message.includes('account')) {
      console.log('\n💡 Alternativa: Use a página de teste em http://localhost:5173/test-upload');
      console.log('   Ela permite fazer upload sem provisionamento completo');
    }
  }
}

testLocalUpload();