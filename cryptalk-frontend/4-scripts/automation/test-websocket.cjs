#!/usr/bin/env node

/**
 * Script para testar WebSocket através do tunnel
 */

const { WebSocket } = require('ws');

const TUNNEL_WS_URL = 'wss://furthermore-decide-para-ste.trycloudflare.com';
const LOCAL_WS_URL = 'ws://localhost:8080';

console.log('🔌 Testando WebSocket através do tunnel...\n');

// Função para testar WebSocket com detalhes
function testWebSocketDetailed(url, name) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Testando ${name}: ${url}`);
    
    const ws = new WebSocket(url);
    const startTime = Date.now();
    
    const timeout = setTimeout(() => {
      console.log(`   ❌ Timeout para ${name}`);
      ws.terminate();
      reject(new Error(`Timeout para ${name}`));
    }, 15000);
    
    ws.on('open', () => {
      const latency = Date.now() - startTime;
      console.log(`   ✅ Conectado em ${latency}ms`);
      
      // Testar registro de cliente
      const clientId = `test-${Date.now()}`;
      const registerMessage = {
        type: 'register',
        clientId: clientId,
        timestamp: new Date().toISOString()
      };
      
      console.log(`   📤 Enviando mensagem de registro...`);
      ws.send(JSON.stringify(registerMessage));
      
      // Aguardar resposta
      const responseTimeout = setTimeout(() => {
        console.log(`   ⚠️  Sem resposta de registro`);
        ws.close();
        clearTimeout(timeout);
        resolve({
          connected: true,
          latency: latency,
          registered: false,
          name: name
        });
      }, 5000);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`   📥 Recebido:`, message);
          
          if (message.type === 'registered') {
            console.log(`   ✅ Registro confirmado!`);
            clearTimeout(responseTimeout);
            ws.close();
            clearTimeout(timeout);
            resolve({
              connected: true,
              latency: latency,
              registered: true,
              clientId: message.clientId,
              name: name
            });
          }
        } catch (error) {
          console.log(`   ❌ Erro ao processar mensagem:`, error.message);
        }
      });
    });
    
    ws.on('error', (error) => {
      console.log(`   ❌ Erro de conexão:`, error.message);
      clearTimeout(timeout);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`   🔌 Conexão fechada: ${code} - ${reason}`);
      clearTimeout(timeout);
    });
  });
}

// Testar ambos os WebSockets
async function testBothWebSockets() {
  console.log('🚀 Iniciando testes de WebSocket...\n');
  
  const results = [];
  
  // Testar tunnel
  try {
    const tunnelResult = await testWebSocketDetailed(TUNNEL_WS_URL, 'Tunnel');
    results.push(tunnelResult);
  } catch (error) {
    console.log(`❌ Falha no tunnel: ${error.message}`);
    results.push({
      connected: false,
      error: error.message,
      name: 'Tunnel'
    });
  }
  
  console.log('');
  
  // Testar local
  try {
    const localResult = await testWebSocketDetailed(LOCAL_WS_URL, 'Local');
    results.push(localResult);
  } catch (error) {
    console.log(`❌ Falha no local: ${error.message}`);
    results.push({
      connected: false,
      error: error.message,
      name: 'Local'
    });
  }
  
  // Relatório final
  console.log('\n📊 Relatório de WebSocket:');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}:`);
    console.log(`   Conectado: ${result.connected ? '✅' : '❌'}`);
    
    if (result.connected) {
      console.log(`   Latência: ${result.latency}ms`);
      console.log(`   Registrado: ${result.registered ? '✅' : '❌'}`);
      
      if (result.clientId) {
        console.log(`   Cliente ID: ${result.clientId}`);
      }
    } else {
      console.log(`   Erro: ${result.error}`);
    }
  });
  
  const connected = results.filter(r => r.connected).length;
  const registered = results.filter(r => r.registered).length;
  
  console.log(`\n🎯 Resumo:`);
  console.log(`   Conexões: ${connected}/${results.length}`);
  console.log(`   Registros: ${registered}/${results.length}`);
  
  if (connected === results.length && registered === results.length) {
    console.log('\n🎉 Todos os WebSockets estão funcionando perfeitamente!');
  } else if (connected > 0) {
    console.log('\n⚠️  Alguns WebSockets estão funcionando, mas podem ter limitações.');
  } else {
    console.log('\n❌ Nenhum WebSocket está funcionando. Verifique a configuração.');
  }
}

// Executar testes
testBothWebSockets().catch(console.error);