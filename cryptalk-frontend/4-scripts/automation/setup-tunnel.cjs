#!/usr/bin/env node

/**
 * Script para configurar o frontend para usar o tunnel do Cloudflare
 */

const fs = require('fs');
const path = require('path');

const TUNNEL_URL = 'https://furthermore-decide-para-ste.trycloudflare.com';
const BACKEND_LOCAL_URL = 'http://localhost:3001';

console.log('🔧 Configurando frontend para usar o tunnel do Cloudflare...\n');

// 1. Atualizar .env para usar o tunnel
function updateEnvFile() {
  console.log('1. Atualizando arquivo .env...');
  
  const envPath = path.join(__dirname, '..', '.env');
  const envTunnelPath = path.join(__dirname, '..', '.env.tunnel');
  
  try {
    // Fazer backup do .env atual
    if (fs.existsSync(envPath)) {
      const backupPath = path.join(__dirname, '..', '.env.backup');
      fs.copyFileSync(envPath, backupPath);
      console.log('   ✅ Backup do .env criado');
    }
    
    // Copiar .env.tunnel para .env
    if (fs.existsSync(envTunnelPath)) {
      fs.copyFileSync(envTunnelPath, envPath);
      console.log('   ✅ Configuração do tunnel aplicada');
    } else {
      console.log('   ⚠️  Arquivo .env.tunnel não encontrado');
    }
  } catch (error) {
    console.error('   ❌ Erro ao atualizar .env:', error.message);
  }
}

// 2. Criar arquivo de configuração JavaScript
function createConfigFile() {
  console.log('\n2. Criando arquivo de configuração...');
  
  const configContent = `
// Configuração do tunnel para CrypTalk
window.CRYPTALK_CONFIG = {
  API_URL: '${TUNNEL_URL}',
  WEBSOCKET_URL: '${TUNNEL_URL.replace('https://', 'wss://')}',
  TUNNEL_URL: '${TUNNEL_URL}',
  LOCAL_URL: '${BACKEND_LOCAL_URL}',
  MODE: 'tunnel',
  TUNNEL_ACTIVE: true,
  FEATURES: {
    TUNNEL: true,
    WEBSOCKET: true,
    CORS: true,
    SSL: true
  }
};

console.log('🔗 CrypTalk configurado para usar tunnel:', window.CRYPTALK_CONFIG.TUNNEL_URL);
`;
  
  const configPath = path.join(__dirname, '..', 'public', 'config.js');
  
  try {
    fs.writeFileSync(configPath, configContent);
    console.log('   ✅ Arquivo de configuração criado em public/config.js');
  } catch (error) {
    console.error('   ❌ Erro ao criar arquivo de configuração:', error.message);
  }
}

// 3. Atualizar index.html para incluir o arquivo de configuração
function updateIndexHtml() {
  console.log('\n3. Atualizando index.html...');
  
  const indexPath = path.join(__dirname, '..', 'index.html');
  
  try {
    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf8');
      
      // Verificar se já tem o script de configuração
      if (!indexContent.includes('config.js')) {
        // Adicionar o script antes do fechamento do </head>
        indexContent = indexContent.replace(
          '</head>',
          '  <script src="/config.js"></script>\n  </head>'
        );
        
        fs.writeFileSync(indexPath, indexContent);
        console.log('   ✅ Script de configuração adicionado ao index.html');
      } else {
        console.log('   ✅ Script de configuração já presente no index.html');
      }
    } else {
      console.log('   ⚠️  Arquivo index.html não encontrado');
    }
  } catch (error) {
    console.error('   ❌ Erro ao atualizar index.html:', error.message);
  }
}

// 4. Criar script para reverter configuração
function createRevertScript() {
  console.log('\n4. Criando script para reverter configuração...');
  
  const revertContent = `#!/usr/bin/env node

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
`;
  
  const revertPath = path.join(__dirname, 'revert-tunnel.js');
  
  try {
    fs.writeFileSync(revertPath, revertContent);
    fs.chmodSync(revertPath, '755');
    console.log('   ✅ Script de reversão criado em scripts/revert-tunnel.js');
  } catch (error) {
    console.error('   ❌ Erro ao criar script de reversão:', error.message);
  }
}

// 5. Atualizar package.json com scripts do tunnel
function updatePackageJson() {
  console.log('\n5. Atualizando scripts do package.json...');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Adicionar scripts do tunnel
    packageJson.scripts = {
      ...packageJson.scripts,
      'tunnel:setup': 'node scripts/setup-tunnel.js',
      'tunnel:revert': 'node scripts/revert-tunnel.js',
      'tunnel:test': 'node scripts/test-tunnel-connection.cjs',
      'build:tunnel': 'npm run tunnel:setup && npm run build',
      'dev:tunnel': 'npm run tunnel:setup && npm run dev',
      'preview:tunnel': 'npm run tunnel:setup && npm run preview'
    };
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Scripts do tunnel adicionados ao package.json');
  } catch (error) {
    console.error('   ❌ Erro ao atualizar package.json:', error.message);
  }
}

// Executar todas as configurações
async function setupTunnel() {
  console.log('🚀 Iniciando configuração do tunnel...\n');
  
  updateEnvFile();
  createConfigFile();
  updateIndexHtml();
  createRevertScript();
  updatePackageJson();
  
  console.log('\n🎉 Configuração do tunnel concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('   1. Execute: npm run build:tunnel');
  console.log('   2. Execute: npm run preview:tunnel');
  console.log('   3. Teste: npm run tunnel:test');
  console.log('   4. Para reverter: npm run tunnel:revert');
  console.log('\\n🔗 URLs configuradas:');
  console.log('   Tunnel:', TUNNEL_URL);
  console.log('   Local:', BACKEND_LOCAL_URL);
}

// Executar se chamado diretamente
if (require.main === module) {
  setupTunnel().catch(console.error);
}

module.exports = { setupTunnel };