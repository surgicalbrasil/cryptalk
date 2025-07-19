#!/usr/bin/env node

/**
 * Script de teste para o sistema de orquestração de containers
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:8080';

class OrchestrationTester {
  constructor() {
    this.testResults = [];
    this.clientIds = [];
    this.wsConnections = new Map();
  }

  async runAllTests() {
    console.log('🚀 Iniciando testes do sistema de orquestração...\n');

    try {
      // Testes básicos
      await this.testHealthCheck();
      await this.testMetrics();
      
      // Testes de containers
      await this.testContainerCreation();
      await this.testContainerStatus();
      await this.testContainerStats();
      await this.testContainerExecution();
      
      // Testes de upload e análise
      await this.testFileUpload();
      await this.testDocumentAnalysis();
      
      // Testes de WebSocket
      await this.testWebSocketConnection();
      
      // Testes de limpeza
      await this.testContainerCleanup();
      
      // Testes de rate limiting
      await this.testRateLimiting();
      
      // Relatório final
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Erro durante os testes:', error);
      process.exit(1);
    }
  }

  async testHealthCheck() {
    console.log('🏥 Testando health check...');
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.logSuccess('Health check passou');
      } else {
        this.logError('Health check falhou', response.data);
      }
    } catch (error) {
      this.logError('Health check falhou', error.message);
    }
  }

  async testMetrics() {
    console.log('📊 Testando métricas do sistema...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/metrics`);
      
      if (response.status === 200 && response.data.containers) {
        this.logSuccess('Métricas obtidas com sucesso');
        console.log(`   Containers ativos: ${response.data.containers.active}`);
        console.log(`   Total criados: ${response.data.containers.total_created}`);
      } else {
        this.logError('Falha ao obter métricas', response.data);
      }
    } catch (error) {
      this.logError('Falha ao obter métricas', error.message);
    }
  }

  async testContainerCreation() {
    console.log('🐳 Testando criação de containers...');
    
    const resourceTypes = ['light', 'medium', 'heavy'];
    
    for (const resourceType of resourceTypes) {
      try {
        const response = await axios.post(`${BASE_URL}/api/client/create`, {
          resourceType,
          priority: 'normal'
        });
        
        if (response.status === 200 && response.data.clientId) {
          this.clientIds.push(response.data.clientId);
          this.logSuccess(`Container ${resourceType} criado: ${response.data.clientId}`);
        } else {
          this.logError(`Falha ao criar container ${resourceType}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao criar container ${resourceType}`, error.message);
      }
    }
  }

  async testContainerStatus() {
    console.log('📋 Testando status dos containers...');
    
    for (const clientId of this.clientIds) {
      try {
        const response = await axios.get(`${BASE_URL}/api/client/${clientId}/status`);
        
        if (response.status === 200 && response.data.status) {
          this.logSuccess(`Status do container ${clientId}: ${response.data.status}`);
        } else {
          this.logError(`Falha ao obter status do container ${clientId}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao obter status do container ${clientId}`, error.message);
      }
    }
  }

  async testContainerStats() {
    console.log('📈 Testando estatísticas dos containers...');
    
    for (const clientId of this.clientIds) {
      try {
        const response = await axios.get(`${BASE_URL}/api/client/${clientId}/stats`);
        
        if (response.status === 200 && response.data.cpu !== undefined) {
          this.logSuccess(`Estatísticas do container ${clientId} obtidas`);
          console.log(`   CPU: ${response.data.cpu.toFixed(2)}%`);
          console.log(`   Memória: ${response.data.memory.toFixed(2)}%`);
        } else {
          this.logError(`Falha ao obter estatísticas do container ${clientId}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao obter estatísticas do container ${clientId}`, error.message);
      }
    }
  }

  async testContainerExecution() {
    console.log('⚙️ Testando execução de comandos...');
    
    if (this.clientIds.length > 0) {
      const clientId = this.clientIds[0];
      
      try {
        const response = await axios.post(`${BASE_URL}/api/client/${clientId}/execute`, {
          command: 'echo "Hello from container!"',
          timeout: 5000
        });
        
        if (response.status === 200 && response.data.result) {
          this.logSuccess(`Comando executado no container ${clientId}`);
          console.log(`   Resultado: ${response.data.result.trim()}`);
        } else {
          this.logError(`Falha ao executar comando no container ${clientId}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao executar comando no container ${clientId}`, error.message);
      }
    }
  }

  async testFileUpload() {
    console.log('📤 Testando upload de arquivos...');
    
    if (this.clientIds.length > 0) {
      const clientId = this.clientIds[0];
      const testContent = 'Este é um arquivo de teste para análise.';
      
      try {
        const response = await axios.post(`${BASE_URL}/api/client/${clientId}/upload`, {
          fileName: 'test-document.txt',
          fileContent: testContent,
          fileType: 'text/plain'
        });
        
        if (response.status === 200 && response.data.filePath) {
          this.logSuccess(`Arquivo enviado para container ${clientId}`);
          console.log(`   Caminho: ${response.data.filePath}`);
        } else {
          this.logError(`Falha ao enviar arquivo para container ${clientId}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao enviar arquivo para container ${clientId}`, error.message);
      }
    }
  }

  async testDocumentAnalysis() {
    console.log('🔍 Testando análise de documentos...');
    
    if (this.clientIds.length > 0) {
      const clientId = this.clientIds[0];
      
      try {
        const response = await axios.post(`${BASE_URL}/api/client/${clientId}/analyze`, {
          fileName: 'test-document.txt',
          documentType: 'general',
          analysisType: 'medium'
        });
        
        if (response.status === 200 && response.data.analysisId) {
          this.logSuccess(`Análise iniciada para container ${clientId}`);
          console.log(`   ID da análise: ${response.data.analysisId}`);
        } else {
          this.logError(`Falha ao iniciar análise no container ${clientId}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao iniciar análise no container ${clientId}`, error.message);
      }
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testando conexão WebSocket...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        this.logSuccess('Conexão WebSocket estabelecida');
        
        // Registrar cliente
        if (this.clientIds.length > 0) {
          ws.send(JSON.stringify({
            type: 'register',
            clientId: this.clientIds[0]
          }));
        }
        
        setTimeout(() => {
          ws.close();
          resolve();
        }, 2000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`   Mensagem recebida: ${message.type}`);
        } catch (error) {
          console.log(`   Dados recebidos: ${data}`);
        }
      });
      
      ws.on('error', (error) => {
        this.logError('Erro na conexão WebSocket', error.message);
        resolve();
      });
    });
  }

  async testContainerCleanup() {
    console.log('🧹 Testando limpeza de containers...');
    
    if (this.clientIds.length > 0) {
      const clientId = this.clientIds[0];
      
      try {
        const response = await axios.delete(`${BASE_URL}/api/client/${clientId}`);
        
        if (response.status === 200) {
          this.logSuccess(`Container ${clientId} removido com sucesso`);
          this.clientIds = this.clientIds.filter(id => id !== clientId);
        } else {
          this.logError(`Falha ao remover container ${clientId}`, response.data);
        }
      } catch (error) {
        this.logError(`Falha ao remover container ${clientId}`, error.message);
      }
    }
  }

  async testRateLimiting() {
    console.log('🚦 Testando rate limiting...');
    
    // Tentar criar muitos containers rapidamente
    const promises = [];
    for (let i = 0; i < 12; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/client/create`, {
          resourceType: 'light'
        }).catch(error => error.response)
      );
    }
    
    try {
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(response => 
        response && response.status === 429
      );
      
      if (rateLimited) {
        this.logSuccess('Rate limiting funcionando corretamente');
      } else {
        this.logWarning('Rate limiting pode não estar funcionando');
      }
    } catch (error) {
      this.logError('Erro ao testar rate limiting', error.message);
    }
  }

  logSuccess(message) {
    console.log(`   ✅ ${message}`);
    this.testResults.push({ status: 'success', message });
  }

  logError(message, details = null) {
    console.log(`   ❌ ${message}`);
    if (details) {
      console.log(`      Detalhes: ${details}`);
    }
    this.testResults.push({ status: 'error', message, details });
  }

  logWarning(message) {
    console.log(`   ⚠️  ${message}`);
    this.testResults.push({ status: 'warning', message });
  }

  generateReport() {
    console.log('\n📊 Relatório de Testes');
    console.log('====================');
    
    const total = this.testResults.length;
    const success = this.testResults.filter(r => r.status === 'success').length;
    const errors = this.testResults.filter(r => r.status === 'error').length;
    const warnings = this.testResults.filter(r => r.status === 'warning').length;
    
    console.log(`Total de testes: ${total}`);
    console.log(`Sucessos: ${success}`);
    console.log(`Erros: ${errors}`);
    console.log(`Avisos: ${warnings}`);
    console.log(`Taxa de sucesso: ${((success / total) * 100).toFixed(1)}%`);
    
    if (errors > 0) {
      console.log('\n❌ Erros encontrados:');
      this.testResults
        .filter(r => r.status === 'error')
        .forEach(r => console.log(`   - ${r.message}`));
    }
    
    // Limpar containers restantes
    this.cleanupRemainingContainers();
  }

  async cleanupRemainingContainers() {
    console.log('\n🧹 Limpando containers restantes...');
    
    for (const clientId of this.clientIds) {
      try {
        await axios.delete(`${BASE_URL}/api/client/${clientId}?force=true`);
        console.log(`   ✅ Container ${clientId} removido`);
      } catch (error) {
        console.log(`   ❌ Erro ao remover container ${clientId}: ${error.message}`);
      }
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new OrchestrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OrchestrationTester;