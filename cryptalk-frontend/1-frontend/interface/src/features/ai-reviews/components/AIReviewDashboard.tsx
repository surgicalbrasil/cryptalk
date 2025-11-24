import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Progress,
  Select,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
  Spinner,
  Icon,
  Divider,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiFileText, FiDownload, FiPlay, FiX, FiCheck, FiClock, FiBarChart } from 'react-icons/fi';
import { useAIReviews } from '../hooks/useAIReviews';
import { AIReviewerType, DocumentType, ReviewStatus } from '../../../shared/types';

interface AIReviewDashboardProps {
  documentId?: string;
  onReviewComplete?: (reviewId: string) => void;
}

export const AIReviewDashboard: React.FC<AIReviewDashboardProps> = ({
  documentId,
  onReviewComplete
}) => {
  const [selectedReviewerType, setSelectedReviewerType] = useState<AIReviewerType>('financial-analyst');
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('contract');
  const [activePolling, setActivePolling] = useState<Set<string>>(new Set());
  
  const toast = useToast();
  
  const {
    reviews,
    availableReviewers,
    isLoading,
    isAnalyzing,
    requestReview,
    analyzeDocument,
    cancelReview,
    exportReview,
    pollReviewStatus
  } = useAIReviews();

  // Auto-start polling for pending reviews
  useEffect(() => {
    const pendingReviews = reviews.filter(r => r.status === 'pending' || r.status === 'analyzing');
    
    pendingReviews.forEach(review => {
      if (!activePolling.has(review.id)) {
        setActivePolling(prev => new Set(prev).add(review.id));
        
        const stopPolling = pollReviewStatus(review.id, (status) => {
          if (status === 'completed') {
            toast({
              title: 'Review Completed',
              description: `AI review for ${review.reviewerType} is ready`,
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            onReviewComplete?.(review.id);
          } else if (status === 'failed') {
            toast({
              title: 'Review Failed',
              description: `AI review for ${review.reviewerType} failed`,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
          
          setActivePolling(prev => {
            const newSet = new Set(prev);
            newSet.delete(review.id);
            return newSet;
          });
        });

        // Cleanup polling when component unmounts
        return () => stopPolling();
      }
    });
  }, [reviews, activePolling, pollReviewStatus, toast, onReviewComplete]);

  const handleRequestReview = async () => {
    if (!documentId) {
      toast({
        title: 'No document selected',
        description: 'Please select a document to review',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const review = await requestReview(documentId, selectedReviewerType, selectedDocumentType);
      
      toast({
        title: 'Review Requested',
        description: `${selectedReviewerType} review has been queued`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Start polling for this review
      setActivePolling(prev => new Set(prev).add(review.id));
    } catch (error) {
      toast({
        title: 'Failed to request review',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAnalyzeDocument = async () => {
    if (!documentId) return;

    try {
      const analysis = await analyzeDocument(documentId, selectedDocumentType);
      
      toast({
        title: 'Document Analysis Complete',
        description: `Found ${analysis.keyTopics.length} key topics`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCancelReview = async (reviewId: string) => {
    try {
      const success = await cancelReview(reviewId);
      if (success) {
        toast({
          title: 'Review Cancelled',
          description: 'The AI review has been cancelled',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to cancel review',
        description: 'Could not cancel the review',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportReview = async (reviewId: string, format: 'json' | 'pdf' | 'html' = 'json') => {
    try {
      const blob = await exportReview(reviewId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-review-${reviewId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Review exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: ReviewStatus): string => {
    switch (status) {
      case 'completed': return 'green';
      case 'pending': return 'yellow';
      case 'analyzing': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: ReviewStatus) => {
    switch (status) {
      case 'completed': return FiCheck;
      case 'pending': return FiClock;
      case 'analyzing': return Spinner;
      case 'failed': return FiX;
      default: return FiFileText;
    }
  };

  const completedReviews = reviews.filter(r => r.status === 'completed');
  const pendingReviews = reviews.filter(r => r.status === 'pending' || r.status === 'analyzing');
  const averageScore = completedReviews.length > 0 
    ? completedReviews.reduce((sum, r) => sum + r.score, 0) / completedReviews.length 
    : 0;

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="start">
        <VStack align="start" spacing={1}>
          <Heading size="lg">🤖 AI Review Dashboard</Heading>
          <Text color="gray.600">
            Analyze documents with specialized AI experts
          </Text>
        </VStack>
        
        <HStack spacing={4}>
          <Stat size="sm" textAlign="center">
            <StatLabel>Completed Reviews</StatLabel>
            <StatNumber>{completedReviews.length}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              This session
            </StatHelpText>
          </Stat>
          
          <Stat size="sm" textAlign="center">
            <StatLabel>Average Score</StatLabel>
            <StatNumber>{averageScore.toFixed(1)}</StatNumber>
            <StatHelpText>Out of 100</StatHelpText>
          </Stat>
        </HStack>
      </HStack>

      {/* Request New Review */}
      <Card>
        <CardHeader>
          <Heading size="md">Request New AI Review</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <Text mb={2} fontWeight="medium">Select AI Reviewer</Text>
                <Select
                  value={selectedReviewerType}
                  onChange={(e) => setSelectedReviewerType(e.target.value as AIReviewerType)}
                >
                  {availableReviewers.map(reviewer => (
                    <option key={reviewer.id} value={reviewer.type}>
                      {reviewer.name}
                    </option>
                  ))}
                </Select>
              </GridItem>
              
              <GridItem>
                <Text mb={2} fontWeight="medium">Document Type</Text>
                <Select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value as DocumentType)}
                >
                  <option value="contract">Contract</option>
                  <option value="financial-report">Financial Report</option>
                  <option value="medical-record">Medical Record</option>
                  <option value="patent">Patent</option>
                  <option value="presentation">Presentation</option>
                </Select>
              </GridItem>
            </Grid>
            
            <HStack spacing={3}>
              <Button
                leftIcon={<FiPlay />}
                colorScheme="blue"
                onClick={handleRequestReview}
                isLoading={isLoading}
                isDisabled={!documentId}
              >
                Start AI Review
              </Button>
              
              <Button
                leftIcon={<FiBarChart3 />}
                variant="outline"
                onClick={handleAnalyzeDocument}
                isLoading={isAnalyzing}
                isDisabled={!documentId}
              >
                Quick Analysis
              </Button>
            </HStack>
            
            {!documentId && (
              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Upload a document first to enable AI reviews
                </Text>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Active Reviews */}
      {pendingReviews.length > 0 && (
        <Card>
          <CardHeader>
            <Heading size="md">Reviews in Progress</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {pendingReviews.map(review => (
                <HStack key={review.id} justify="space-between" p={3} bg="blue.50" borderRadius="md">
                  <HStack spacing={3}>
                    <Icon as={getStatusIcon(review.status)} color="blue.500" />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{review.reviewerType}</Text>
                      <Text fontSize="sm" color="gray.600">
                        Started {review.createdAt.toLocaleTimeString()}
                      </Text>
                    </VStack>
                  </HStack>
                  
                  <HStack spacing={2}>
                    <Badge colorScheme={getStatusColor(review.status)}>
                      {review.status}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<FiX />}
                      onClick={() => handleCancelReview(review.id)}
                    >
                      Cancel
                    </Button>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Completed Reviews */}
      {completedReviews.length > 0 && (
        <Card>
          <CardHeader>
            <Heading size="md">Completed Reviews</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {completedReviews.map(review => (
                <Box key={review.id} p={4} border="1px" borderColor="gray.200" borderRadius="md">
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Icon as={FiCheck} color="green.500" />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{review.reviewerType}</Text>
                          <Text fontSize="sm" color="gray.600">
                            Completed {review.createdAt.toLocaleDateString()}
                          </Text>
                        </VStack>
                      </HStack>
                      
                      <HStack spacing={2}>
                        <Badge colorScheme="green" size="lg">
                          Score: {review.score}/100
                        </Badge>
                        <Badge colorScheme="blue">
                          {review.confidence}% confidence
                        </Badge>
                      </HStack>
                    </HStack>
                    
                    <Text fontSize="sm" noOfLines={3}>
                      {review.content}
                    </Text>
                    
                    <Divider />
                    
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">
                        {review.insights.length} insights • {review.recommendations.length} recommendations
                      </Text>
                      
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<FiDownload />}
                          onClick={() => handleExportReview(review.id, 'json')}
                        >
                          Export JSON
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<FiDownload />}
                          onClick={() => handleExportReview(review.id, 'pdf')}
                        >
                          Export PDF
                        </Button>
                      </HStack>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {reviews.length === 0 && !isLoading && (
        <VStack spacing={4} py={12} color="gray.500">
          <Icon as={FiFileText} w={16} h={16} />
          <Text fontSize="lg" fontWeight="medium">No AI reviews yet</Text>
          <Text textAlign="center" maxW="md">
            Upload a document and request an AI review to get started with intelligent document analysis.
          </Text>
        </VStack>
      )}
    </VStack>
  );
};