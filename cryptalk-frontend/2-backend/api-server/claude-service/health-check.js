const fs = require('fs');

// Health check simples para containers
try {
  // Verificar se diretórios essenciais existem
  const dirs = ['/app', '/app/uploads', '/app/workspace'];
  
  for (const dir of dirs) {
    if (\!fs.existsSync(dir)) {
      throw new Error(`Diretório ${dir} não encontrado`);
    }
  }
  
  // Verificar se scripts principais existem
  const scripts = ['/app/simple-analyzer.js'];
  
  for (const script of scripts) {
    if (\!fs.existsSync(script)) {
      throw new Error(`Script ${script} não encontrado`);
    }
  }
  
  console.log('✅ Container healthy');
  process.exit(0);
} catch (error) {
  console.error('❌ Container unhealthy:', error.message);
  process.exit(1);
}
EOF < /dev/null
