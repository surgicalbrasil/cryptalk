import { 
  AIReview, 
  AIReviewer, 
  DocumentAnalysis, 
  AIReviewerType, 
  DocumentType,
  ReviewStatus 
} from '../../../shared/types';

export class AIReviewService {
  private apiEndpoint: string;
  private apiKey: string;

  constructor(apiEndpoint: string, apiKey: string) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }

  async requestReview(
    documentId: string,
    reviewerType: AIReviewerType,
    documentType: DocumentType,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<AIReview> {
    try {
      const reviewer = await this.getReviewer(reviewerType);
      
      const review: AIReview = {
        id: this.generateReviewId(),
        documentId,
        reviewerId: reviewer.id,
        reviewerType,
        content: '', // Will be populated by AI
        score: 0,
        confidence: 0,
        createdAt: new Date(),
        status: 'pending',
        insights: [],
        recommendations: []
      };

      // Queue the review for processing
      await this.queueReview(review, documentType, priority);
      
      return review;
    } catch (error) {
      throw new Error(`Failed to request AI review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReviewStatus(reviewId: string): Promise<ReviewStatus> {
    try {
      // Check review status from API
      const response = await this.makeAPICall(`/reviews/${reviewId}/status`);
      return response.status;
    } catch (error) {
      throw new Error(`Failed to get review status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReview(reviewId: string): Promise<AIReview> {
    try {
      const response = await this.makeAPICall(`/reviews/${reviewId}`);
      return this.mapResponseToReview(response);
    } catch (error) {
      throw new Error(`Failed to get review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentReviews(documentId: string): Promise<AIReview[]> {
    try {
      const response = await this.makeAPICall(`/documents/${documentId}/reviews`);
      return response.reviews.map((r: any) => this.mapResponseToReview(r));
    } catch (error) {
      throw new Error(`Failed to get document reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeDocument(
    documentId: string,
    documentType: DocumentType
  ): Promise<DocumentAnalysis> {
    try {
      const response = await this.makeAPICall('/documents/analyze', 'POST', {
        documentId,
        documentType,
        analysisType: 'comprehensive'
      });

      return {
        documentId,
        analyzedAt: new Date(),
        documentType,
        pageCount: response.pageCount || 0,
        wordCount: response.wordCount || 0,
        keyTopics: response.keyTopics || [],
        sentiment: response.sentiment || {
          overall: 0,
          positive: 0,
          negative: 0,
          neutral: 1,
          confidence: 0
        },
        complexity: response.complexity || {
          technical: 0,
          legal: 0,
          financial: 0,
          overall: 0
        },
        readability: response.readability || {
          fleschKincaid: 0,
          grade: 'Unknown',
          readingTime: 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailableReviewers(): Promise<AIReviewer[]> {
    return [
      {
        id: 'financial-analyst-v1',
        name: 'Financial Analyst AI',
        type: 'financial-analyst',
        specialization: ['financial-projections', 'cap-tables', 'revenue-models', 'market-analysis'],
        model: 'GPT-4-Turbo',
        version: '1.0',
        capabilities: ['financial-modeling', 'risk-assessment']
      },
      {
        id: 'legal-expert-v1',
        name: 'Legal Expert AI',
        type: 'legal-expert',
        specialization: ['contracts', 'patents', 'compliance', 'intellectual-property'],
        model: 'Claude-3-Opus',
        version: '1.0',
        capabilities: ['legal-compliance', 'risk-assessment']
      },
      {
        id: 'business-strategist-v1',
        name: 'Business Strategist AI',
        type: 'business-strategist',
        specialization: ['pitch-decks', 'business-models', 'market-strategy', 'competitive-analysis'],
        model: 'GPT-4-Turbo',
        version: '1.0',
        capabilities: ['text-analysis', 'risk-assessment']
      },
      {
        id: 'medical-expert-v1',
        name: 'Medical Expert AI',
        type: 'medical-expert',
        specialization: ['medical-records', 'clinical-data', 'research-papers', 'regulatory-compliance'],
        model: 'Claude-3-Opus',
        version: '1.0',
        capabilities: ['text-analysis', 'legal-compliance', 'risk-assessment']
      }
    ];
  }

  async cancelReview(reviewId: string): Promise<boolean> {
    try {
      await this.makeAPICall(`/reviews/${reviewId}/cancel`, 'POST');
      return true;
    } catch (error) {
      console.error('Failed to cancel review:', error);
      return false;
    }
  }

  async exportReview(reviewId: string, format: 'json' | 'pdf' | 'html' = 'json'): Promise<Blob> {
    try {
      const review = await this.getReview(reviewId);
      
      switch (format) {
        case 'json':
          return new Blob([JSON.stringify(review, null, 2)], {
            type: 'application/json'
          });
        case 'pdf':
          return await this.generatePDFReport(review);
        case 'html':
          return await this.generateHTMLReport(review);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to export review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getReviewer(type: AIReviewerType): Promise<AIReviewer> {
    const reviewers = await this.getAvailableReviewers();
    const reviewer = reviewers.find(r => r.type === type);
    
    if (!reviewer) {
      throw new Error(`No reviewer available for type: ${type}`);
    }
    
    return reviewer;
  }

  private async queueReview(
    review: AIReview,
    documentType: DocumentType,
    priority: string
  ): Promise<void> {
    try {
      await this.makeAPICall('/reviews/queue', 'POST', {
        review,
        documentType,
        priority,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw new Error('Failed to queue review for processing');
    }
  }

  private async makeAPICall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    const url = `${this.apiEndpoint}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  private mapResponseToReview(response: any): AIReview {
    return {
      id: response.id,
      documentId: response.documentId,
      reviewerId: response.reviewerId,
      reviewerType: response.reviewerType,
      content: response.content || '',
      score: response.score || 0,
      confidence: response.confidence || 0,
      createdAt: new Date(response.createdAt),
      status: response.status,
      insights: response.insights || [],
      recommendations: response.recommendations || []
    };
  }

  private async generatePDFReport(review: AIReview): Promise<Blob> {
    // Implementation for generating PDF report
    // This would use a library like jsPDF or call a server-side service
    const reportContent = this.formatReviewForExport(review);
    return new Blob([reportContent], { type: 'application/pdf' });
  }

  private async generateHTMLReport(review: AIReview): Promise<Blob> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Review Report - ${review.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          .content { margin: 20px 0; }
          .insight { margin: 10px 0; padding: 10px; border-left: 4px solid #007bff; }
          .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Review Report</h1>
          <p><strong>Review ID:</strong> ${review.id}</p>
          <p><strong>Reviewer:</strong> ${review.reviewerType}</p>
          <p><strong>Date:</strong> ${review.createdAt.toISOString()}</p>
          <p><strong>Score:</strong> ${review.score}/100</p>
          <p><strong>Confidence:</strong> ${review.confidence}%</p>
        </div>
        
        <div class="content">
          <h2>Review Content</h2>
          <p>${review.content}</p>
          
          <h2>Insights</h2>
          ${review.insights.map(insight => `
            <div class="insight">
              <h3>${insight.title}</h3>
              <p>${insight.description}</p>
              <p><strong>Severity:</strong> ${insight.severity}</p>
            </div>
          `).join('')}
          
          <h2>Recommendations</h2>
          ${review.recommendations.map(rec => `
            <div class="recommendation">
              <h3>${rec.title}</h3>
              <p>${rec.description}</p>
              <p><strong>Priority:</strong> ${rec.priority}</p>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    
    return new Blob([htmlContent], { type: 'text/html' });
  }

  private formatReviewForExport(review: AIReview): string {
    return JSON.stringify({
      reviewSummary: {
        id: review.id,
        reviewerType: review.reviewerType,
        score: review.score,
        confidence: review.confidence,
        createdAt: review.createdAt
      },
      content: review.content,
      insights: review.insights,
      recommendations: review.recommendations,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  private generateReviewId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}