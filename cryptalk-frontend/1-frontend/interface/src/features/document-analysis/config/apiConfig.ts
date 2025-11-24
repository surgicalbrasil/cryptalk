// API Configuration for Document Analysis
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  ENDPOINTS: {
    UPLOAD: '/api/documents/upload',
    ANALYZE: '/api/documents/analyze',
    CHAT: '/api/chat',
    RESULTS: '/api/documents/results'
  },
  TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_FORMATS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ]
};

// Claude Code Integration Configuration
export const CLAUDE_CODE_CONFIG = {
  ENABLED: process.env.REACT_APP_CLAUDE_CODE_ENABLED === 'true',
  ENDPOINT: process.env.REACT_APP_CLAUDE_CODE_ENDPOINT || 'http://localhost:8080',
  API_KEY: process.env.REACT_APP_CLAUDE_CODE_API_KEY || '',
  FEATURES: {
    DOCUMENT_ANALYSIS: true,
    CHAT_INTERFACE: true,
    REAL_TIME_ANALYSIS: true,
    MULTI_AGENT_SUPPORT: true
  }
};

// WebSocket Configuration for Real-time Updates
export const WEBSOCKET_CONFIG = {
  ENABLED: process.env.REACT_APP_WEBSOCKET_ENABLED === 'true',
  URL: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001',
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  MAX_CONCURRENT_UPLOADS: 3,
  RETRY_ATTEMPTS: 3,
  PROGRESS_UPDATE_INTERVAL: 100 // milliseconds
};

// Analysis Configuration
export const ANALYSIS_CONFIG = {
  TIMEOUT: 120000, // 2 minutes
  POLLING_INTERVAL: 2000, // 2 seconds
  MAX_RETRIES: 3,
  BATCH_SIZE: 5 // max documents to analyze at once
};

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 4000,
  HISTORY_LIMIT: 100,
  TYPING_INDICATOR_DELAY: 1000,
  MESSAGE_TIMEOUT: 30000
};