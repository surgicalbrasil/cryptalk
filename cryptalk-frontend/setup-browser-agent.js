#!/usr/bin/env node

/**
 * Script para configurar o agent do navegador com as credenciais do w3 CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

const execAsync = promisify(exec);

async function setupBrowserAgent() {
  try {
    console.log('🔧 Setting up browser agent from CLI credentials...');
    
    // Get w3 config directory
    const w3ConfigDir = path.join(os.homedir(), '.w3');
    console.log('W3 config directory:', w3ConfigDir);
    
    // Check if directory exists
    if (!fs.existsSync(w3ConfigDir)) {
      throw new Error('W3 CLI not configured. Please run: w3 login');
    }
    
    // Get current space
    const { stdout: spaceDid } = await execAsync('w3 space ls --json');
    console.log('Current spaces:', spaceDid);
    
    // Get whoami info
    const { stdout: whoami } = await execAsync('w3 whoami --json');
    const whoamiData = JSON.parse(whoami);
    console.log('Current agent:', whoamiData.Agent);
    
    console.log('\n📋 Instructions:');
    console.log('1. The W3 CLI is already configured and working');
    console.log('2. To use the same credentials in the browser, you need to:');
    console.log('   - Open http://localhost:5173/test-direct');
    console.log('   - Open browser console (F12)');
    console.log('   - The browser will use its own IndexedDB storage');
    console.log('   - It should automatically find the spaces from your account');
    console.log('\n3. If it doesn\'t work, try:');
    console.log('   - Clear browser data for localhost:5173');
    console.log('   - Use w3 delegation create to create a new proof');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupBrowserAgent();