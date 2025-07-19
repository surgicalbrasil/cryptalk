/**
 * Claude Module Tests
 * Testes abrangentes para o módulo Claude AI refatorado
 * Valida: Session Management, Analysis Engine, Event System, Error Handling, Configuration
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { ClaudeService, ClaudeServiceConfig, ClaudeEnvironment } from './ClaudeService';
import { SessionManager } from './SessionManager';
import { AnalysisEngine } from './AnalysisEngine';
import { 
  IClaudeService, 
  SessionConfig, 
  SessionInfo, 
  AnalysisRequest, 
  AnalysisResult,
  Message,
  ConversationContext 
} from '../../core/interfaces/IClaudeService';

// Mock do módulo child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock do módulo fs
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('Claude Module - Comprehensive Tests', () => {
  let claudeService: ClaudeService;
  let config: ClaudeServiceConfig;
  let environment: ClaudeEnvironment;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      sessionTimeout: 30 * 60 * 1000,
      analysisTimeout: 5 * 60 * 1000,
      maxConcurrentAnalyses: 3,
      claudeCommand: 'claude',
      tempDirectory: '/tmp'
    };
    
    environment = {
      apiKey: 'test-api-key',
      claudeCommand: 'claude',
      workingDirectory: '/workspace'
    };
    
    claudeService = new ClaudeService(config, environment);
  });

  afterEach(async () => {
    await claudeService.shutdown();
  });

  describe('1. Session Management Tests', () => {
    describe('Session Creation', () => {
      it('should create a new session successfully', async () => {
        const clientId = 'test-client-123';
        const sessionConfig: SessionConfig = {
          sessionTimeout: 60000,
          maxMessageHistory: 100
        };

        const session = await claudeService.createSession(clientId, sessionConfig);

        expect(session).toBeDefined();
        expect(session.clientId).toBe(clientId);
        expect(session.status).toBe('active');
        expect(session.messages).toEqual([]);
        expect(session.metadata.config).toEqual(sessionConfig);
      });

      it('should emit session_created event on session creation', async () => {
        const clientId = 'test-client-456';
        const sessionCreatedSpy = jest.fn();
        
        claudeService.on('session_created', sessionCreatedSpy);
        
        await claudeService.createSession(clientId);
        
        expect(sessionCreatedSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            clientId,
            status: 'active'
          })
        );
      });

      it('should end existing session before creating new one', async () => {
        const clientId = 'test-client-789';
        
        // Create first session
        const session1 = await claudeService.createSession(clientId);
        expect(session1.status).toBe('active');
        
        // Create second session with same clientId
        const session2 = await claudeService.createSession(clientId);
        expect(session2.status).toBe('active');
        expect(session2.sessionId).not.toBe(session1.sessionId);
        
        // Verify first session was ended
        const oldSession = await claudeService.getSessionStatus(clientId);
        expect(oldSession?.sessionId).toBe(session2.sessionId);
      });
    });

    describe('Session Migration', () => {
      it('should migrate session from one client to another', async () => {
        const fromClientId = 'client-source';
        const toClientId = 'client-target';
        
        // Create source session with messages
        await claudeService.createSession(fromClientId);
        const message = await claudeService.sendMessage(fromClientId, 'Test message');
        
        // Get SessionManager instance through reflection (for testing)
        const sessionManager = (claudeService as any).sessionManager as SessionManager;
        
        // Migrate session
        await sessionManager.migrateSession(fromClientId, toClientId);
        
        // Verify migration
        const sourceSession = await claudeService.getSessionStatus(fromClientId);
        const targetSession = await claudeService.getSessionStatus(toClientId);
        
        expect(sourceSession).toBeNull();
        expect(targetSession).toBeDefined();
        expect(targetSession?.metadata.migratedFrom).toBe(fromClientId);
      });

      it('should clone session to another client', async () => {
        const sourceClientId = 'client-original';
        const targetClientId = 'client-clone';
        
        // Create source session
        await claudeService.createSession(sourceClientId);
        await claudeService.sendMessage(sourceClientId, 'Original message');
        
        // Get SessionManager instance
        const sessionManager = (claudeService as any).sessionManager as SessionManager;
        
        // Clone session
        const clonedSession = await sessionManager.cloneSession(sourceClientId, targetClientId);
        
        // Verify both sessions exist
        const sourceSession = await claudeService.getSessionStatus(sourceClientId);
        const targetSession = await claudeService.getSessionStatus(targetClientId);
        
        expect(sourceSession).toBeDefined();
        expect(targetSession).toBeDefined();
        expect(clonedSession.metadata.clonedFrom).toBe(sourceClientId);
        expect(targetSession?.messages.length).toBe(sourceSession?.messages.length);
      });
    });

    describe('Session Cleanup', () => {
      it('should expire sessions after timeout', async () => {
        const clientId = 'timeout-client';
        const shortTimeout = 100; // 100ms for testing
        
        const sessionExpiredSpy = jest.fn();
        claudeService.on('session_expired', sessionExpiredSpy);
        
        await claudeService.createSession(clientId, { sessionTimeout: shortTimeout });
        
        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, shortTimeout + 50));
        
        expect(sessionExpiredSpy).toHaveBeenCalledWith(clientId);
        
        const session = await claudeService.getSessionStatus(clientId);
        expect(session).toBeNull();
      });

      it('should renew session and reset timeout', async () => {
        const clientId = 'renew-client';
        const shortTimeout = 200; // 200ms for testing
        
        await claudeService.createSession(clientId, { sessionTimeout: shortTimeout });
        
        // Wait half the timeout
        await new Promise(resolve => setTimeout(resolve, shortTimeout / 2));
        
        // Renew session
        await claudeService.renewSession(clientId);
        
        // Wait another half timeout (should not expire)
        await new Promise(resolve => setTimeout(resolve, shortTimeout / 2 + 50));
        
        const session = await claudeService.getSessionStatus(clientId);
        expect(session).toBeDefined();
        expect(session?.status).toBe('active');
      });
    });
  });

  describe('2. Analysis Engine Tests', () => {
    describe('Document Analysis', () => {
      it('should initiate document analysis and track progress', async () => {
        const { spawn } = require('child_process');
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.kill = jest.fn();
        mockProcess.killed = false;
        
        spawn.mockReturnValue(mockProcess);
        
        const { promises: fs } = require('fs');
        fs.stat.mockResolvedValue({ 
          isFile: () => true, 
          size: 1024 * 1024, // 1MB
          mtime: new Date() 
        });
        fs.writeFile.mockResolvedValue(undefined);
        fs.unlink.mockResolvedValue(undefined);
        
        const request: AnalysisRequest = {
          clientId: 'analysis-client',
          filePath: '/test/document.pdf',
          documentType: 'pitch-deck',
          options: {
            depth: 'detailed',
            format: 'json'
          }
        };
        
        await claudeService.createSession(request.clientId);
        
        const progressUpdates: any[] = [];
        claudeService.on('analysis_progress', (data) => progressUpdates.push(data));
        
        const analysisPromise = claudeService.analyzeDocument(request);
        
        // Simulate Claude CLI output
        setTimeout(() => {
          mockProcess.stdout.emit('data', 'Processing document...\n');
          mockProcess.stdout.emit('data', 'Analysis in progress...\n');
          mockProcess.stdout.emit('data', '# Analysis Result\n## Summary\nTest analysis complete.');
          mockProcess.emit('close', 0);
        }, 10);
        
        const result = await analysisPromise;
        
        expect(result.analysisId).toBeDefined();
        expect(result.clientId).toBe(request.clientId);
        expect(result.status).toBe('pending');
        expect(result.progress).toBe(0);
        
        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates[0].analysisId).toBe(result.analysisId);
      });

      it('should handle analysis cancellation', async () => {
        const { spawn } = require('child_process');
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.kill = jest.fn();
        mockProcess.killed = false;
        
        spawn.mockReturnValue(mockProcess);
        
        const { promises: fs } = require('fs');
        fs.stat.mockResolvedValue({ 
          isFile: () => true, 
          size: 1024 * 1024,
          mtime: new Date() 
        });
        fs.writeFile.mockResolvedValue(undefined);
        fs.unlink.mockResolvedValue(undefined);
        
        const request: AnalysisRequest = {
          clientId: 'cancel-client',
          filePath: '/test/document.pdf',
          documentType: 'patent'
        };
        
        await claudeService.createSession(request.clientId);
        
        const result = await claudeService.analyzeDocument(request);
        
        // Cancel analysis
        await claudeService.cancelAnalysis(result.analysisId);
        
        expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        
        const status = await claudeService.getAnalysisStatus(result.analysisId);
        expect(status.status).toBe('failed');
        expect(status.error).toContain('cancelled');
      });
    });

    describe('Template Management', () => {
      it('should load and validate templates', async () => {
        const analysisEngine = (claudeService as any).analysisEngine as AnalysisEngine;
        
        // Test loading default template
        const pitchDeckTemplate = await analysisEngine.loadTemplate('pitch-deck');
        expect(pitchDeckTemplate).toContain('Análise de Pitch Deck');
        expect(pitchDeckTemplate).toContain('Resumo Executivo');
        
        // Test template validation
        const isValid = await analysisEngine.validateTemplate(pitchDeckTemplate);
        expect(isValid).toBe(true);
        
        // Test invalid template
        const invalidTemplate = 'This is not a valid template';
        const isInvalid = await analysisEngine.validateTemplate(invalidTemplate);
        expect(isInvalid).toBe(false);
      });

      it('should support multiple document types', async () => {
        const analysisEngine = (claudeService as any).analysisEngine as AnalysisEngine;
        
        const documentTypes = ['pitch-deck', 'patent', 'financial', 'tech-doc', 'legal-doc'];
        
        for (const docType of documentTypes) {
          const template = await analysisEngine.loadTemplate(docType);
          expect(template).toBeDefined();
          expect(template.length).toBeGreaterThan(100);
          
          const isValid = await analysisEngine.validateTemplate(template);
          expect(isValid).toBe(true);
        }
      });
    });

    describe('Result Processing', () => {
      it('should format results in different formats', async () => {
        const analysisEngine = (claudeService as any).analysisEngine as AnalysisEngine;
        
        const rawResult = `
# Analysis Result

## Summary
This is a test analysis summary.

## Insights
- First insight about the document
- Second important finding
- Third key observation

## Recommendations
- Improve documentation structure
- Add more detailed examples
- Consider performance optimization
        `;
        
        // Test JSON format
        const jsonResult = await analysisEngine.postprocessResult(rawResult, 'json');
        expect(jsonResult.format).toBe('json');
        expect(jsonResult.summary).toContain('test analysis summary');
        expect(jsonResult.insights).toHaveLength(3);
        expect(jsonResult.recommendations).toHaveLength(3);
        
        // Test Markdown format
        const markdownResult = await analysisEngine.postprocessResult(rawResult, 'markdown');
        expect(markdownResult.format).toBe('markdown');
        expect(markdownResult.content).toBe(rawResult.trim());
        
        // Test HTML format
        const htmlResult = await analysisEngine.postprocessResult(rawResult, 'html');
        expect(htmlResult.format).toBe('html');
        expect(htmlResult.content).toContain('<h1>');
        expect(htmlResult.content).toContain('<h2>');
      });
    });
  });

  describe('3. Event System Tests', () => {
    it('should emit and handle multiple event types', async () => {
      const eventHandlers = {
        analysis_started: jest.fn(),
        analysis_progress: jest.fn(),
        analysis_completed: jest.fn(),
        session_expired: jest.fn(),
        error: jest.fn()
      };
      
      // Register event handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        claudeService.on(event, handler);
      });
      
      // Test session expired event
      const clientId = 'event-test-client';
      const shortTimeout = 50;
      
      await claudeService.createSession(clientId, { sessionTimeout: shortTimeout });
      await new Promise(resolve => setTimeout(resolve, shortTimeout + 50));
      
      expect(eventHandlers.session_expired).toHaveBeenCalledWith(clientId);
      
      // Test error event
      try {
        await claudeService.getAnalysisStatus('non-existent-analysis');
      } catch (error) {
        // Expected error
      }
      
      // Verify error was emitted
      expect(eventHandlers.error).toHaveBeenCalled();
    });

    it('should support event forwarding between components', async () => {
      const sessionManager = (claudeService as any).sessionManager as SessionManager;
      const analysisEngine = (claudeService as any).analysisEngine as AnalysisEngine;
      
      const forwardedEvents: string[] = [];
      
      claudeService.on('session_created', () => forwardedEvents.push('session_created'));
      claudeService.on('analysis_started', () => forwardedEvents.push('analysis_started'));
      
      // Emit events from components
      sessionManager.emit('session_created', { clientId: 'test', status: 'active' });
      analysisEngine.emit('analysis_started', { analysisId: 'test-analysis' });
      
      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(forwardedEvents).toContain('session_created');
      expect(forwardedEvents).toContain('analysis_started');
    });

    it('should handle progress updates with streaming data', async () => {
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      mockProcess.killed = false;
      
      spawn.mockReturnValue(mockProcess);
      
      const { promises: fs } = require('fs');
      fs.stat.mockResolvedValue({ 
        isFile: () => true, 
        size: 1024,
        mtime: new Date() 
      });
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      const progressUpdates: { progress: number; chunk?: string }[] = [];
      
      claudeService.on('analysis_progress', (data) => {
        progressUpdates.push({ progress: data.progress, chunk: data.chunk });
      });
      
      const request: AnalysisRequest = {
        clientId: 'progress-client',
        filePath: '/test/doc.txt',
        documentType: 'tech-doc'
      };
      
      await claudeService.createSession(request.clientId);
      const analysisPromise = claudeService.analyzeDocument(request);
      
      // Simulate streaming output
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Starting analysis...\n');
        mockProcess.stdout.emit('data', 'Processing section 1...\n');
        mockProcess.stdout.emit('data', 'Processing section 2...\n');
        mockProcess.stdout.emit('data', 'Finalizing results...\n');
        mockProcess.emit('close', 0);
      }, 10);
      
      await analysisPromise;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(u => u.chunk?.includes('Starting analysis'))).toBe(true);
      expect(progressUpdates.some(u => u.progress > 0)).toBe(true);
    });
  });

  describe('4. Error Handling Tests', () => {
    it('should handle file not found errors gracefully', async () => {
      const { promises: fs } = require('fs');
      fs.stat.mockRejectedValue({ code: 'ENOENT' });
      
      const request: AnalysisRequest = {
        clientId: 'error-client',
        filePath: '/non/existent/file.pdf',
        documentType: 'financial'
      };
      
      await claudeService.createSession(request.clientId);
      
      await expect(claudeService.analyzeDocument(request)).rejects.toThrow();
    });

    it('should handle Claude CLI failures', async () => {
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      mockProcess.killed = false;
      
      spawn.mockReturnValue(mockProcess);
      
      const { promises: fs } = require('fs');
      fs.stat.mockResolvedValue({ 
        isFile: () => true, 
        size: 1024,
        mtime: new Date() 
      });
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      const errorSpy = jest.fn();
      claudeService.on('error', errorSpy);
      
      const request: AnalysisRequest = {
        clientId: 'cli-error-client',
        filePath: '/test/doc.pdf',
        documentType: 'patent'
      };
      
      await claudeService.createSession(request.clientId);
      const analysisPromise = claudeService.analyzeDocument(request);
      
      // Simulate Claude CLI error
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Error: Invalid API key\n');
        mockProcess.emit('close', 1);
      }, 10);
      
      await analysisPromise;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analysis_error'
        })
      );
    });

    it('should handle session not found errors', async () => {
      const nonExistentClient = 'non-existent-client';
      
      await expect(
        claudeService.sendMessage(nonExistentClient, 'Hello')
      ).rejects.toThrow('Session not found');
      
      await expect(
        claudeService.renewSession(nonExistentClient)
      ).rejects.toThrow('Session not found');
    });

    it('should handle concurrent analysis limit', async () => {
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      mockProcess.killed = false;
      
      spawn.mockReturnValue(mockProcess);
      
      const { promises: fs } = require('fs');
      fs.stat.mockResolvedValue({ 
        isFile: () => true, 
        size: 1024,
        mtime: new Date() 
      });
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      // Create sessions and start max concurrent analyses
      const analyses: Promise<AnalysisResult>[] = [];
      
      for (let i = 0; i < config.maxConcurrentAnalyses!; i++) {
        const clientId = `concurrent-client-${i}`;
        await claudeService.createSession(clientId);
        
        const request: AnalysisRequest = {
          clientId,
          filePath: `/test/doc${i}.pdf`,
          documentType: 'tech-doc'
        };
        
        analyses.push(claudeService.analyzeDocument(request));
      }
      
      // Try to exceed limit
      const extraClient = 'extra-client';
      await claudeService.createSession(extraClient);
      
      const extraRequest: AnalysisRequest = {
        clientId: extraClient,
        filePath: '/test/extra.pdf',
        documentType: 'legal-doc'
      };
      
      await expect(
        claudeService.analyzeDocument(extraRequest)
      ).rejects.toThrow('Maximum concurrent analyses limit reached');
    });
  });

  describe('5. Configuration Tests', () => {
    it('should initialize with custom configuration', () => {
      const customConfig: ClaudeServiceConfig = {
        sessionTimeout: 60000,
        analysisTimeout: 10000,
        maxConcurrentAnalyses: 5,
        claudeCommand: 'custom-claude',
        tempDirectory: '/custom/tmp'
      };
      
      const customService = new ClaudeService(customConfig, environment);
      
      expect((customService as any).config.sessionTimeout).toBe(60000);
      expect((customService as any).config.analysisTimeout).toBe(10000);
      expect((customService as any).config.maxConcurrentAnalyses).toBe(5);
      
      customService.shutdown();
    });

    it('should update configuration dynamically', async () => {
      const newConfig: Partial<SessionConfig> = {
        sessionTimeout: 120000,
        maxMessageHistory: 200
      };
      
      await claudeService.updateConfiguration(newConfig);
      
      expect((claudeService as any).config.sessionTimeout).toBe(120000);
    });

    it('should validate environment configuration', async () => {
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      
      spawn.mockReturnValue(mockProcess);
      
      // Simulate successful validation
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Claude CLI v1.0.0\n');
        mockProcess.emit('close', 0);
      }, 10);
      
      const validation = await claudeService.validateEnvironment();
      
      expect(validation.claudeAvailable).toBe(true);
      expect(validation.apiKeyValid).toBe(true);
      expect(validation.cliVersion).toContain('Claude CLI v1.0.0');
    });

    it('should report capabilities correctly', async () => {
      const capabilities = await claudeService.getCapabilities();
      
      expect(capabilities.supportedFormats).toContain('.pdf');
      expect(capabilities.supportedFormats).toContain('.doc');
      expect(capabilities.maxFileSize).toBeGreaterThan(0);
      expect(capabilities.features).toContain('document-analysis');
      expect(capabilities.features).toContain('conversation');
      expect(capabilities.features).toContain('progress-tracking');
    });
  });

  describe('6. Monitoring and Health Tests', () => {
    it('should track and report metrics', async () => {
      // Create sessions and perform analyses
      await claudeService.createSession('metrics-client-1');
      await claudeService.createSession('metrics-client-2');
      
      const metrics = await claudeService.getMetrics();
      
      expect(metrics.activeSessions).toBe(1); // Only last session active
      expect(metrics.totalAnalyses).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });

    it('should report health status', async () => {
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      
      spawn.mockReturnValue(mockProcess);
      
      // Simulate healthy environment
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Claude CLI v1.0.0\n');
        mockProcess.emit('close', 0);
      }, 10);
      
      const health = await claudeService.getHealthStatus();
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.details).toBeDefined();
      expect(health.details.timestamp).toBeDefined();
    });

    it('should detect degraded state', async () => {
      const { spawn } = require('child_process');
      
      // Simulate Claude CLI not available
      spawn.mockImplementation(() => {
        const mockProcess = new EventEmitter();
        setImmediate(() => mockProcess.emit('error', new Error('Command not found')));
        return mockProcess;
      });
      
      const health = await claudeService.getHealthStatus();
      
      expect(health.status).not.toBe('healthy');
      expect(health.details.environment.claudeAvailable).toBe(false);
    });
  });

  describe('7. Conversation Management Tests', () => {
    it('should handle conversation flow', async () => {
      const clientId = 'conversation-client';
      await claudeService.createSession(clientId);
      
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      
      spawn.mockReturnValue(mockProcess);
      
      const { promises: fs } = require('fs');
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      // Send first message
      const messagePromise = claudeService.sendMessage(clientId, 'Hello, can you help me?');
      
      // Simulate Claude response
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Of course! I\'d be happy to help you.');
        mockProcess.emit('close', 0);
      }, 10);
      
      const response = await messagePromise;
      
      expect(response.type).toBe('assistant');
      expect(response.content).toContain('happy to help');
      
      // Check conversation history
      const history = await claudeService.getConversationHistory(clientId);
      expect(history).toHaveLength(2); // User message + assistant response
      expect(history[0].type).toBe('user');
      expect(history[1].type).toBe('assistant');
    });

    it('should maintain conversation context', async () => {
      const clientId = 'context-client';
      await claudeService.createSession(clientId);
      
      const { spawn } = require('child_process');
      
      spawn.mockImplementation(() => {
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        
        setTimeout(() => {
          mockProcess.stdout.emit('data', 'Response with context');
          mockProcess.emit('close', 0);
        }, 10);
        
        return mockProcess;
      });
      
      const { promises: fs } = require('fs');
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      const context: Partial<ConversationContext> = {
        documentSummary: 'This is a pitch deck for a startup',
        userPreferences: { language: 'pt-BR' }
      };
      
      await claudeService.sendMessage(clientId, 'What is this about?', context);
      
      // Verify context was used in prompt
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('pitch deck for a startup'),
        'utf8'
      );
    });

    it('should clear conversation history', async () => {
      const clientId = 'clear-client';
      await claudeService.createSession(clientId);
      
      const { spawn } = require('child_process');
      spawn.mockImplementation(() => {
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        
        setTimeout(() => {
          mockProcess.stdout.emit('data', 'Response');
          mockProcess.emit('close', 0);
        }, 10);
        
        return mockProcess;
      });
      
      const { promises: fs } = require('fs');
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      // Add messages
      await claudeService.sendMessage(clientId, 'Message 1');
      await claudeService.sendMessage(clientId, 'Message 2');
      
      let history = await claudeService.getConversationHistory(clientId);
      expect(history.length).toBeGreaterThan(0);
      
      // Clear conversation
      await claudeService.clearConversation(clientId);
      
      history = await claudeService.getConversationHistory(clientId);
      expect(history).toHaveLength(0);
    });
  });

  describe('8. Shutdown and Cleanup Tests', () => {
    it('should shutdown gracefully', async () => {
      // Create active sessions and analyses
      await claudeService.createSession('shutdown-client-1');
      await claudeService.createSession('shutdown-client-2');
      
      const shutdownSpy = jest.spyOn(claudeService, 'shutdown');
      
      await claudeService.shutdown();
      
      expect(shutdownSpy).toHaveBeenCalled();
      
      // Verify all resources are cleaned up
      const metrics = await claudeService.getMetrics();
      expect(metrics.activeSessions).toBe(0);
    });

    it('should cancel active analyses on shutdown', async () => {
      const { spawn } = require('child_process');
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      mockProcess.killed = false;
      
      spawn.mockReturnValue(mockProcess);
      
      const { promises: fs } = require('fs');
      fs.stat.mockResolvedValue({ 
        isFile: () => true, 
        size: 1024,
        mtime: new Date() 
      });
      fs.writeFile.mockResolvedValue(undefined);
      fs.unlink.mockResolvedValue(undefined);
      
      const clientId = 'shutdown-analysis-client';
      await claudeService.createSession(clientId);
      
      const request: AnalysisRequest = {
        clientId,
        filePath: '/test/shutdown.pdf',
        documentType: 'financial'
      };
      
      // Start analysis but don't wait for it
      claudeService.analyzeDocument(request);
      
      // Wait a bit for analysis to start
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Shutdown should cancel the analysis
      await claudeService.shutdown();
      
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });
});

// Integration test for complete workflow
describe('Claude Module - Integration Test', () => {
  it('should handle complete document analysis workflow', async () => {
    const { spawn } = require('child_process');
    const { promises: fs } = require('fs');
    
    // Mock file system
    fs.stat.mockResolvedValue({ 
      isFile: () => true, 
      size: 2 * 1024 * 1024, // 2MB
      mtime: new Date() 
    });
    fs.readFile.mockResolvedValue('# Test Document\nThis is test content.');
    fs.writeFile.mockResolvedValue(undefined);
    fs.unlink.mockResolvedValue(undefined);
    
    // Mock Claude CLI
    spawn.mockImplementation(() => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      
      setTimeout(() => {
        mockProcess.stdout.emit('data', '# Analysis Result\n');
        mockProcess.stdout.emit('data', '## Summary\n');
        mockProcess.stdout.emit('data', 'Comprehensive analysis of the document.\n');
        mockProcess.stdout.emit('data', '## Insights\n');
        mockProcess.stdout.emit('data', '- Key finding 1\n');
        mockProcess.stdout.emit('data', '- Key finding 2\n');
        mockProcess.stdout.emit('data', '## Recommendations\n');
        mockProcess.stdout.emit('data', '- Recommendation 1\n');
        mockProcess.stdout.emit('data', '- Recommendation 2\n');
        mockProcess.emit('close', 0);
      }, 50);
      
      return mockProcess;
    });
    
    const config: ClaudeServiceConfig = {
      sessionTimeout: 30 * 60 * 1000,
      analysisTimeout: 5 * 60 * 1000,
      maxConcurrentAnalyses: 3
    };
    
    const environment: ClaudeEnvironment = {
      apiKey: 'test-key',
      claudeCommand: 'claude',
      workingDirectory: '/workspace'
    };
    
    const service = new ClaudeService(config, environment);
    
    // Track all events
    const events: { type: string; data: any }[] = [];
    const eventTypes = ['session_created', 'analysis_started', 'analysis_progress', 'analysis_completed', 'error'];
    
    eventTypes.forEach(eventType => {
      service.on(eventType, (data) => {
        events.push({ type: eventType, data });
      });
    });
    
    // 1. Create session
    const clientId = 'integration-test-client';
    const session = await service.createSession(clientId, {
      maxMessageHistory: 50,
      documentType: 'pitch-deck'
    });
    
    expect(session.status).toBe('active');
    expect(events.some(e => e.type === 'session_created')).toBe(true);
    
    // 2. Start document analysis
    const analysisRequest: AnalysisRequest = {
      clientId,
      filePath: '/test/pitch-deck.pdf',
      documentType: 'pitch-deck',
      options: {
        depth: 'comprehensive',
        format: 'json'
      }
    };
    
    const analysisResult = await service.analyzeDocument(analysisRequest);
    expect(analysisResult.status).toBe('pending');
    
    // 3. Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 4. Check analysis status
    const finalStatus = await service.getAnalysisStatus(analysisResult.analysisId);
    expect(finalStatus.status).toBe('completed');
    expect(finalStatus.result).toBeDefined();
    expect(finalStatus.result?.summary).toContain('Comprehensive analysis');
    expect(finalStatus.result?.insights).toHaveLength(2);
    expect(finalStatus.result?.recommendations).toHaveLength(2);
    
    // 5. Start conversation about the analysis
    spawn.mockImplementation(() => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Based on the pitch deck analysis, the main value proposition is...');
        mockProcess.emit('close', 0);
      }, 20);
      
      return mockProcess;
    });
    
    const message = await service.sendMessage(
      clientId, 
      'What is the main value proposition?',
      { documentSummary: finalStatus.result?.summary }
    );
    
    expect(message.type).toBe('assistant');
    expect(message.content).toContain('value proposition');
    
    // 6. Get conversation history
    const history = await service.getConversationHistory(clientId);
    expect(history).toHaveLength(2);
    
    // 7. Get metrics
    const metrics = await service.getMetrics();
    expect(metrics.activeSessions).toBe(1);
    expect(metrics.totalAnalyses).toBe(1);
    
    // 8. Check health
    spawn.mockImplementation(() => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Claude CLI v1.0.0');
        mockProcess.emit('close', 0);
      }, 10);
      
      return mockProcess;
    });
    
    const health = await service.getHealthStatus();
    expect(health.status).toBe('healthy');
    
    // 9. End session
    await service.endSession(clientId);
    const endedSession = await service.getSessionStatus(clientId);
    expect(endedSession).toBeNull();
    
    // 10. Verify all events were emitted
    expect(events.some(e => e.type === 'analysis_started')).toBe(true);
    expect(events.some(e => e.type === 'analysis_progress')).toBe(true);
    expect(events.some(e => e.type === 'analysis_completed')).toBe(true);
    
    // Cleanup
    await service.shutdown();
  });
});