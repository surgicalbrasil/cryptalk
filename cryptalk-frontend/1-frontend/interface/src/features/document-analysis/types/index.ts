export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  category: DocumentCategory;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  uploadedAt?: Date;
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'error';
  analysisResults?: AnalysisResult[];
}

export interface DocumentCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  acceptedTypes: string[];
  maxSize: number; // in bytes
  agents: AIAgent[];
}

export interface AIAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  expertise: string[];
  available: boolean;
}

export interface AnalysisResult {
  id: string;
  agentId: string;
  documentId: string;
  summary: string;
  score: number;
  insights: Insight[];
  recommendations: Recommendation[];
  createdAt: Date;
  status: 'completed' | 'error';
}

export interface Insight {
  id: string;
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
  category: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentId?: string;
  agentId?: string;
}

export interface UploadProgress {
  documentId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface DocumentAnalysisSession {
  id: string;
  documents: DocumentFile[];
  selectedAgent?: AIAgent;
  chatHistory: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}