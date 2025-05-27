import { create } from '@web3-storage/w3up-client';
import { parseLink } from '@ucanto/core';
import * as Signer from '@ucanto/principal/ed25519';
import { importDAG } from '@ucanto/core/delegation';
import * as fs from 'fs';

console.log('🧪 Testando upload para Web3Storage...\n');

const DID = 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';
const SPACE_DID = 'did:key:z6MkstV6aur8VeBh9vcEun8UD6Reet7TQs16Rr2cZHjYyCHW';
const AGENT_KEY = 'MgCaFJgP8V6nzKfpK2biH0bPjf7oC7dJuudJgal1k7s9cr+0BeDbAvLXJedmkkPSK94BMDpHPwAIfNyo7SXjHCkDIP2Q=';

async function testUpload() {
  try {
    // Create principal from agent key
    const principal = await Signer.derive(Buffer.from(AGENT_KEY, 'base64'));
    
    // Create client
    const client = await create({ principal });
    
    console.log('✅ Cliente criado com sucesso');
    console.log(`   Agent DID: ${principal.did()}`);
    
    // Set current space
    await client.setCurrentSpace(SPACE_DID);
    console.log(`✅ Espaço configurado: ${SPACE_DID}`);
    
    // Create a test file
    const testContent = `CrypTalk Test Upload - ${new Date().toISOString()}`;
    const blob = new Blob([testContent], { type: 'text/plain' });
    const file = new File([blob], 'cryptalk-test.txt');
    
    console.log('\n📤 Fazendo upload do arquivo de teste...');
    
    // Upload file
    const cid = await client.uploadFile(file);
    
    console.log('\n✅ Upload concluído com sucesso!');
    console.log(`   CID: ${cid}`);
    console.log(`   URL: https://w3s.link/ipfs/${cid}`);
    
    // List uploads
    console.log('\n📋 Listando seus uploads:');
    for await (const upload of client.list()) {
      console.log(`   - ${upload.root} (${upload.shards?.length || 0} shards)`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('\nDica: Certifique-se de ter executado "w3 space provision" e confirmado o email.');
  }
}

testUpload();