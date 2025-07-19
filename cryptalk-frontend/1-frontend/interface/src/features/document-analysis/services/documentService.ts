import { DocumentFile, AnalysisResult, ChatMessage, DocumentCategory, AIAgent } from '../types';

// Mock data - replace with actual API calls
const MOCK_DELAY = 1000;

export class DocumentService {
  private static instance: DocumentService;
  private documents: DocumentFile[] = [];
  private baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  async uploadDocument(file: File, category: DocumentCategory): Promise<DocumentFile> {
    const documentFile: DocumentFile = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      category,
      uploadProgress: 0,
      uploadStatus: 'pending',
      analysisStatus: 'pending'
    };

    this.documents.push(documentFile);

    // Simulate upload progress
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        documentFile.uploadProgress += 10;
        documentFile.uploadStatus = 'uploading';
        
        if (documentFile.uploadProgress >= 100) {
          clearInterval(interval);
          documentFile.uploadStatus = 'completed';
          documentFile.uploadedAt = new Date();
          resolve(documentFile);
        }
      }, 100);
    });
  }

  async analyzeDocument(documentId: string, agentId: string): Promise<AnalysisResult> {
    const document = this.documents.find(doc => doc.id === documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    document.analysisStatus = 'analyzing';

    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

    const analysisResult: AnalysisResult = {
      id: `analysis-${Date.now()}`,
      agentId,
      documentId,
      summary: `Comprehensive analysis of ${document.name} completed. The document has been thoroughly reviewed for key insights and recommendations.`,
      score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
      insights: [
        {
          id: 'insight-1',
          title: 'Financial Projections',
          content: 'The document contains detailed financial projections showing strong growth potential.',
          importance: 'high',
          category: 'financial'
        },
        {
          id: 'insight-2',
          title: 'Market Analysis',
          content: 'Comprehensive market analysis indicates favorable conditions for expansion.',
          importance: 'medium',
          category: 'market'
        }
      ],
      recommendations: [
        {
          id: 'rec-1',
          title: 'Review Financial Assumptions',
          description: 'Consider validating key financial assumptions with market data.',
          priority: 'high',
          actionRequired: true
        },
        {
          id: 'rec-2',
          title: 'Strengthen Legal Section',
          description: 'Add more detail to the legal compliance section.',
          priority: 'medium',
          actionRequired: false
        }
      ],
      createdAt: new Date(),
      status: 'completed'
    };

    document.analysisStatus = 'completed';
    document.analysisResults = document.analysisResults || [];
    document.analysisResults.push(analysisResult);

    return analysisResult;
  }

  async sendChatMessage(message: string, documentId?: string, agentId?: string): Promise<ChatMessage> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'assistant',
      content: `Based on the document analysis, here's my response to "${message}": This is a comprehensive analysis that shows strong potential. The document demonstrates clear understanding of market dynamics and financial projections.`,
      timestamp: new Date(),
      documentId,
      agentId
    };

    return assistantMessage;
  }

  getDocuments(): DocumentFile[] {
    return this.documents;
  }

  getDocument(id: string): DocumentFile | undefined {
    return this.documents.find(doc => doc.id === id);
  }

  deleteDocument(id: string): boolean {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      return true;
    }
    return false;
  }

  // Mock categories - replace with API call
  static getDocumentCategories(): DocumentCategory[] {
    return [
      {
        id: 'pitch-deck',
        name: 'Pitch Deck',
        icon: '📊',
        description: 'Startup pitch presentations and business proposals',
        acceptedTypes: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        maxSize: 50 * 1024 * 1024, // 50MB
        agents: [
          {
            id: 'business-strategist',
            name: 'Business Strategist',
            icon: '🚀',
            description: 'Expert in business models, market analysis, and growth strategies',
            expertise: ['Business Model', 'Market Analysis', 'Growth Strategy', 'Competitive Analysis'],
            available: true
          },
          {
            id: 'financial-analyst',
            name: 'Financial Analyst',
            icon: '💼',
            description: 'Specialist in financial projections, valuations, and investment analysis',
            expertise: ['Financial Projections', 'Valuation', 'Investment Analysis', 'Risk Assessment'],
            available: true
          }
        ]
      },
      {
        id: 'financial-docs',
        name: 'Financial Documents',
        icon: '💰',
        description: 'Financial statements, cap tables, and investment documents',
        acceptedTypes: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        maxSize: 25 * 1024 * 1024, // 25MB
        agents: [
          {
            id: 'financial-analyst',
            name: 'Financial Analyst',
            icon: '💼',
            description: 'Specialist in financial projections, valuations, and investment analysis',
            expertise: ['Financial Projections', 'Valuation', 'Investment Analysis', 'Risk Assessment'],
            available: true
          }
        ]
      },
      {
        id: 'legal-docs',
        name: 'Legal Documents',
        icon: '⚖️',
        description: 'Contracts, patents, NDAs, and legal agreements',
        acceptedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 20 * 1024 * 1024, // 20MB
        agents: [
          {
            id: 'legal-expert',
            name: 'Legal Expert',
            icon: '⚖️',
            description: 'Expert in contract analysis, intellectual property, and legal compliance',
            expertise: ['Contract Analysis', 'IP Law', 'Legal Compliance', 'Risk Assessment'],
            available: true
          }
        ]
      },
      {
        id: 'technical-docs',
        name: 'Technical Documents',
        icon: '🔧',
        description: 'Technical specifications, architecture docs, and whitepapers',
        acceptedTypes: ['application/pdf', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 30 * 1024 * 1024, // 30MB
        agents: [
          {
            id: 'technical-expert',
            name: 'Technical Expert',
            icon: '🔧',
            description: 'Specialist in technical architecture, development, and innovation',
            expertise: ['Technical Architecture', 'Development', 'Innovation', 'Security'],
            available: true
          }
        ]
      }
    ];
  }

  static getAIAgents(): AIAgent[] {
    return [
      {
        id: 'business-strategist',
        name: 'Business Strategist',
        icon: '🚀',
        description: 'Expert in business models, market analysis, and growth strategies',
        expertise: ['Business Model', 'Market Analysis', 'Growth Strategy', 'Competitive Analysis'],
        available: true
      },
      {
        id: 'financial-analyst',
        name: 'Financial Analyst',
        icon: '💼',
        description: 'Specialist in financial projections, valuations, and investment analysis',
        expertise: ['Financial Projections', 'Valuation', 'Investment Analysis', 'Risk Assessment'],
        available: true
      },
      {
        id: 'legal-expert',
        name: 'Legal Expert',
        icon: '⚖️',
        description: 'Expert in contract analysis, intellectual property, and legal compliance',
        expertise: ['Contract Analysis', 'IP Law', 'Legal Compliance', 'Risk Assessment'],
        available: true
      },
      {
        id: 'technical-expert',
        name: 'Technical Expert',
        icon: '🔧',
        description: 'Specialist in technical architecture, development, and innovation',
        expertise: ['Technical Architecture', 'Development', 'Innovation', 'Security'],
        available: true
      }
    ];
  }
}