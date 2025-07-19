const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configurações
const CLAUDE_TIMEOUT = 5 * 60 * 1000; // 5 minutos
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

class ClaudeAnalyzer {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.containerName = process.env.CONTAINER_NAME;
  }

  async analyzeDocument(filePath, documentType) {
    try {
      // Validar arquivo
      await this.validateFile(filePath);
      
      // Criar prompt baseado no tipo de documento
      const prompt = this.createPrompt(filePath, documentType);
      
      // Executar análise
      const result = await this.executeClaude(prompt);
      
      return result;
    } catch (error) {
      throw new Error(`Erro na análise: ${error.message}`);
    }
  }

  async validateFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error('Caminho não é um arquivo válido');
      }

      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande: ${stats.size} bytes (máximo: ${MAX_FILE_SIZE} bytes)`);
      }

      const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx', '.md'];
      const extension = path.extname(filePath).toLowerCase();
      
      if (!allowedExtensions.includes(extension)) {
        throw new Error(`Extensão não permitida: ${extension}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Erro ao validar arquivo: ${error.message}`);
    }
  }

  createPrompt(filePath, documentType) {
    const fileName = path.basename(filePath);
    
    let prompt = `Você é um especialista em análise de documentos executando em um container isolado. `;
    
    switch (documentType) {
      case 'pitch-deck':
        prompt += `Analise o pitch deck "${fileName}" seguindo as melhores práticas para avaliação de apresentações de negócios.

ESTRUTURA DE ANÁLISE:
1. **Resumo Executivo**
   - Proposta de valor clara
   - Problema e solução
   - Mercado-alvo

2. **Análise Técnica**
   - Modelo de negócio
   - Estratégia de monetização
   - Competitive advantage

3. **Análise Financeira**
   - Projeções apresentadas
   - Viabilidade econômica
   - Necessidades de investimento

4. **Análise de Mercado**
   - Tamanho do mercado
   - Concorrência
   - Posicionamento

5. **Avaliação da Equipe**
   - Experiência dos fundadores
   - Capacidade de execução
   - Histórico relevante

6. **Recomendações**
   - Pontos fortes
   - Pontos de melhoria
   - Próximos passos`;
        break;
        
      case 'patente':
        prompt += `Analise a patente "${fileName}" seguindo as diretrizes para avaliação de propriedade intelectual.

ESTRUTURA DE ANÁLISE:
1. **Resumo da Invenção**
   - Descrição técnica
   - Novidade apresentada
   - Aplicação prática

2. **Análise de Patenteabilidade**
   - Novidade
   - Atividade inventiva
   - Aplicação industrial

3. **Estado da Arte**
   - Tecnologias similares
   - Diferenciação
   - Vantagens competitivas

4. **Análise de Reivindicações**
   - Escopo de proteção
   - Clareza das reivindicações
   - Força da patente

5. **Avaliação Comercial**
   - Potencial de mercado
   - Aplicações possíveis
   - Valor econômico

6. **Recomendações**
   - Viabilidade da patente
   - Estratégias de proteção
   - Próximos passos`;
        break;
        
      case 'projecao':
        prompt += `Analise a projeção financeira "${fileName}" seguindo as melhores práticas para avaliação de viabilidade econômica.

ESTRUTURA DE ANÁLISE:
1. **Análise das Premissas**
   - Pressupostos de receita
   - Estrutura de custos
   - Cenários considerados

2. **Análise de Receitas**
   - Fontes de receita
   - Crescimento projetado
   - Sazonalidade

3. **Análise de Custos**
   - Custos fixos e variáveis
   - Margem de contribuição
   - Ponto de equilíbrio

4. **Análise de Fluxo de Caixa**
   - Geração de caixa
   - Necessidades de capital
   - Cronograma financeiro

5. **Análise de Sensibilidade**
   - Cenários otimista/pessimista
   - Variáveis críticas
   - Riscos financeiros

6. **Recomendações**
   - Viabilidade do projeto
   - Pontos de atenção
   - Melhorias sugeridas`;
        break;
        
      default:
        prompt += `Analise o documento "${fileName}" de forma estruturada e abrangente.

ESTRUTURA DE ANÁLISE:
1. **Resumo do Documento**
   - Objetivo principal
   - Escopo do conteúdo
   - Público-alvo

2. **Análise de Conteúdo**
   - Pontos principais
   - Estrutura lógica
   - Completude das informações

3. **Análise Crítica**
   - Pontos fortes
   - Pontos fracos
   - Inconsistências

4. **Contexto e Relevância**
   - Aplicabilidade
   - Atualidade
   - Impacto potencial

5. **Recomendações**
   - Melhorias sugeridas
   - Próximos passos
   - Considerações finais`;
    }
    
    prompt += `

INSTRUÇÕES DE EXECUÇÃO:
1. Leia e analise completamente o documento "${fileName}"
2. Siga rigorosamente a estrutura de análise fornecida
3. Forneça uma análise detalhada, objetiva e profissional
4. Use formatação markdown para melhor legibilidade
5. Inclua exemplos específicos do documento quando relevante
6. Mantenha foco na qualidade e precisão da análise
7. Termine com um resumo executivo de 2-3 parágrafos

FORMATO DA RESPOSTA:
- Use títulos e subtítulos para organizar a análise
- Inclua bullet points para facilitar a leitura
- Destaque informações importantes com **negrito**
- Use listas numeradas para sequências lógicas
- Inclua citações do documento quando apropriado

Cliente: ${this.clientId}
Container: ${this.containerName}

Inicie a análise completa do documento agora.`;

    return prompt;
  }

  async executeClaude(prompt) {
    return new Promise((resolve, reject) => {
      console.log('🤖 Iniciando análise com Claude Code...');
      
      // Verificar se Claude Code está disponível
      const claudeCommand = process.env.CLAUDE_COMMAND || 'claude';
      
      // Executar Claude Code com prompt
      const claudeProcess = spawn(claudeCommand, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          CLAUDE_API_KEY: process.env.CLAUDE_API_KEY
        }
      });

      let output = '';
      let error = '';
      let isResolved = false;

      // Enviar prompt via stdin
      claudeProcess.stdin.write(prompt);
      claudeProcess.stdin.end();

      claudeProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Log progress to Docker
        if (chunk.includes('Analyzing') || chunk.includes('Processing') || chunk.includes('Generating')) {
          console.log(`📊 ${chunk.trim()}`);
        }
      });

      claudeProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        console.error(`⚠️ ${chunk.trim()}`);
      });

      claudeProcess.on('close', (code) => {
        if (isResolved) return;
        isResolved = true;
        
        if (code === 0) {
          console.log('✅ Análise concluída com sucesso');
          resolve(this.formatOutput(output));
        } else {
          console.error(`❌ Claude Code falhou com código ${code}`);
          reject(new Error(`Claude Code falhou com código ${code}: ${error}`));
        }
      });

      claudeProcess.on('error', (err) => {
        if (isResolved) return;
        isResolved = true;
        
        console.error(`❌ Erro ao executar Claude Code: ${err.message}`);
        reject(new Error(`Erro ao executar Claude Code: ${err.message}`));
      });

      // Timeout com cleanup
      const timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        
        console.error('⏰ Timeout: Análise demorou mais que 5 minutos');
        claudeProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (!claudeProcess.killed) {
            claudeProcess.kill('SIGKILL');
          }
        }, 5000);
        
        reject(new Error('Timeout: Análise demorou mais que 5 minutos'));
      }, CLAUDE_TIMEOUT);

      // Cleanup timeout se processo terminar
      claudeProcess.on('exit', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  formatOutput(output) {
    // Remover caracteres de controle e limpar output
    let cleanOutput = output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI colors
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    // Adicionar metadados da análise
    const metadata = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      containerName: this.containerName,
      analyzer: 'Claude Code Container Analysis'
    };

    return {
      analysis: cleanOutput,
      metadata: metadata,
      success: true
    };
  }
}

// Função principal para uso via CLI
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 6) {
      console.error('Uso: node claude-analyzer.js --file <arquivo> --type <tipo> --client <clientId>');
      process.exit(1);
    }

    const fileIndex = args.indexOf('--file');
    const typeIndex = args.indexOf('--type');
    const clientIndex = args.indexOf('--client');

    if (fileIndex === -1 || typeIndex === -1 || clientIndex === -1) {
      console.error('Parâmetros obrigatórios: --file, --type, --client');
      process.exit(1);
    }

    const filePath = args[fileIndex + 1];
    const documentType = args[typeIndex + 1];
    const clientId = args[clientIndex + 1];

    // Configurar cliente
    process.env.CLIENT_ID = clientId;

    const analyzer = new ClaudeAnalyzer();
    
    console.log(`🔍 Iniciando análise de ${filePath} (tipo: ${documentType}) para cliente ${clientId}`);
    
    const result = await analyzer.analyzeDocument(filePath, documentType);
    
    console.log('\n📊 RESULTADO DA ANÁLISE:');
    console.log('=' .repeat(50));
    console.log(result);
    console.log('=' .repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = ClaudeAnalyzer;