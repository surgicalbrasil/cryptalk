# Document Analysis System

A comprehensive document analysis system integrated into CrypTalk that provides AI-powered document review, chat interface, and specialized agent analysis.

## Features

### 🔧 Core Functionality
- **Document Upload**: Drag & drop interface with progress tracking
- **AI Agent Selection**: Specialized agents for different document types
- **Real-time Analysis**: Live document analysis with progress updates
- **Chat Interface**: Interactive chat with AI agents about documents
- **Results Display**: Comprehensive analysis results with insights and recommendations

### 📊 Document Types Supported
- **Pitch Decks**: Business presentations and proposals
- **Financial Documents**: Statements, cap tables, projections
- **Legal Documents**: Contracts, NDAs, patents
- **Technical Documents**: Specifications, architecture, whitepapers

### 🤖 AI Agents
- **Financial Analyst**: Expert in financial projections and valuations
- **Legal Expert**: Specialist in contract analysis and compliance
- **Business Strategist**: Focused on business models and market analysis
- **Technical Expert**: Specialized in technical architecture and innovation

## Architecture

### Components
```
document-analysis/
├── components/
│   ├── DocumentAnalyzer.tsx      # Main analysis interface
│   ├── DocumentUploader.tsx      # File upload component
│   ├── AIAgentSelector.tsx       # Agent selection interface
│   ├── DocumentChat.tsx          # Chat interface
│   └── AnalysisResults.tsx       # Results display
├── hooks/
│   └── useDocumentAnalysis.ts    # Main analysis hook
├── services/
│   └── documentService.ts        # API service layer
├── types/
│   └── index.ts                  # Type definitions
└── config/
    └── apiConfig.ts              # Configuration
```

### Data Flow
1. User selects document type
2. Document is uploaded with progress tracking
3. AI agent is selected based on document type
4. Analysis is initiated with real-time updates
5. Results are displayed with insights and recommendations
6. Chat interface allows further interaction

## Usage

### Basic Integration
```typescript
import { DocumentAnalyzer } from '../features/document-analysis';

const MyComponent = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  return (
    <DocumentAnalyzer
      category={selectedCategory}
      onBack={() => setSelectedCategory(null)}
    />
  );
};
```

### Using the Hook
```typescript
import { useDocumentAnalysis } from '../features/document-analysis';

const MyComponent = () => {
  const {
    documents,
    selectedAgent,
    uploadDocument,
    analyzeDocument,
    sendChatMessage
  } = useDocumentAnalysis();
  
  // Your component logic
};
```

## Configuration

### Environment Variables
```env
# Claude Code Integration
REACT_APP_CLAUDE_CODE_ENABLED=true
REACT_APP_CLAUDE_CODE_ENDPOINT=http://localhost:8080
REACT_APP_CLAUDE_CODE_API_KEY=your-api-key

# File Upload
REACT_APP_MAX_FILE_SIZE=52428800
REACT_APP_MAX_FILES_PER_UPLOAD=5

# WebSocket for Real-time Updates
REACT_APP_WEBSOCKET_ENABLED=true
REACT_APP_WEBSOCKET_URL=ws://localhost:3001
```

### API Configuration
```typescript
import { API_CONFIG } from './config/apiConfig';

// Customize endpoints
API_CONFIG.ENDPOINTS.UPLOAD = '/custom/upload';
API_CONFIG.TIMEOUT = 60000;
```

## File Type Support

### Supported Formats
- **PDF**: `.pdf`
- **Word**: `.doc`, `.docx`
- **Excel**: `.xls`, `.xlsx`
- **PowerPoint**: `.ppt`, `.pptx`
- **Text**: `.txt`, `.md`

### Size Limits
- **Pitch Decks**: 50MB max
- **Financial Documents**: 25MB max
- **Legal Documents**: 20MB max
- **Technical Documents**: 30MB max

## Backend Integration

### Expected API Endpoints
```
POST /api/documents/upload
POST /api/documents/analyze
POST /api/chat
GET  /api/documents/results/:id
```

### WebSocket Events
```typescript
// Real-time updates
socket.on('analysis-progress', (data) => {
  // Update analysis progress
});

socket.on('analysis-complete', (data) => {
  // Handle completion
});

socket.on('chat-message', (data) => {
  // Handle chat response
});
```

## Customization

### Adding New Document Types
```typescript
// In documentService.ts
const newCategory: DocumentCategory = {
  id: 'custom-type',
  name: 'Custom Documents',
  icon: '📋',
  description: 'Custom document type',
  acceptedTypes: ['application/pdf'],
  maxSize: 10 * 1024 * 1024,
  agents: [customAgent]
};
```

### Creating Custom AI Agents
```typescript
const customAgent: AIAgent = {
  id: 'custom-agent',
  name: 'Custom Expert',
  icon: '🎯',
  description: 'Specialized in custom analysis',
  expertise: ['Custom Analysis', 'Domain Knowledge'],
  available: true
};
```

## Error Handling

### Common Issues
- **File Too Large**: Check size limits for document type
- **Unsupported Format**: Verify file type is accepted
- **Upload Failed**: Check network connection and API endpoint
- **Analysis Timeout**: Increase timeout in configuration

### Error Messages
```typescript
// Custom error handling
try {
  await uploadDocument(file, category);
} catch (error) {
  if (error.code === 'FILE_TOO_LARGE') {
    // Handle size error
  } else if (error.code === 'UNSUPPORTED_FORMAT') {
    // Handle format error
  }
}
```

## Performance Optimization

### File Upload
- Chunked uploads for large files
- Progress tracking with visual feedback
- Retry mechanism for failed uploads
- Concurrent upload limits

### Analysis Processing
- Real-time progress updates
- Background processing
- Result caching
- Batch processing support

## Security

### File Validation
- Type checking on upload
- Size limit enforcement
- Content scanning
- Secure file storage

### Data Protection
- Encrypted file transfer
- Secure API endpoints
- User authentication required
- Session management

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=document-analysis
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure API endpoints
3. Set up Claude Code integration
4. Configure file upload limits

## Support

For issues and questions:
- Check the component documentation
- Review error logs
- Verify API connectivity
- Test with smaller files first