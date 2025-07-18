const http = require('http');
const { exit } = require('process');

// Configurações do health check
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
const TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000;

function healthCheck() {
  const url = new URL(HEALTH_CHECK_URL);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 3000,
    path: url.pathname,
    method: 'GET',
    timeout: TIMEOUT
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const health = JSON.parse(data);
        
        if (res.statusCode === 200 && health.status === 'healthy') {
          console.log('✅ Health check passou');
          exit(0);
        } else {
          console.error('❌ Health check falhou:', health);
          exit(1);
        }
      } catch (error) {
        console.error('❌ Erro ao parsear resposta do health check:', error);
        exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erro na requisição do health check:', error);
    exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Health check timeout');
    req.destroy();
    exit(1);
  });

  req.end();
}

// Executar health check
healthCheck();