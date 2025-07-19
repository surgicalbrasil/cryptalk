/**
 * Terminal Listener
 * Escuta comandos do backend e executa no Claude Code terminal
 * Execute este arquivo no WSL onde roda Claude Code
 */

const net = require('net');
const { spawn } = require('child_process');

class TerminalListener {
  constructor() {
    this.server = null;
    this.port = 8888;
    this.activeClaudeProcesses = new Map();
  }

  start() {
    this.server = net.createServer((socket) => {
      console.log('🔗 Backend conectou ao terminal');

      socket.on('data', async (data) => {
        try {
          const message = data.toString();
          console.log('📥 Recebido do backend:', message.substring(0, 100) + '...');

          if (message === 'ping') {
            socket.write('pong');
            socket.end();
            return;
          }

          // Processar comando
          const response = await this.processCommand(message);
          socket.write(JSON.stringify({
            success: true,
            response: response,
            timestamp: Date.now()
          }));
          socket.end();

        } catch (error) {
          console.error('❌ Erro processando comando:', error);
          socket.write(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: Date.now()
          }));
          socket.end();
        }
      });

      socket.on('error', (error) => {
        console.error('❌ Erro socket:', error);
      });
    });

    this.server.listen(this.port, () => {
      console.log(`🎧 Terminal listener rodando na porta ${this.port}`);
      console.log('✅ Pronto para receber comandos do backend');
      console.log('🤖 Claude Code disponível para análises');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando terminal listener...');
      this.stop();
      process.exit(0);
    });
  }

  async processCommand(commandData) {
    try {
      const command = JSON.parse(commandData);
      
      switch (command.type) {
        case 'analyze':
          return await this.runClaudeCode(command.prompt);
        default:
          return await this.runClaudeCode(commandData);
      }
    } catch (error) {
      // Se não for JSON, tratar como prompt direto
      return await this.runClaudeCode(commandData);
    }
  }

  async runClaudeCode(prompt) {
    return new Promise((resolve, reject) => {
      console.log('🤖 Executando Claude Code...');
      
      // Executar Claude Code como subprocess
      const claude = spawn('claude', ['code'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let errors = '';

      // Enviar prompt
      claude.stdin.write(prompt);
      claude.stdin.end();

      // Coletar output
      claude.stdout.on('data', (data) => {
        output += data.toString();
      });

      claude.stderr.on('data', (data) => {
        errors += data.toString();
      });

      claude.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Claude Code executado com sucesso');
          resolve(output);
        } else {
          console.error('❌ Claude Code falhou:', errors);
          reject(new Error(`Claude Code falhou: ${errors}`));
        }
      });

      claude.on('error', (error) => {
        console.error('❌ Erro executando Claude Code:', error);
        reject(error);
      });

      // Timeout de 2 minutos
      setTimeout(() => {
        claude.kill();
        reject(new Error('Timeout executando Claude Code (2min)'));
      }, 120000);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
    
    // Finalizar processos ativos
    for (const [id, process] of this.activeClaudeProcesses) {
      process.kill();
    }
    this.activeClaudeProcesses.clear();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const listener = new TerminalListener();
  listener.start();
}

module.exports = TerminalListener;