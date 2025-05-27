import * as ED25519 from '@ucanto/principal/ed25519';

const agentKey = 'MgCaFJgP8V6nzKfpK2biH0bPjf7oC7dJuudJgal1k7s9cr+0BeDbAvLXJedmkkPSK94BMDpHPwAIfNyo7SXjHCkDIP2Q=';

async function testKey() {
  try {
    console.log('Testing agent key...');
    console.log('Key length:', agentKey.length);
    console.log('Key (first 20 chars):', agentKey.substring(0, 20) + '...');
    
    // Try to decode base64
    const decoded = Buffer.from(agentKey, 'base64');
    console.log('Decoded length:', decoded.length);
    console.log('Decoded bytes:', decoded);
    
    // Try to parse
    const principal = await ED25519.parse(agentKey);
    console.log('✅ Principal created!');
    console.log('Principal DID:', principal.did());
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testKey();