const express = require('express');
const http = require('http');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 9090;

// Configurações
const HEALTH_CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || '*/30 * * * * *'; // 30 segundos
const SERVICES = [
  {
    name: 'claude-service',
    url: 'http://claude-service:3000/health',
    timeout: 5000
  }
];

// Estado do sistema
let systemHealth = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: {},
  containers: {},
  metrics: {
    totalRequests: 0,
    errorRate: 0,
    uptime: process.uptime()
  }
};

// Middleware
app.use(express.json());

// Função para verificar saúde de um serviço
async function checkServiceHealth(service) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.request(service.url, { timeout: service.timeout }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const healthData = JSON.parse(data);
          resolve({
            name: service.name,
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            responseTime,
            details: healthData
          });
        } catch (error) {
          resolve({
            name: service.name,
            status: 'unhealthy',
            responseTime,
            error: 'Invalid JSON response'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        name: service.name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        status: 'unhealthy',
        responseTime: service.timeout,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

// Função para verificar containers Docker
async function checkContainerHealth() {
  // Simular verificação de containers (em produção, usar Docker API)
  return {
    total: 3,
    running: 3,
    stopped: 0,
    failed: 0
  };
}

// Função para coletar métricas
async function collectMetrics() {
  const metrics = {
    totalRequests: systemHealth.metrics.totalRequests,
    errorRate: systemHealth.metrics.errorRate,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
  
  return metrics;
}

// Função principal de verificação de saúde
async function performHealthCheck() {
  const timestamp = new Date().toISOString();
  
  try {
    // Verificar serviços
    const serviceChecks = await Promise.all(
      SERVICES.map(service => checkServiceHealth(service))
    );
    
    // Verificar containers
    const containerHealth = await checkContainerHealth();
    
    // Coletar métricas
    const metrics = await collectMetrics();
    
    // Processar resultados
    const services = {};
    let allHealthy = true;
    
    serviceChecks.forEach(check => {
      services[check.name] = check;
      if (check.status !== 'healthy') {
        allHealthy = false;
      }
    });
    
    // Atualizar estado do sistema
    systemHealth = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      services,
      containers: containerHealth,
      metrics
    };
    
    console.log(`[${timestamp}] Health check completed - Status: ${systemHealth.status}`);
    
  } catch (error) {
    console.error('Erro no health check:', error);
    systemHealth = {
      status: 'unhealthy',
      timestamp,
      error: error.message,
      services: {},
      containers: {},
      metrics: await collectMetrics()
    };
  }
}

// Rotas da API

// Health check endpoint
app.get('/health', (req, res) => {
  const isHealthy = systemHealth.status === 'healthy';
  
  res.status(isHealthy ? 200 : 503).json({
    status: systemHealth.status,
    timestamp: systemHealth.timestamp,
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Status detalhado
app.get('/status', (req, res) => {
  systemHealth.metrics.totalRequests++;
  res.json(systemHealth);
});

// Métricas individuais
app.get('/metrics', (req, res) => {
  res.json(systemHealth.metrics);
});

// Informações dos serviços
app.get('/services', (req, res) => {
  res.json(systemHealth.services);
});

// Informações dos containers
app.get('/containers', (req, res) => {
  res.json(systemHealth.containers);
});

// Forçar verificação de saúde
app.post('/check', async (req, res) => {
  await performHealthCheck();
  res.json({
    message: 'Health check executado',
    timestamp: new Date().toISOString(),
    status: systemHealth.status
  });
});

// Configurar verificação automática
cron.schedule(HEALTH_CHECK_INTERVAL, performHealthCheck);

// Executar verificação inicial
performHealthCheck();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🔍 Claude Code Health Monitor rodando na porta ${PORT}`);
  console.log(`📊 Verificações automáticas: ${HEALTH_CHECK_INTERVAL}`);
  console.log(`🎯 Serviços monitorados: ${SERVICES.length}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando Health Monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando Health Monitor...');
  process.exit(0);
});