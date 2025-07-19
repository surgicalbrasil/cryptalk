const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ClaudeExecutor {
  constructor() {
    this.activeProcesses = new Map();
  }

  async executeAnalysis(clientId, filePath, documentType, onProgress) {
    const processId = `${clientId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const templatePath = path.join(__dirname, 'templates', `${documentType}.md`);
      const workingDir = path.join(__dirname, 'client-containers', clientId);
      
      // Criar prompt personalizado baseado no tipo de documento
      const prompt = this.createPrompt(filePath, templatePath, documentType);
      
      // Executar Claude Code
      const childProcess = spawn('claude', ['--print', prompt], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_API_KEY: process.env.CLAUDE_API_KEY
        }
      });

      // Armazenar processo ativo
      this.activeProcesses.set(processId, childProcess);

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Enviar progresso em tempo real
        if (onProgress) {
          onProgress({
            type: 'chunk',
            content: chunk,
            progress: Math.min((output.length / 1000) * 100, 90)
          });
        }
      });

      childProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error(`Claude Code stderr: ${data}`);
      });

      childProcess.on('close', (code) => {
        this.activeProcesses.delete(processId);
        
        if (code === 0) {
          if (onProgress) {
            onProgress({
              type: 'complete',
              content: output,
              progress: 100
            });
          }
          resolve(output);
        } else {
          reject(new Error(`Claude Code falhou com código ${code}: ${error}`));
        }
      });

      childProcess.on('error', (err) => {
        this.activeProcesses.delete(processId);
        reject(new Error(`Erro ao executar Claude Code: ${err.message}`));
      });

      // Timeout de 5 minutos
      setTimeout(() => {
        if (this.activeProcesses.has(processId)) {
          childProcess.kill('SIGTERM');
          this.activeProcesses.delete(processId);
          reject(new Error('Timeout: Análise demorou mais que 5 minutos'));
        }
      }, 5 * 60 * 1000);
    });
  }

  createPrompt(filePath, templatePath, documentType) {
    const fileName = path.basename(filePath);
    
    let prompt = `Você é um especialista em análise de documentos. `;
    
    switch (documentType) {
      case 'pitch-deck':
        prompt += `Analise o pitch deck "${fileName}" seguindo as diretrizes estruturais para avaliação de pitch decks. `;
        break;
      case 'patente':
        prompt += `Analise a patente "${fileName}" seguindo as diretrizes para avaliação de propriedade intelectual. `;
        break;
      case 'projecao':
        prompt += `Analise a projeção financeira "${fileName}" seguindo as diretrizes para avaliação de viabilidade financeira. `;
        break;
      default:
        prompt += `Analise o documento "${fileName}" de forma estruturada. `;
    }
    
    prompt += `
    
INSTRUÇÕES:
1. Leia e analise o documento "${fileName}" localizado no diretório atual
2. Consulte o template estrutural em "${templatePath}" para seguir as diretrizes específicas
3. Forneça uma análise detalhada, estruturada e profissional
4. Destaque pontos fortes, fracos e oportunidades de melhoria
5. Inclua recomendações específicas e actionáveis
6. Use formatação markdown para melhor legibilidade
7. Seja objetivo mas completo na análise

FORMATO DA RESPOSTA:
- Use títulos e subtítulos para organizar a análise
- Inclua bullet points para facilitar a leitura
- Destaque informações importantes
- Termine com um resumo executivo e recomendações

Inicie a análise agora.`;

    return prompt;
  }

  async killProcess(processId) {
    if (this.activeProcesses.has(processId)) {
      const childProcess = this.activeProcesses.get(processId);
      childProcess.kill('SIGTERM');
      this.activeProcesses.delete(processId);
      return true;
    }
    return false;
  }

  getActiveProcesses() {
    return Array.from(this.activeProcesses.keys());
  }

  async validateFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error('Caminho não é um arquivo');
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (stats.size > maxSize) {
        throw new Error('Arquivo muito grande (máximo 50MB)');
      }

      const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'];
      const extension = path.extname(filePath).toLowerCase();
      
      if (!allowedExtensions.includes(extension)) {
        throw new Error(`Extensão não permitida: ${extension}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Erro ao validar arquivo: ${error.message}`);
    }
  }
}

module.exports = ClaudeExecutor;