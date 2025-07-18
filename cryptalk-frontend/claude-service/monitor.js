#!/usr/bin/env node

/**
 * Monitor em tempo real do sistema de orquestração
 */

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class SystemMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.wsUrl = options.wsUrl || 'ws://localhost:8080';
    this.interval = options.interval || 5000; // 5 segundos
    this.running = false;
    this.stats = {
      containers: [],
      system: null,
      alerts: []
    };
    
    this.setupWebSocket();
  }

  setupWebSocket() {
    console.log('🔌 Conectando ao WebSocket...');
    
    this.ws = new WebSocket(this.wsUrl);
    
    this.ws.on('open', () => {
      console.log('✅ WebSocket conectado');
      this.emit('connected');
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ Erro WebSocket:', error);
      this.emit('error', error);
    });
    
    this.ws.on('close', () => {
      console.log('🔌 WebSocket desconectado. Tentando reconectar...');
      setTimeout(() => this.setupWebSocket(), 5000);
    });
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'resource_alert':
        this.handleResourceAlert(message);
        break;
      case 'analysis_started':
        this.handleAnalysisStarted(message);
        break;
      case 'analysis_completed':
        this.handleAnalysisCompleted(message);
        break;
      case 'analysis_error':
        this.handleAnalysisError(message);
        break;
      default:
        console.log(`📨 Mensagem recebida: ${message.type}`);
    }
  }

  handleResourceAlert(message) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'resource_alert',
      clientId: message.clientId,
      alert: message.alert
    };
    
    this.stats.alerts.push(alert);
    
    // Manter apenas os últimos 50 alertas
    if (this.stats.alerts.length > 50) {
      this.stats.alerts.shift();
    }
    
    console.log(`🚨 ALERTA: ${message.alert.message} (Cliente: ${message.clientId})`);
    this.emit('alert', alert);
  }

  handleAnalysisStarted(message) {
    console.log(`🔍 Análise iniciada: ${message.analysisId} (Cliente: ${message.clientId})`);
    this.emit('analysis_started', message);
  }

  handleAnalysisCompleted(message) {
    console.log(`✅ Análise concluída: ${message.analysisId} (Cliente: ${message.clientId})`);
    this.emit('analysis_completed', message);
  }

  handleAnalysisError(message) {
    console.log(`❌ Erro na análise: ${message.analysisId} - ${message.error}`);
    this.emit('analysis_error', message);
  }

  async start() {
    if (this.running) {
      console.log('⚠️  Monitor já está rodando');
      return;
    }
    
    this.running = true;
    console.log('🚀 Iniciando monitor do sistema...');
    
    // Monitoramento contínuo
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, this.interval);
    
    // Primeira coleta imediata
    await this.collectMetrics();
    
    this.emit('started');
  }

  async stop() {
    if (!this.running) {
      return;
    }
    
    this.running = false;
    console.log('🛑 Parando monitor do sistema...');
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.emit('stopped');
  }

  async collectMetrics() {
    try {
      // Coletar métricas do sistema
      const systemMetrics = await this.getSystemMetrics();
      this.stats.system = systemMetrics;
      
      // Coletar informações dos containers
      const containers = await this.getContainers();
      this.stats.containers = containers;
      
      // Coletar estatísticas detalhadas de cada container
      for (const container of containers) {
        try {
          const stats = await this.getContainerStats(container.clientId);
          container.stats = stats;
        } catch (error) {
          console.error(`❌ Erro ao obter stats do container ${container.clientId}:`, error.message);
        }
      }
      
      this.emit('metrics_updated', this.stats);
      
    } catch (error) {
      console.error('❌ Erro ao coletar métricas:', error);
      this.emit('error', error);
    }
  }

  async getSystemMetrics() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/metrics`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter métricas do sistema: ${error.message}`);
    }
  }

  async getContainers() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/containers`);
      return response.data.containers || [];
    } catch (error) {
      throw new Error(`Erro ao obter containers: ${error.message}`);
    }
  }

  async getContainerStats(clientId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/client/${clientId}/stats`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas do container ${clientId}: ${error.message}`);
    }
  }

  async getContainerHistory(clientId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/client/${clientId}/history`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter histórico do container ${clientId}: ${error.message}`);
    }
  }

  displayDashboard() {
    console.clear();
    console.log('📊 Dashboard do Sistema de Orquestração');
    console.log('=====================================');
    console.log(`Última atualização: ${new Date().toLocaleString()}`);
    console.log();
    
    // Métricas do sistema
    if (this.stats.system) {
      const sys = this.stats.system;
      console.log('🖥️  Sistema:');
      console.log(`   Containers ativos: ${sys.containers.active}/${sys.containers.max_concurrent}`);
      console.log(`   Total criados: ${sys.containers.total_created}`);
      console.log(`   Total destruídos: ${sys.containers.total_destroyed}`);
      console.log(`   Uptime: ${this.formatUptime(sys.resources.uptime)}`);
      console.log(`   Memória: ${this.formatBytes(sys.resources.memory.used)} / ${this.formatBytes(sys.resources.memory.total)}`);
      console.log();
    }
    
    // Containers ativos
    if (this.stats.containers.length > 0) {
      console.log('🐳 Containers Ativos:');
      this.stats.containers.forEach(container => {
        console.log(`   ${container.clientId}:`);
        console.log(`      Status: ${container.status}`);
        console.log(`      Tipo: ${container.resourceType}`);
        console.log(`      Uptime: ${this.formatUptime((Date.now() - container.created) / 1000)}`);
        
        if (container.stats) {
          console.log(`      CPU: ${container.stats.cpu.toFixed(1)}%`);
          console.log(`      Memória: ${container.stats.memory.toFixed(1)}%`);
        }
        console.log();
      });
    } else {
      console.log('🐳 Nenhum container ativo');
      console.log();
    }
    
    // Alertas recentes
    if (this.stats.alerts.length > 0) {
      console.log('🚨 Alertas Recentes:');
      this.stats.alerts.slice(-5).forEach(alert => {
        const time = new Date(alert.timestamp).toLocaleTimeString();
        console.log(`   ${time} - ${alert.alert.message} (${alert.clientId})`);
      });
      console.log();
    }
    
    console.log('Pressione Ctrl+C para parar o monitor');
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  startDashboard() {
    // Atualizar dashboard a cada segundo
    this.dashboardInterval = setInterval(() => {
      this.displayDashboard();
    }, 1000);
    
    // Primeira exibição
    this.displayDashboard();
  }

  stopDashboard() {
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
    }
  }
}

// Executar monitor se chamado diretamente
if (require.main === module) {
  const monitor = new SystemMonitor();
  
  monitor.on('started', () => {
    console.log('✅ Monitor iniciado');
    monitor.startDashboard();
  });
  
  monitor.on('error', (error) => {
    console.error('❌ Erro no monitor:', error);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando monitor...');
    monitor.stopDashboard();
    await monitor.stop();
    process.exit(0);
  });
  
  monitor.start();
}

module.exports = SystemMonitor;