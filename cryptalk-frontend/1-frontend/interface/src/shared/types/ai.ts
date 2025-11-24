// AI Review Types
export interface AIReview {
  id: string;
  documentId: string;
  reviewerId: string;
  reviewerType: AIReviewerType;
  content: string;
  score: number;
  confidence: number;
  createdAt: Date;
  status: ReviewStatus;
  insights: AIInsight[];
  recommendations: AIRecommendation[];
}

export interface AIInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  severity: InsightSeverity;
  confidence: number;
  evidence?: string[];
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  actionRequired: boolean;
  estimatedImpact: string;
}

export interface DocumentAnalysis {
  documentId: string;
  analyzedAt: Date;
  documentType: DocumentType;
  pageCount: number;
  wordCount: number;
  keyTopics: string[];
  sentiment: SentimentAnalysis;
  complexity: ComplexityScore;
  readability: ReadabilityScore;
}

export interface SentimentAnalysis {
  overall: number; // -1 to 1
  positive: number;
  negative: number;
  neutral: number;
  confidence: number;
}

export interface ComplexityScore {
  technical: number; // 0-100
  legal: number; // 0-100
  financial: number; // 0-100
  overall: number; // 0-100
}

export interface ReadabilityScore {
  fleschKincaid: number;
  grade: string;
  readingTime: number; // minutes
}

export interface AIReviewer {
  id: string;
  name: string;
  type: AIReviewerType;
  specialization: string[];
  model: string;
  version: string;
  capabilities: ReviewCapability[];
}

export type AIReviewerType = 
  | 'financial-analyst'
  | 'legal-expert'
  | 'business-strategist'
  | 'medical-expert'
  | 'technical-reviewer';

export type ReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type InsightCategory = 'risk' | 'opportunity' | 'compliance' | 'quality' | 'structure';
export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DocumentType = 'contract' | 'financial-report' | 'medical-record' | 'patent' | 'presentation';
export type ReviewCapability = 'text-analysis' | 'financial-modeling' | 'legal-compliance' | 'risk-assessment';