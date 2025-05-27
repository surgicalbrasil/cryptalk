#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function createDelegation() {
  try {
    console.log('🔐 Creating delegation for web app...');
    
    // Get the agent DID from .env.local
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const agentKey = envContent.match(/VITE_W3S_AGENT_KEY=(.+)/)?.[1]?.trim();
    
    if (!agentKey) {
      throw new Error('VITE_W3S_AGENT_KEY not found in .env.local');
    }
    
    // The web app agent DID (from the parse principal)
    const webAppDID = 'did:key:z6MknYXPk5zaFGAq6TKx5JmX2t2za4MdfQoFL5vGeP4W2AwD';
    
    // Create delegation proof
    console.log('📝 Creating delegation proof...');
    const { stdout: proof } = await execAsync(
      `w3 delegation create ${webAppDID} --can 'space/*' --can 'blob/*' --can 'store/*' --can 'upload/*' --can 'access/*' --can 'filecoin/*' --can 'usage/*' --base64`
    );
    
    const delegationBase64 = proof.trim();
    console.log('✅ Delegation created');
    
    // Update .env.local
    let newEnvContent = envContent;
    if (envContent.includes('VITE_W3S_DELEGATION=')) {
      newEnvContent = envContent.replace(
        /VITE_W3S_DELEGATION=.*/,
        `VITE_W3S_DELEGATION=${delegationBase64}`
      );
    } else {
      newEnvContent += `\nVITE_W3S_DELEGATION=${delegationBase64}\n`;
    }
    
    // Also update the space DID to use cryptalk-production
    newEnvContent = newEnvContent.replace(
      /VITE_W3S_SPACE_DID=.*/,
      'VITE_W3S_SPACE_DID=did:key:z6MkqtS41ZWSweWP22dnpmgp64KSFuCGUzy12mMRDggtbv3E'
    );
    
    fs.writeFileSync('.env.local', newEnvContent);
    
    console.log('\n✅ Success! Updated .env.local with:');
    console.log('- Space DID: did:key:z6MkqtS41ZWSweWP22dnpmgp64KSFuCGUzy12mMRDggtbv3E (cryptalk-production)');
    console.log('- Delegation for web app agent');
    console.log('\nPlease restart the development server.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createDelegation();