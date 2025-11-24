#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Revertendo configuração para localhost...');

// Reverter .env
const envPath = path.join(__dirname, '..', '.env');
const envBackupPath = path.join(__dirname, '..', '.env.backup');

if (fs.existsSync(envBackupPath)) {
  fs.copyFileSync(envBackupPath, envPath);
  console.log('✅ Arquivo .env revertido');
} else {
  console.log('⚠️  Backup do .env não encontrado');
}

// Remover config.js
const configPath = path.join(__dirname, '..', 'public', 'config.js');
if (fs.existsSync(configPath)) {
  fs.unlinkSync(configPath);
  console.log('✅ Arquivo config.js removido');
}

console.log('🎉 Configuração revertida para localhost');
