#!/usr/bin/env node

/**
 * Script para testar conectividade do tunnel Cloudflare
 * Este script testa se o frontend consegue se conectar ao backend através do tunnel
 */

const https = require('https');
const http = require('http');
const { WebSocket } = require('ws');

// URLs para teste
const TUNNEL_URL = 'https://furthermore-decide-para-ste.trycloudflare.com';
const LOCAL_URL = 'http://localhost:3001';
const TUNNEL_WS_URL = 'wss://furthermore-decide-para-ste.trycloudflare.com';
const LOCAL_WS_URL = 'ws://localhost:8080';

console.log('🔍 Testando conectividade do tunnel...\n');

// Função para fazer requisição HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'CrypTalk-Tunnel-Test/1.0',
        'Accept': 'application/json',
        'Origin': 'https://cryptalk-frontend.vercel.app'
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Função para testar WebSocket
function testWebSocket(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout'));
    }, timeout);
    
    ws.on('open', () => {
      clearTimeout(timer);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// Teste 1: Conectividade básica do tunnel
async function testTunnelBasic() {
  console.log('1. Testando conectividade básica do tunnel...');
  
  try {
    const response = await makeRequest(`${TUNNEL_URL}/api/health`);
    console.log(`   ✅ Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log(`   ✅ Servidor: ${data.status}`);
      console.log(`   ✅ Ambiente: ${data.environment}`);
      console.log(`   ✅ Conexões ativas: ${data.activeConnections}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
  
  return true;
}

// Teste 2: Conectividade do backend local
async function testLocalBackend() {
  console.log('\n2. Testando conectividade do backend local...');
  
  try {
    const response = await makeRequest(`${LOCAL_URL}/api/health`);
    console.log(`   ✅ Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log(`   ✅ Servidor: ${data.status}`);
      console.log(`   ✅ Ambiente: ${data.environment}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
  
  return true;
}

// Teste 3: Informações do sistema via tunnel
async function testSystemInfo() {
  console.log('\n3. Testando informações do sistema via tunnel...');
  
  try {
    const response = await makeRequest(`${TUNNEL_URL}/api/info`);
    console.log(`   ✅ Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log(`   ✅ Nome: ${data.name}`);
      console.log(`   ✅ Versão: ${data.version}`);
      console.log(`   ✅ Features: ${Object.keys(data.features).join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
  
  return true;
}

// Teste 4: WebSocket via tunnel
async function testWebSocketTunnel() {
  console.log('\n4. Testando WebSocket via tunnel...');
  
  try {
    await testWebSocket(TUNNEL_WS_URL);
    console.log('   ✅ Conexão WebSocket estabelecida');
  } catch (error) {
    console.log(`   ❌ Erro WebSocket: ${error.message}`);
    return false;
  }
  
  return true;
}

// Teste 5: WebSocket local
async function testWebSocketLocal() {
  console.log('\n5. Testando WebSocket local...');
  
  try {
    await testWebSocket(LOCAL_WS_URL);
    console.log('   ✅ Conexão WebSocket local estabelecida');
  } catch (error) {
    console.log(`   ❌ Erro WebSocket local: ${error.message}`);
    return false;
  }
  
  return true;
}

// Teste 6: Criação de sessão cliente via tunnel
async function testClientSession() {
  console.log('\n6. Testando criação de sessão cliente via tunnel...');
  
  try {
    const response = await makeRequest(`${TUNNEL_URL}/api/client/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://cryptalk-frontend.vercel.app'
      }
    });
    
    console.log(`   ✅ Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log(`   ✅ Cliente ID: ${data.clientId}`);
      console.log(`   ✅ Mensagem: ${data.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
  
  return true;
}

// Teste 7: Latência comparativa
async function testLatency() {
  console.log('\n7. Testando latência comparativa...');
  
  // Teste tunnel
  const tunnelStartTime = Date.now();
  try {
    await makeRequest(`${TUNNEL_URL}/api/health`);
    const tunnelLatency = Date.now() - tunnelStartTime;
    console.log(`   ✅ Latência tunnel: ${tunnelLatency}ms`);
  } catch (error) {
    console.log(`   ❌ Erro tunnel: ${error.message}`);
  }
  
  // Teste local
  const localStartTime = Date.now();
  try {
    await makeRequest(`${LOCAL_URL}/api/health`);
    const localLatency = Date.now() - localStartTime;
    console.log(`   ✅ Latência local: ${localLatency}ms`);
  } catch (error) {
    console.log(`   ❌ Erro local: ${error.message}`);
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Iniciando testes de conectividade...\n');
  
  const results = [];
  
  results.push(await testTunnelBasic());
  results.push(await testLocalBackend());
  results.push(await testSystemInfo());
  results.push(await testWebSocketTunnel());
  results.push(await testWebSocketLocal());
  results.push(await testClientSession());
  
  await testLatency();
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Resultados dos testes:');
  console.log(`   ✅ Passou: ${passed}/${total} testes`);
  console.log(`   ❌ Falhou: ${total - passed}/${total} testes`);
  
  if (passed === total) {
    console.log('\n🎉 Todos os testes passaram! O tunnel está funcionando corretamente.');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique a configuração do tunnel.');
  }
  
  console.log('\n🔗 URLs configuradas:');
  console.log(`   Tunnel: ${TUNNEL_URL}`);
  console.log(`   Local: ${LOCAL_URL}`);
  console.log(`   WebSocket Tunnel: ${TUNNEL_WS_URL}`);
  console.log(`   WebSocket Local: ${LOCAL_WS_URL}`);
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testTunnelBasic,
  testLocalBackend,
  testSystemInfo,
  testWebSocketTunnel,
  testWebSocketLocal,
  testClientSession,
  testLatency,
  runAllTests
};