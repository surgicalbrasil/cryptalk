/**
 * Analysis Engine - Engine de análise
 * Processamento de documentos e comunicação com Claude CLI
 * Zero acoplamento, abstrações limpa do Claude CLI
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { IAnalysisEngine } from '../../core/interfaces/IClaudeService';
import { ClaudeEnvironment } from './ClaudeService';

export interface AnalysisEngineConfig {
  claudeCommand: string;
  analysisTimeout: number;
  tempDirectory: string;
  environment: ClaudeEnvironment;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

export interface DocumentTemplate {
  name: string;
  content: string;
  variables: string[];
  lastModified: Date;
}

export interface AnalysisContext {
  analysisId: string;
  filePath: string;
  documentType: string;
  template: string;
  startTime: Date;
}

export class AnalysisEngine extends EventEmitter implements IAnalysisEngine {
  private config: AnalysisEngineConfig;
  private activeProcesses = new Map<string, ChildProcess>();
  private templateCache = new Map<string, DocumentTemplate>();
  private analysisContexts = new Map<string, AnalysisContext>();

  // Built-in templates for different document types
  private readonly defaultTemplates: Record<string, string> = {
    'pitch-deck': `
# Análise de Pitch Deck

## Instruções
Analise o pitch deck seguindo as melhores práticas para avaliação de apresentações de negócios.

## Estrutura da Análise
1. **Resumo Executivo**
   - Proposta de valor clara
   - Problema e solução
   - Mercado-alvo

2. **Análise Técnica**
   - Modelo de negócio
   - Estratégia de monetização
   - Vantagem competitiva

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
   - Próximos passos

Forneça uma análise detalhada e profissional em formato markdown.
`,
    'patent': `
# Análise de Patente

## Instruções
Analise a patente seguindo as diretrizes para avaliação de propriedade intelectual.

## Estrutura da Análise
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
   - Próximos passos

Forneça uma análise técnica detalhada em formato markdown.
`,
    'financial': `
# Análise de Documento Financeiro

## Instruções
Analise o documento financeiro seguindo as melhores práticas para avaliação de viabilidade econômica.

## Estrutura da Análise
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
   - Melhorias sugeridas

Forneça uma análise financeira detalhada em formato markdown.
`,
    'tech-doc': `
# Análise de Documento Técnico

## Instruções
Analise o documento técnico de forma estruturada e abrangente.

## Estrutura da Análise
1. **Resumo Técnico**
   - Objetivo principal
   - Escopo do documento
   - Tecnologias envolvidas

2. **Análise de Arquitetura**
   - Estrutura proposta
   - Componentes principais
   - Integrações

3. **Análise de Implementação**
   - Viabilidade técnica
   - Complexidade
   - Riscos de implementação

4. **Análise de Performance**
   - Requisitos de performance
   - Escalabilidade
   - Otimizações

5. **Análise de Segurança**
   - Vulnerabilidades potenciais
   - Medidas de segurança
   - Compliance

6. **Recomendações**
   - Melhorias técnicas
   - Alternativas
   - Próximos passos

Forneça uma análise técnica detalhada em formato markdown.
`,
    'legal-doc': `
# Análise de Documento Legal

## Instruções
Analise o documento legal de forma estruturada.

## Estrutura da Análise
1. **Resumo do Documento**
   - Tipo de documento
   - Partes envolvidas
   - Objetivo principal

2. **Análise de Estrutura**
   - Organização do documento
   - Cláusulas principais
   - Completude

3. **Análise de Riscos**
   - Riscos legais identificados
   - Ambiguidades
   - Conflitos potenciais

4. **Análise de Compliance**
   - Conformidade legal
   - Regulamentações aplicáveis
   - Requisitos legais

5. **Análise de Proteções**
   - Cláusulas de proteção
   - Limitações de responsabilidade
   - Garantias

6. **Recomendações**
   - Melhorias sugeridas
   - Riscos a mitigar
   - Próximos passos

Forneça uma análise legal detalhada em formato markdown.
`
  };

  constructor(config: AnalysisEngineConfig) {
    super();
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx', '.md'],
      ...config
    };

    this.initializeTemplateCache();
  }

  /**
   * Initialize template cache with default templates
   */
  private initializeTemplateCache(): void {
    for (const [type, content] of Object.entries(this.defaultTemplates)) {
      this.templateCache.set(type, {
        name: type,
        content,
        variables: this.extractTemplateVariables(content),
        lastModified: new Date()
      });
    }
  }

  /**
   * Extract variables from template ({{variable}} format)
   */
  private extractTemplateVariables(template: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  // IAnalysisEngine Implementation

  /**
   * Preprocess document for analysis
   */
  async preprocessDocument(filePath: string, documentType: string): Promise<string> {
    try {
      // Validate file
      await this.validateFile(filePath);

      // Get file info
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();

      // Basic file information
      const fileInfo = {
        name: fileName,
        path: filePath,
        size: stats.size,
        extension,
        documentType,
        lastModified: stats.mtime
      };

      // For text files, read content directly
      if (['.txt', '.md'].includes(extension)) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.stringify({
          fileInfo,
          content,
          contentType: 'text',
          preprocessedAt: new Date().toISOString()
        });
      }

      // For other files, return file information for Claude to process
      return JSON.stringify({
        fileInfo,
        contentType: 'binary',
        message: `File requires Claude Code to process: ${fileName}`,
        preprocessedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to preprocess document: ${(error as Error).message}`);
    }
  }

  /**
   * Execute analysis using Claude CLI
   */
  async executeAnalysis(processedContent: string, template: string): Promise<string> {
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Parse processed content
      const contentData = JSON.parse(processedContent);
      const { fileInfo } = contentData;

      // Create analysis context
      const context: AnalysisContext = {
        analysisId,
        filePath: fileInfo.path,
        documentType: fileInfo.documentType,
        template,
        startTime: new Date()
      };

      this.analysisContexts.set(analysisId, context);

      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt(contentData, template);

      // Execute Claude CLI
      const result = await this.executeClaude(analysisId, prompt);

      // Clean up context
      this.analysisContexts.delete(analysisId);

      return result;

    } catch (error) {
      this.analysisContexts.delete(analysisId);
      throw new Error(`Analysis execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Post-process analysis result
   */
  async postprocessResult(rawResult: string, format: string): Promise<any> {
    try {
      switch (format.toLowerCase()) {
        case 'json':
          return this.formatAsJson(rawResult);
        
        case 'markdown':
          return this.formatAsMarkdown(rawResult);
        
        case 'html':
          return this.formatAsHtml(rawResult);
        
        default:
          return {
            format: 'raw',
            content: rawResult,
            summary: this.extractSummary(rawResult),
            insights: this.extractInsights(rawResult),
            recommendations: this.extractRecommendations(rawResult),
            metadata: {
              processedAt: new Date().toISOString(),
              originalFormat: format
            }
          };
      }
    } catch (error) {
      throw new Error(`Failed to post-process result: ${(error as Error).message}`);
    }
  }

  // Template Management

  /**
   * Load template for document type
   */
  async loadTemplate(documentType: string): Promise<string> {
    // Check cache first
    const cached = this.templateCache.get(documentType);
    if (cached) {
      return cached.content;
    }

    // Try to load from file system
    try {
      const templatePath = path.join(this.config.tempDirectory, 'templates', `${documentType}.md`);
      const content = await fs.readFile(templatePath, 'utf8');
      
      // Cache the template
      await this.cacheTemplate(documentType, content);
      
      return content;
    } catch (error) {
      // Fallback to default template
      const defaultTemplate = this.defaultTemplates[documentType] || this.defaultTemplates['tech-doc'];
      
      // Cache the default
      await this.cacheTemplate(documentType, defaultTemplate);
      
      return defaultTemplate;
    }
  }

  /**
   * Validate template
   */
  async validateTemplate(template: string): Promise<boolean> {
    try {
      // Basic validation
      if (!template || template.trim().length === 0) {
        return false;
      }

      // Check for required sections
      const requiredSections = ['Instruções', 'Estrutura'];
      const hasRequiredSections = requiredSections.every(section => 
        template.includes(section)
      );

      // Check for valid markdown structure
      const hasMarkdownHeaders = template.includes('#');

      return hasRequiredSections && hasMarkdownHeaders;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cache template
   */
  async cacheTemplate(documentType: string, template: string): Promise<void> {
    const templateData: DocumentTemplate = {
      name: documentType,
      content: template,
      variables: this.extractTemplateVariables(template),
      lastModified: new Date()
    };

    this.templateCache.set(documentType, templateData);
  }

  // Claude CLI Integration

  /**
   * Execute Claude CLI command
   */
  private async executeClaude(analysisId: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.emit('analysis_started', { analysisId });

      // Create temporary file for prompt
      const tempFile = path.join(this.config.tempDirectory, `claude-prompt-${analysisId}.md`);
      
      fs.writeFile(tempFile, prompt, 'utf8').then(() => {
        // Execute Claude CLI
        const claudeProcess = spawn(this.config.claudeCommand, [tempFile], {
          cwd: this.config.environment.workingDirectory,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: this.config.environment.apiKey,
            CLAUDE_API_KEY: this.config.environment.apiKey
          },
          stdio: ['ignore', 'pipe', 'pipe']
        });

        this.activeProcesses.set(analysisId, claudeProcess);

        let output = '';
        let errorOutput = '';
        let progress = 10;

        claudeProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          
          // Emit progress updates
          progress = Math.min(90, progress + 5);
          this.emit('analysis_progress', { 
            analysisId, 
            progress, 
            chunk: chunk.trim() 
          });
        });

        claudeProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        claudeProcess.on('close', (code) => {
          this.activeProcesses.delete(analysisId);
          
          // Clean up temp file
          fs.unlink(tempFile).catch(() => {
            // Ignore cleanup errors
          });

          if (code === 0) {
            this.emit('analysis_completed', { analysisId, result: output });
            resolve(this.cleanOutput(output));
          } else {
            const error = `Claude CLI failed with code ${code}: ${errorOutput}`;
            this.emit('analysis_error', { analysisId, error });
            reject(new Error(error));
          }
        });

        claudeProcess.on('error', (error) => {
          this.activeProcesses.delete(analysisId);
          
          // Clean up temp file
          fs.unlink(tempFile).catch(() => {
            // Ignore cleanup errors
          });

          this.emit('analysis_error', { analysisId, error: error.message });
          reject(new Error(`Claude CLI execution error: ${error.message}`));
        });

        // Set timeout
        const timeout = setTimeout(() => {
          if (this.activeProcesses.has(analysisId)) {
            this.cancelAnalysis(analysisId);
            reject(new Error('Analysis timeout'));
          }
        }, this.config.analysisTimeout);

        claudeProcess.on('close', () => {
          clearTimeout(timeout);
        });

      }).catch(reject);
    });
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(contentData: any, template: string): string {
    const { fileInfo, content, contentType } = contentData;

    let prompt = `${template}\n\n`;
    
    prompt += `## Arquivo para Análise\n`;
    prompt += `**Nome:** ${fileInfo.name}\n`;
    prompt += `**Tipo:** ${fileInfo.documentType}\n`;
    prompt += `**Caminho:** ${fileInfo.path}\n`;
    prompt += `**Tamanho:** ${this.formatFileSize(fileInfo.size)}\n`;
    prompt += `**Última Modificação:** ${new Date(fileInfo.lastModified).toLocaleString()}\n\n`;

    if (contentType === 'text' && content) {
      prompt += `## Conteúdo do Arquivo\n\`\`\`\n${content}\n\`\`\`\n\n`;
    } else {
      prompt += `## Instruções Especiais\n`;
      prompt += `Este arquivo precisa ser processado pelo Claude Code. `;
      prompt += `Por favor, leia e analise o arquivo localizado em: ${fileInfo.path}\n\n`;
    }

    prompt += `## Instruções de Execução\n`;
    prompt += `1. Analise completamente o documento\n`;
    prompt += `2. Siga rigorosamente a estrutura fornecida\n`;
    prompt += `3. Forneça análise detalhada e profissional\n`;
    prompt += `4. Use formatação markdown para legibilidade\n`;
    prompt += `5. Inclua exemplos específicos quando relevante\n`;
    prompt += `6. Termine com resumo executivo de 2-3 parágrafos\n\n`;

    prompt += `Inicie a análise agora.`;

    return prompt;
  }

  // Conversation Support

  /**
   * Generate response for conversation
   */
  async generateResponse(
    userMessage: string,
    context: any,
    filePath?: string,
    documentType?: string
  ): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Build conversation prompt
      const prompt = this.buildConversationPrompt(userMessage, context, filePath, documentType);
      
      // Execute Claude CLI
      const response = await this.executeClaude(conversationId, prompt);
      
      return response;
    } catch (error) {
      throw new Error(`Failed to generate response: ${(error as Error).message}`);
    }
  }

  /**
   * Build conversation prompt
   */
  private buildConversationPrompt(
    userMessage: string,
    context: any,
    filePath?: string,
    documentType?: string
  ): string {
    let prompt = `# Conversa sobre Análise de Documento\n\n`;

    if (filePath && documentType) {
      prompt += `## Documento Analisado\n`;
      prompt += `**Arquivo:** ${path.basename(filePath)}\n`;
      prompt += `**Tipo:** ${documentType}\n`;
      prompt += `**Caminho:** ${filePath}\n\n`;
    }

    if (context.documentSummary) {
      prompt += `## Resumo do Documento\n${context.documentSummary}\n\n`;
    }

    if (context.previousAnalysis) {
      prompt += `## Análise Anterior\n${context.previousAnalysis}\n\n`;
    }

    if (context.sessionHistory && context.sessionHistory.length > 0) {
      prompt += `## Histórico da Conversa\n`;
      const recentMessages = context.sessionHistory.slice(-5);
      for (const msg of recentMessages) {
        const role = msg.type === 'user' ? 'USUÁRIO' : 'ASSISTENTE';
        prompt += `\n### ${role}:\n${msg.content}\n`;
      }
      prompt += `\n`;
    }

    prompt += `## Nova Pergunta do Usuário\n${userMessage}\n\n`;

    prompt += `## Instruções\n`;
    prompt += `- Responda baseado no documento analisado e no contexto da conversa\n`;
    prompt += `- Mantenha consistência com análises anteriores\n`;
    prompt += `- Use informações específicas do documento\n`;
    prompt += `- Seja claro e direto na resposta\n`;
    prompt += `- Forneça exemplos quando apropriado\n\n`;

    prompt += `Responda à pergunta do usuário:`;

    return prompt;
  }

  // Utility Methods

  /**
   * Validate file for analysis
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a valid file');
      }

      if (stats.size > this.config.maxFileSize!) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize} bytes)`);
      }

      const extension = path.extname(filePath).toLowerCase();
      if (!this.config.allowedExtensions!.includes(extension)) {
        throw new Error(`File extension not allowed: ${extension}`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Clean Claude CLI output
   */
  private cleanOutput(output: string): string {
    return output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI colors
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  /**
   * Format result as JSON
   */
  private formatAsJson(rawResult: string): any {
    return {
      format: 'json',
      content: rawResult,
      summary: this.extractSummary(rawResult),
      insights: this.extractInsights(rawResult),
      recommendations: this.extractRecommendations(rawResult),
      metadata: {
        processedAt: new Date().toISOString(),
        wordCount: rawResult.split(/\s+/).length,
        sections: this.extractSections(rawResult)
      }
    };
  }

  /**
   * Format result as Markdown
   */
  private formatAsMarkdown(rawResult: string): any {
    return {
      format: 'markdown',
      content: rawResult,
      summary: this.extractSummary(rawResult),
      insights: this.extractInsights(rawResult),
      recommendations: this.extractRecommendations(rawResult),
      metadata: {
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Format result as HTML
   */
  private formatAsHtml(rawResult: string): any {
    // Simple markdown to HTML conversion
    let html = rawResult
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');

    return {
      format: 'html',
      content: html,
      summary: this.extractSummary(rawResult),
      insights: this.extractInsights(rawResult),
      recommendations: this.extractRecommendations(rawResult),
      metadata: {
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Extract summary from analysis result
   */
  private extractSummary(result: string): string {
    const summaryMatch = result.match(/(?:resumo|summary|executive summary)[:\s]*([^#]*?)(?=\n#|\n\n|$)/i);
    return summaryMatch ? summaryMatch[1].trim() : result.substring(0, 200) + '...';
  }

  /**
   * Extract insights from analysis result
   */
  private extractInsights(result: string): string[] {
    const insights: string[] = [];
    const lines = result.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const insight = line.trim().substring(2);
        if (insight.length > 10) {
          insights.push(insight);
        }
      }
    }
    
    return insights.slice(0, 10); // Limit to 10 insights
  }

  /**
   * Extract recommendations from analysis result
   */
  private extractRecommendations(result: string): string[] {
    const recommendations: string[] = [];
    const sections = result.split(/(?=^#)/m);
    
    for (const section of sections) {
      if (section.toLowerCase().includes('recomenda')) {
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const rec = line.trim().substring(2);
            if (rec.length > 10) {
              recommendations.push(rec);
            }
          }
        }
      }
    }
    
    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  /**
   * Extract sections from analysis result
   */
  private extractSections(result: string): string[] {
    const sections: string[] = [];
    const matches = result.match(/^#+\s+(.+)$/gm);
    
    if (matches) {
      for (const match of matches) {
        const section = match.replace(/^#+\s+/, '').trim();
        sections.push(section);
      }
    }
    
    return sections;
  }

  // Public Interface Methods

  /**
   * Cancel analysis
   */
  async cancelAnalysis(analysisId: string): Promise<void> {
    const process = this.activeProcesses.get(analysisId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
      
      this.activeProcesses.delete(analysisId);
    }
    
    this.analysisContexts.delete(analysisId);
  }

  /**
   * Validate environment
   */
  async validateEnvironment(): Promise<{
    claudeAvailable: boolean;
    apiKeyValid: boolean;
    cliVersion?: string;
  }> {
    try {
      // Test Claude CLI availability
      const result = await this.testClaudeCommand();
      
      return {
        claudeAvailable: result.available,
        apiKeyValid: result.apiKeyValid,
        cliVersion: result.version
      };
    } catch (error) {
      return {
        claudeAvailable: false,
        apiKeyValid: false
      };
    }
  }

  /**
   * Get capabilities
   */
  async getCapabilities(): Promise<{
    supportedFormats: string[];
    maxFileSize: number;
    features: string[];
  }> {
    return {
      supportedFormats: this.config.allowedExtensions!,
      maxFileSize: this.config.maxFileSize!,
      features: [
        'document-analysis',
        'conversation',
        'multi-format-output',
        'template-based-analysis',
        'progress-tracking',
        'concurrent-analysis'
      ]
    };
  }

  /**
   * Test Claude command
   */
  private async testClaudeCommand(): Promise<{
    available: boolean;
    apiKeyValid: boolean;
    version?: string;
  }> {
    return new Promise((resolve) => {
      const testProcess = spawn(this.config.claudeCommand, ['--version'], {
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: this.config.environment.apiKey
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      testProcess.on('close', (code) => {
        const available = code === 0;
        const apiKeyValid = !errorOutput.toLowerCase().includes('api key') && 
                           !errorOutput.toLowerCase().includes('authentication');
        
        resolve({
          available,
          apiKeyValid,
          version: available ? output.trim() : undefined
        });
      });

      testProcess.on('error', () => {
        resolve({
          available: false,
          apiKeyValid: false
        });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve({
          available: false,
          apiKeyValid: false
        });
      }, 5000);
    });
  }

  /**
   * Shutdown the analysis engine
   */
  async shutdown(): Promise<void> {
    // Cancel all active processes
    for (const [analysisId] of this.activeProcesses) {
      try {
        await this.cancelAnalysis(analysisId);
      } catch (error) {
        console.warn(`Failed to cancel analysis ${analysisId}:`, error);
      }
    }

    // Clear all maps
    this.activeProcesses.clear();
    this.analysisContexts.clear();
    this.templateCache.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}