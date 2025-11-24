import { useState, useEffect, useCallback } from 'react';
import { DocumentFile, AnalysisResult, ChatMessage, DocumentCategory, AIAgent, DocumentAnalysisSession } from '../types';
import { DocumentService } from '../services/documentService';

export const useDocumentAnalysis = () => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [documentCategories] = useState<DocumentCategory[]>(DocumentService.getDocumentCategories());
  const [aiAgents] = useState<AIAgent[]>(DocumentService.getAIAgents());
  const [error, setError] = useState<string | null>(null);

  const documentService = DocumentService.getInstance();

  // Load documents on mount
  useEffect(() => {
    setDocuments(documentService.getDocuments());
  }, []);

  const uploadDocument = useCallback(async (file: File, category: DocumentCategory): Promise<DocumentFile> => {
    try {
      setError(null);
      const documentFile = await documentService.uploadDocument(file, category);
      setDocuments(prev => [...prev, documentFile]);
      return documentFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      throw err;
    }
  }, [documentService]);

  const analyzeDocument = useCallback(async (documentId: string, agentId: string): Promise<AnalysisResult> => {
    try {
      setError(null);
      setIsAnalyzing(true);
      
      const result = await documentService.analyzeDocument(documentId, agentId);
      
      // Update document in state
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, analysisStatus: 'completed', analysisResults: [...(doc.analysisResults || []), result] }
          : doc
      ));
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze document';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [documentService]);

  const sendChatMessage = useCallback(async (message: string, documentId?: string): Promise<void> => {
    try {
      setError(null);
      setIsChatting(true);

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        type: 'user',
        content: message,
        timestamp: new Date(),
        documentId,
        agentId: selectedAgent?.id
      };

      setChatHistory(prev => [...prev, userMessage]);

      // Get assistant response
      const assistantMessage = await documentService.sendChatMessage(
        message, 
        documentId, 
        selectedAgent?.id
      );

      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setIsChatting(false);
    }
  }, [documentService, selectedAgent]);

  const deleteDocument = useCallback((documentId: string): boolean => {
    try {
      setError(null);
      const success = documentService.deleteDocument(documentId);
      if (success) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        // Remove related chat messages
        setChatHistory(prev => prev.filter(msg => msg.documentId !== documentId));
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      return false;
    }
  }, [documentService]);

  const selectAgent = useCallback((agent: AIAgent | null) => {
    setSelectedAgent(agent);
  }, []);

  const clearChat = useCallback(() => {
    setChatHistory([]);
  }, []);

  const getDocumentById = useCallback((id: string): DocumentFile | undefined => {
    return documents.find(doc => doc.id === id);
  }, [documents]);

  const getAnalysisResults = useCallback((documentId: string): AnalysisResult[] => {
    const document = getDocumentById(documentId);
    return document?.analysisResults || [];
  }, [getDocumentById]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    documents,
    selectedAgent,
    chatHistory,
    isAnalyzing,
    isChatting,
    documentCategories,
    aiAgents,
    error,
    
    // Actions
    uploadDocument,
    analyzeDocument,
    sendChatMessage,
    deleteDocument,
    selectAgent,
    clearChat,
    getDocumentById,
    getAnalysisResults,
    clearError
  };
};