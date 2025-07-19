#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.cyan) {
  console.log(`${color}[TEST] ${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// Teste básico de conectividade
async function testConnection(url, timeout = 5000) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'GET',
      timeout: timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          success: res.statusCode === 200,
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

// Verificar se Docker está rodando
async function checkDocker() {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['info'], { stdio: 'pipe' });
    
    docker.on('close', (code) => {
      resolve(code === 0);
    });
    
    docker.on('error', () => {
      resolve(false);
    });
  });
}

// Verificar se docker-compose está disponível
async function checkDockerCompose() {
  return new Promise((resolve) => {
    const compose = spawn('docker-compose', ['--version'], { stdio: 'pipe' });
    
    compose.on('close', (code) => {
      resolve(code === 0);
    });
    
    compose.on('error', () => {
      resolve(false);
    });
  });
}

// Verificar arquivos necessários
function checkFiles() {
  const fs = require('fs');
  const requiredFiles = [
    'docker-compose.yml',
    'claude-service/Dockerfile',
    'claude-service/orchestrator.js',
    'claude-service/package.json',
    'Dockerfile.user-env',
    'monitoring/Dockerfile',
    'monitoring/health-monitor.js',
    'nginx/nginx.conf'
  ];

  const missingFiles = [];
  
  for (const file of requiredFiles) {
    try {
      fs.accessSync(file);
    } catch (error) {
      missingFiles.push(file);
    }
  }
  
  return missingFiles;
}

// Função principal de teste
async function runTests() {
  console.log(`${colors.blue}
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                           CRYSTALK DOCKER SYSTEM TEST                               ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  let testsPassed = 0;
  let testsTotal = 0;

  // Teste 1: Verificar Docker
  testsTotal++;
  log('Verificando Docker...');
  const dockerOk = await checkDocker();
  if (dockerOk) {
    success('Docker está rodando');
    testsPassed++;
  } else {
    error('Docker não está rodando ou não está acessível');
  }

  // Teste 2: Verificar docker-compose
  testsTotal++;
  log('Verificando docker-compose...');
  const composeOk = await checkDockerCompose();
  if (composeOk) {
    success('docker-compose está disponível');
    testsPassed++;
  } else {
    error('docker-compose não está disponível');
  }

  // Teste 3: Verificar arquivos necessários
  testsTotal++;
  log('Verificando arquivos necessários...');
  const missingFiles = checkFiles();
  if (missingFiles.length === 0) {
    success('Todos os arquivos necessários estão presentes');
    testsPassed++;
  } else {
    error(`Arquivos faltando: ${missingFiles.join(', ')}`);
  }

  // Teste 4: Verificar se serviços estão rodando
  testsTotal++;
  log('Verificando serviços ativos...');
  const services = [
    { name: 'Aplicação Principal', url: 'http://localhost:3000/health' },
    { name: 'Monitoramento', url: 'http://localhost:9090/health' },
    { name: 'Frontend', url: 'http://localhost:5173' }
  ];

  let servicesRunning = 0;
  for (const service of services) {
    const result = await testConnection(service.url, 3000);
    if (result.success) {
      success(`${service.name} está rodando`);
      servicesRunning++;
    } else {
      warning(`${service.name} não está acessível: ${result.error || 'Status ' + result.status}`);
    }
  }

  if (servicesRunning > 0) {
    success(`${servicesRunning}/${services.length} serviços estão rodando`);
    testsPassed++;
  } else {
    error('Nenhum serviço está rodando');
  }

  // Teste 5: Verificar tunnel
  testsTotal++;
  log('Verificando tunnel...');
  const tunnelResult = await testConnection('https://furthermore-decide-para-ste.trycloudflare.com', 5000);
  if (tunnelResult.success) {
    success('Tunnel está funcionando');
    testsPassed++;
  } else {
    warning('Tunnel não está acessível ou não está configurado');
  }

  // Resumo dos testes
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  
  if (testsPassed === testsTotal) {
    success(`TODOS OS TESTES PASSARAM (${testsPassed}/${testsTotal})`);
  } else {
    warning(`ALGUNS TESTES FALHARAM (${testsPassed}/${testsTotal})`);
  }

  // Recomendações
  console.log(`\n${colors.cyan}RECOMENDAÇÕES:${colors.reset}`);
  
  if (!dockerOk) {
    console.log('• Iniciar o Docker Desktop ou serviço Docker');
  }
  
  if (!composeOk) {
    console.log('• Instalar docker-compose');
  }
  
  if (missingFiles.length > 0) {
    console.log('• Verificar estrutura de arquivos do projeto');
  }
  
  if (servicesRunning === 0) {
    console.log('• Executar: ./scripts/docker-deploy.sh');
    console.log('• Ou para sistema atual: npm run dev');
  }
  
  console.log(`\n${colors.cyan}PRÓXIMOS PASSOS:${colors.reset}`);
  console.log('1. Configurar variáveis de ambiente no .env');
  console.log('2. Executar: ./scripts/build-docker.sh');
  console.log('3. Executar: ./scripts/docker-deploy.sh');
  console.log('4. Verificar logs: docker-compose logs -f');
  console.log('5. Acessar: http://localhost:3000');

  return testsPassed === testsTotal;
}

// Executar testes
if (require.main === module) {
  runTests().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('Erro durante os testes:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testConnection, checkDocker, checkDockerCompose };