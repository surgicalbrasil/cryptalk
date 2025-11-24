// Storage Feature Exports
export { OffChainSpace } from './storage/components/OffChainSpace';
export { DocumentTypeSelector } from './storage/components/DocumentTypeSelector';
export { FileUploadZone } from './storage/components/FileUploadZone';
export { Web3StorageService } from './storage/services/Web3StorageService';
export { useFileUpload } from './storage/hooks/useFileUpload';

// Chat Feature Exports
export { TimestampChatInterface } from './chat/components/TimestampChatInterface';
export { TimestampChatService } from './chat/services/TimestampChatService';
export { useTimestampChat } from './chat/hooks/useTimestampChat';

// AI Reviews Feature Exports
export { AIReviewDashboard } from './ai-reviews/components/AIReviewDashboard';
export { AIReviewService } from './ai-reviews/services/AIReviewService';
export { useAIReviews } from './ai-reviews/hooks/useAIReviews';

// Payments Feature Exports
export { OnChainSpace } from './payments/components/OnChainSpace';
export { PIXOnRampInterface } from './payments/components/PIXOnRampInterface';
export { PIXOnRampService } from './payments/services/PIXOnRampService';
export { usePayments } from './payments/hooks/usePayments';