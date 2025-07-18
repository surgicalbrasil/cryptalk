import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Progress,
  Spinner
} from '@chakra-ui/react';
import { FiUpload, FiMessageCircle, FiBarChart, FiPlay } from 'react-icons/fi';
import { DocumentUploader } from './DocumentUploader';
import { AIAgentSelector } from './AIAgentSelector';
import { DocumentChat } from './DocumentChat';
import { AnalysisResults } from './AnalysisResults';
import { DocumentCategory, DocumentFile, AIAgent } from '../types';
import { useDocumentAnalysis } from '../hooks/useDocumentAnalysis';

interface DocumentAnalyzerProps {
  category: DocumentCategory;
  onBack?: () => void;
}

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({
  category,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();
  
  const {
    documents,
    selectedAgent,
    chatHistory,
    isAnalyzing,
    isChatting,
    error,
    uploadDocument,
    analyzeDocument,
    sendChatMessage,
    selectAgent,
    clearChat,
    getAnalysisResults,
    clearError
  } = useDocumentAnalysis();

  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);

  const handleUpload = async (file: File, category: DocumentCategory) => {
    try {
      const uploadedDoc = await uploadDocument(file, category);
      if (!selectedDocument) {
        setSelectedDocument(uploadedDoc);
      }
      return uploadedDoc;
    } catch (error) {
      throw error;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedDocument || !selectedAgent) {
      toast({
        title: 'Missing Requirements',
        description: 'Please select both a document and an AI agent.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await analyzeDocument(selectedDocument.id, selectedAgent.id);
      toast({
        title: 'Analysis Complete',
        description: 'Your document has been analyzed successfully!',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      setActiveTab(2); // Switch to results tab
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze the document. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleAgentSelect = (agent: AIAgent) => {
    selectAgent(agent);
  };

  const handleChatMessage = async (message: string) => {
    await sendChatMessage(message, selectedDocument?.id);
  };

  const categoryDocuments = documents.filter(doc => doc.category.id === category.id);
  const analysisResults = selectedDocument ? getAnalysisResults(selectedDocument.id) : [];

  return (
    <Box>
      {/* Header */}
      <VStack spacing={4} mb={6}>
        <HStack justify="space-between" w="100%">
          <VStack align="start" spacing={1}>
            <HStack>
              <Text fontSize="2xl">{category.icon}</Text>
              <Text fontSize="xl" fontWeight="bold">
                {category.name} Analysis
              </Text>
            </HStack>
            <Text color="gray.600">
              {category.description}
            </Text>
          </VStack>
          
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              ← Back to Categories
            </Button>
          )}
        </HStack>

        {/* Status Bar */}
        <HStack spacing={4} w="100%">
          <Badge colorScheme={categoryDocuments.length > 0 ? 'green' : 'gray'}>
            📄 {categoryDocuments.length} Documents
          </Badge>
          <Badge colorScheme={selectedAgent ? 'purple' : 'gray'}>
            🤖 {selectedAgent ? selectedAgent.name : 'No Agent Selected'}
          </Badge>
          <Badge colorScheme={analysisResults.length > 0 ? 'blue' : 'gray'}>
            📊 {analysisResults.length} Analyses
          </Badge>
        </HStack>
      </VStack>

      {/* Error Alert */}
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Error</Text>
            <Text fontSize="sm">{error}</Text>
          </VStack>
          <Button size="sm" ml="auto" onClick={clearError}>
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>
            <HStack>
              <FiUpload />
              <Text>Upload & Setup</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack>
              <FiMessageCircle />
              <Text>Chat</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack>
              <FiBarChart />
              <Text>Analysis Results</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* Upload & Setup Tab */}
          <TabPanel>
            <Grid templateColumns="repeat(auto-fit, minmax(400px, 1fr))" gap={6}>
              {/* Document Upload */}
              <GridItem>
                <Card>
                  <CardHeader bg="blue.50">
                    <Text fontSize="lg" fontWeight="semibold">
                      📄 Upload Documents
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <DocumentUploader
                      category={category}
                      onUpload={handleUpload}
                      onFileSelect={(files) => {
                        if (files.length > 0 && !selectedDocument) {
                          setSelectedDocument(files[0]);
                        }
                      }}
                    />
                  </CardBody>
                </Card>
              </GridItem>

              {/* AI Agent Selection */}
              <GridItem>
                <Card>
                  <CardHeader bg="purple.50">
                    <Text fontSize="lg" fontWeight="semibold">
                      🤖 Select AI Agent
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <AIAgentSelector
                      agents={category.agents}
                      selectedAgent={selectedAgent}
                      onAgentSelect={handleAgentSelect}
                    />
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>

            {/* Document Selection */}
            {categoryDocuments.length > 0 && (
              <Card mt={6}>
                <CardHeader bg="green.50">
                  <Text fontSize="lg" fontWeight="semibold">
                    📋 Select Document for Analysis
                  </Text>
                </CardHeader>
                <CardBody>
                  <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
                    {categoryDocuments.map((doc) => (
                      <Box
                        key={doc.id}
                        p={4}
                        border="2px"
                        borderColor={selectedDocument?.id === doc.id ? 'blue.300' : 'gray.200'}
                        borderRadius="md"
                        bg={selectedDocument?.id === doc.id ? 'blue.50' : 'white'}
                        cursor="pointer"
                        onClick={() => setSelectedDocument(doc)}
                        transition="all 0.2s"
                        _hover={{
                          borderColor: 'blue.300',
                          bg: 'blue.50'
                        }}
                      >
                        <VStack align="start" spacing={2}>
                          <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                            {doc.name}
                          </Text>
                          <HStack>
                            <Badge colorScheme="blue" size="sm">
                              {doc.uploadStatus}
                            </Badge>
                            <Badge colorScheme="purple" size="sm">
                              {doc.analysisStatus}
                            </Badge>
                          </HStack>
                        </VStack>
                      </Box>
                    ))}
                  </Grid>
                </CardBody>
              </Card>
            )}

            {/* Analysis Button */}
            {selectedDocument && selectedAgent && (
              <Card mt={6}>
                <CardBody>
                  <VStack spacing={4}>
                    <HStack spacing={4}>
                      <Badge colorScheme="blue" p={2}>
                        📄 {selectedDocument.name}
                      </Badge>
                      <Badge colorScheme="purple" p={2}>
                        🤖 {selectedAgent.name}
                      </Badge>
                    </HStack>
                    
                    <Button
                      size="lg"
                      colorScheme="green"
                      leftIcon={<FiPlay />}
                      onClick={handleAnalyze}
                      isLoading={isAnalyzing}
                      loadingText="Analyzing..."
                    >
                      Start Analysis
                    </Button>
                    
                    {isAnalyzing && (
                      <VStack spacing={2} w="100%">
                        <Progress isIndeterminate colorScheme="green" w="100%" />
                        <Text fontSize="sm" color="gray.600">
                          {selectedAgent.name} is analyzing your document...
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          {/* Chat Tab */}
          <TabPanel>
            <DocumentChat
              messages={chatHistory}
              selectedAgent={selectedAgent}
              selectedDocument={selectedDocument}
              onSendMessage={handleChatMessage}
              onClearChat={clearChat}
              isLoading={isChatting}
            />
          </TabPanel>

          {/* Analysis Results Tab */}
          <TabPanel>
            {selectedDocument && analysisResults.length > 0 && selectedAgent ? (
              <AnalysisResults
                results={analysisResults}
                document={selectedDocument}
                agent={selectedAgent}
                onViewDetails={(result) => {
                  console.log('View details for:', result);
                }}
                onDownloadReport={(result) => {
                  toast({
                    title: 'Download Started',
                    description: 'Your analysis report is being prepared.',
                    status: 'info',
                    duration: 3000,
                    isClosable: true,
                  });
                }}
                onShareResult={(result) => {
                  toast({
                    title: 'Share Link Copied',
                    description: 'Analysis result link copied to clipboard.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                  });
                }}
              />
            ) : (
              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">No Analysis Results Yet</Text>
                  <Text fontSize="sm">
                    Upload a document, select an AI agent, and run an analysis to see results here.
                  </Text>
                </VStack>
              </Alert>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};