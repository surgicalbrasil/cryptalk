import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Progress,
  Divider,
  Button,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Grid,
  GridItem,
  Alert,
  AlertIcon,
  Avatar,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon
} from '@chakra-ui/react';
import { FiDownload, FiShare2, FiEye, FiAlertTriangle } from 'react-icons/fi';
import { AnalysisResult, DocumentFile, AIAgent } from '../types';
import { formatTimeAgo } from '../../../shared/utils/formatters';

interface AnalysisResultsProps {
  results: AnalysisResult[];
  document: DocumentFile;
  agent: AIAgent;
  onViewDetails?: (result: AnalysisResult) => void;
  onDownloadReport?: (result: AnalysisResult) => void;
  onShareResult?: (result: AnalysisResult) => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  results,
  document,
  agent,
  onViewDetails,
  onDownloadReport,
  onShareResult
}) => {
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(
    results.length > 0 ? results[0] : null
  );

  if (results.length === 0) {
    return (
      <Alert status="info">
        <AlertIcon />
        <Text>No analysis results available yet.</Text>
      </Alert>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Analysis Header */}
      <Card>
        <CardHeader bg="purple.50">
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Text fontSize="lg" fontWeight="bold">
                Analysis Results
              </Text>
              <HStack spacing={2}>
                <Badge colorScheme="blue" size="sm">
                  📄 {document.name}
                </Badge>
                <Badge colorScheme="purple" size="sm">
                  {agent.icon} {agent.name}
                </Badge>
              </HStack>
            </VStack>
            
            <Avatar
              name={agent.name}
              size="md"
              bg="purple.500"
              color="white"
            />
          </HStack>
        </CardHeader>
      </Card>

      {/* Results List */}
      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
        {results.map((result) => (
          <GridItem key={result.id}>
            <Card
              cursor="pointer"
              border="2px"
              borderColor={selectedResult?.id === result.id ? 'purple.300' : 'gray.200'}
              bg={selectedResult?.id === result.id ? 'purple.50' : 'white'}
              transition="all 0.2s"
              _hover={{
                borderColor: 'purple.300',
                bg: 'purple.50',
                transform: 'translateY(-2px)',
                shadow: 'md'
              }}
              onClick={() => setSelectedResult(result)}
            >
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {/* Result Header */}
                  <HStack justify="space-between">
                    <Badge colorScheme="purple" size="sm">
                      Analysis #{result.id.split('-')[1]}
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                      {formatTimeAgo(result.createdAt)}
                    </Text>
                  </HStack>

                  {/* Score */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="medium">
                        Overall Score
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color={`${getScoreColor(result.score)}.500`}>
                        {result.score}/100
                      </Text>
                    </HStack>
                    <Progress
                      value={result.score}
                      colorScheme={getScoreColor(result.score)}
                      size="sm"
                      borderRadius="full"
                    />
                  </Box>

                  {/* Summary */}
                  <Text fontSize="sm" color="gray.600" noOfLines={3}>
                    {result.summary}
                  </Text>

                  {/* Quick Stats */}
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Insights</StatLabel>
                      <StatNumber fontSize="md">{result.insights.length}</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Recommendations</StatLabel>
                      <StatNumber fontSize="md">{result.recommendations.length}</StatNumber>
                    </Stat>
                  </Grid>

                  {/* Action Buttons */}
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      variant="outline"
                      leftIcon={<FiEye />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails?.(result);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<FiDownload />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadReport?.(result);
                      }}
                    >
                      Export
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>

      {/* Detailed View */}
      {selectedResult && (
        <Card>
          <CardHeader bg="purple.50">
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="bold">
                Detailed Analysis
              </Text>
              <HStack>
                <Button
                  size="sm"
                  colorScheme="blue"
                  leftIcon={<FiDownload />}
                  onClick={() => onDownloadReport?.(selectedResult)}
                >
                  Download Report
                </Button>
                <Button
                  size="sm"
                  colorScheme="green"
                  leftIcon={<FiShare2 />}
                  onClick={() => onShareResult?.(selectedResult)}
                >
                  Share
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Overall Score */}
              <Box p={4} bg="gray.50" borderRadius="md">
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="md" fontWeight="semibold">
                    Overall Analysis Score
                  </Text>
                  <Badge colorScheme={getScoreColor(selectedResult.score)} p={2}>
                    {selectedResult.score}/100
                  </Badge>
                </HStack>
                <Progress
                  value={selectedResult.score}
                  colorScheme={getScoreColor(selectedResult.score)}
                  size="lg"
                  borderRadius="full"
                />
              </Box>

              {/* Summary */}
              <Box>
                <Text fontSize="md" fontWeight="semibold" mb={2}>
                  Executive Summary
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {selectedResult.summary}
                </Text>
              </Box>

              <Divider />

              {/* Insights */}
              <Box>
                <Text fontSize="md" fontWeight="semibold" mb={4}>
                  Key Insights ({selectedResult.insights.length})
                </Text>
                
                <Accordion allowMultiple>
                  {selectedResult.insights.map((insight, index) => (
                    <AccordionItem key={insight.id}>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <HStack>
                            <Badge colorScheme={getImportanceColor(insight.importance)} size="sm">
                              {insight.importance}
                            </Badge>
                            <Text fontWeight="medium">{insight.title}</Text>
                          </HStack>
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel pb={4}>
                        <VStack align="start" spacing={2}>
                          <Text fontSize="sm" color="gray.600">
                            {insight.content}
                          </Text>
                          <Badge colorScheme="gray" size="sm">
                            Category: {insight.category}
                          </Badge>
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Box>

              <Divider />

              {/* Recommendations */}
              <Box>
                <Text fontSize="md" fontWeight="semibold" mb={4}>
                  Recommendations ({selectedResult.recommendations.length})
                </Text>
                
                <VStack spacing={3} align="stretch">
                  {selectedResult.recommendations.map((rec) => (
                    <Box
                      key={rec.id}
                      p={4}
                      border="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      bg={rec.actionRequired ? 'red.50' : 'gray.50'}
                    >
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Badge colorScheme={getPriorityColor(rec.priority)} size="sm">
                            {rec.priority}
                          </Badge>
                          {rec.actionRequired && (
                            <Icon as={FiAlertTriangle} color="red.500" />
                          )}
                        </HStack>
                        {rec.actionRequired && (
                          <Badge colorScheme="red" size="sm">
                            Action Required
                          </Badge>
                        )}
                      </HStack>
                      
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        {rec.title}
                      </Text>
                      
                      <Text fontSize="sm" color="gray.600">
                        {rec.description}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};