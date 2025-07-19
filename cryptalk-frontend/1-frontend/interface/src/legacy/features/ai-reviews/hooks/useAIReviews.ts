import { useState, useCallback } from 'react';
import { 
  AIReview, 
  AIReviewer, 
  DocumentAnalysis, 
  AIReviewerType, 
  DocumentType,
  ReviewStatus 
} from '../../../shared/types';
import { AIReviewService } from '../services/AIReviewService';

export interface UseAIReviewsReturn {
  reviews: AIReview[];
  availableReviewers: AIReviewer[];
  isLoading: boolean;
  isAnalyzing: boolean;
  requestReview: (documentId: string, reviewerType: AIReviewerType, documentType: DocumentType) => Promise<AIReview>;
  getReview: (reviewId: string) => Promise<AIReview>;
  getDocumentReviews: (documentId: string) => Promise<AIReview[]>;
  analyzeDocument: (documentId: string, documentType: DocumentType) => Promise<DocumentAnalysis>;
  cancelReview: (reviewId: string) => Promise<boolean>;
  exportReview: (reviewId: string, format?: 'json' | 'pdf' | 'html') => Promise<Blob>;
  pollReviewStatus: (reviewId: string, callback: (status: ReviewStatus) => void) => () => void;
  refreshReviews: () => Promise<void>;
}

export const useAIReviews = (
  apiEndpoint: string = '/api/ai-reviews',
  apiKey: string = process.env.REACT_APP_AI_API_KEY || ''
): UseAIReviewsReturn => {
  const [reviews, setReviews] = useState<AIReview[]>([]);
  const [availableReviewers, setAvailableReviewers] = useState<AIReviewer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [reviewService] = useState(() => new AIReviewService(apiEndpoint, apiKey));

  // Initialize reviewers on first load
  useState(() => {
    reviewService.getAvailableReviewers()
      .then(setAvailableReviewers)
      .catch(console.error);
  });

  const requestReview = useCallback(async (
    documentId: string,
    reviewerType: AIReviewerType,
    documentType: DocumentType
  ): Promise<AIReview> => {
    setIsLoading(true);
    try {
      const review = await reviewService.requestReview(documentId, reviewerType, documentType);
      
      // Add to local state
      setReviews(prev => [review, ...prev]);
      
      return review;
    } catch (error) {
      throw new Error(`Failed to request review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [reviewService]);

  const getReview = useCallback(async (reviewId: string): Promise<AIReview> => {
    setIsLoading(true);
    try {
      const review = await reviewService.getReview(reviewId);
      
      // Update local state
      setReviews(prev => 
        prev.map(r => r.id === reviewId ? review : r)
      );
      
      return review;
    } catch (error) {
      throw new Error(`Failed to get review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [reviewService]);

  const getDocumentReviews = useCallback(async (documentId: string): Promise<AIReview[]> => {
    setIsLoading(true);
    try {
      const documentReviews = await reviewService.getDocumentReviews(documentId);
      
      // Update local state with document reviews
      setReviews(prev => {
        const existingIds = prev.map(r => r.id);
        const newReviews = documentReviews.filter(r => !existingIds.includes(r.id));
        return [...newReviews, ...prev];
      });
      
      return documentReviews;
    } catch (error) {
      throw new Error(`Failed to get document reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [reviewService]);

  const analyzeDocument = useCallback(async (
    documentId: string,
    documentType: DocumentType
  ): Promise<DocumentAnalysis> => {
    setIsAnalyzing(true);
    try {
      const analysis = await reviewService.analyzeDocument(documentId, documentType);
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [reviewService]);

  const cancelReview = useCallback(async (reviewId: string): Promise<boolean> => {
    try {
      const success = await reviewService.cancelReview(reviewId);
      
      if (success) {
        // Update local state
        setReviews(prev => 
          prev.map(r => 
            r.id === reviewId 
              ? { ...r, status: 'failed' as ReviewStatus }
              : r
          )
        );
      }
      
      return success;
    } catch (error) {
      console.error('Failed to cancel review:', error);
      return false;
    }
  }, [reviewService]);

  const exportReview = useCallback(async (
    reviewId: string,
    format: 'json' | 'pdf' | 'html' = 'json'
  ): Promise<Blob> => {
    try {
      return await reviewService.exportReview(reviewId, format);
    } catch (error) {
      throw new Error(`Failed to export review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [reviewService]);

  const pollReviewStatus = useCallback((
    reviewId: string,
    callback: (status: ReviewStatus) => void
  ): (() => void) => {
    let intervalId: NodeJS.Timeout;
    
    const poll = async () => {
      try {
        const status = await reviewService.getReviewStatus(reviewId);
        callback(status);
        
        // Stop polling if review is completed or failed
        if (status === 'completed' || status === 'failed') {
          clearInterval(intervalId);
          // Refresh the full review data
          await getReview(reviewId);
        }
      } catch (error) {
        console.error('Failed to poll review status:', error);
        clearInterval(intervalId);
      }
    };

    // Poll every 5 seconds
    intervalId = setInterval(poll, 5000);
    
    // Initial poll
    poll();

    // Return cleanup function
    return () => clearInterval(intervalId);
  }, [reviewService, getReview]);

  const refreshReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      // This would typically fetch all reviews for the current user
      // For now, we'll just refresh the existing reviews
      const refreshPromises = reviews.map(review => 
        reviewService.getReview(review.id).catch(() => review)
      );
      
      const refreshedReviews = await Promise.all(refreshPromises);
      setReviews(refreshedReviews);
    } catch (error) {
      console.error('Failed to refresh reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reviews, reviewService]);

  return {
    reviews,
    availableReviewers,
    isLoading,
    isAnalyzing,
    requestReview,
    getReview,
    getDocumentReviews,
    analyzeDocument,
    cancelReview,
    exportReview,
    pollReviewStatus,
    refreshReviews
  };
};