import React, { useState } from 'react';
import {
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  Button,
  Divider,
  Badge,
  Box,
  HStack
} from '@chakra-ui/react';
import { SectionTabs } from '../../../shared/components/Navigation/SectionTabs';
import { FeatureCard } from '../../../shared/components/Layout/FeatureCard';
import { DocumentTypeSelector } from './DocumentTypeSelector';
import { DocumentCategory } from '../../../shared/types';

type OffChainSection = 'nda' | 'upload' | 'ai';

const sectionOptions = [
  { id: 'nda', label: 'NDA Creation', icon: '📝', colorScheme: 'blue' },
  { id: 'upload', label: 'Document Upload', icon: '📁', colorScheme: 'green' },
  { id: 'ai', label: 'AI Review', icon: '🤖', colorScheme: 'purple' }
];

export const OffChainSpace: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<OffChainSection>('nda');
  const [selectedDocType, setSelectedDocType] = useState<DocumentCategory | undefined>();

  const handleSectionChange = (section: string) => {
    setSelectedSection(section as OffChainSection);
  };

  const handleDocTypeSelect = (type: DocumentCategory) => {
    setSelectedDocType(type);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <VStack spacing={4} mb={8}>
        <Heading size="lg">📁 Off Chain Features</Heading>
        <Text color="gray.600" maxW="2xl" textAlign="center">
          Create NDAs, upload documents, and manage secure file sharing with AI-powered review.
          All operations are performed off-chain for fast and free document management.
        </Text>
      </VStack>

      {/* Navigation */}
      <SectionTabs
        options={sectionOptions}
        activeTab={selectedSection}
        onTabChange={handleSectionChange}
      />

      {/* NDA Creation Section */}
      {(selectedSection === 'nda' || selectedSection === 'nda') && (
        <FeatureCard
          title="NDA Creation"
          icon="📝"
          headerBg="blue.50"
          alertStatus="info"
          alertTitle="AI-Powered NDA Generation"
          alertMessage="Create customized Non-Disclosure Agreements using advanced AI technology."
          actionButton={{
            text: 'Start NDA Creation',
            colorScheme: 'blue',
            icon: '📝'
          }}
        >
          <VStack spacing={4} align="start">
            <Text fontWeight="bold">Why Use AI NDA Creation?</Text>
            <VStack spacing={2} align="start" pl={4}>
              <Text fontSize="sm">• 🤖 Tailored to your specific requirements</Text>
              <Text fontSize="sm">• ⚡ Generated in seconds, not hours</Text>
              <Text fontSize="sm">• 📋 Legally compliant templates</Text>
              <Text fontSize="sm">• ✏️ Fully customizable and editable</Text>
            </VStack>
          </VStack>

          <Divider />
          
          <VStack spacing={4} align="stretch" p={6} bg="blue.50" borderRadius="md">
            <Text fontWeight="bold" color="blue.700">📄 Recent NDAs</Text>
            <Text color="blue.600">
              Your recently created NDAs will appear here for quick access and reuse.
            </Text>
            <Text fontSize="sm" color="gray.500">
              No NDAs created yet
            </Text>
          </VStack>
        </FeatureCard>
      )}

      {/* Document Upload Section */}
      {selectedSection === 'upload' && (
        <FeatureCard
          title="Document Upload"
          icon="📁"
          headerBg="green.50"
          alertStatus="success"
          alertMessage="Securely upload your documents for safe storage and AI analysis."
          actionButton={{
            text: 'Upload Documents',
            colorScheme: 'green',
            icon: '📁'
          }}
        >
          <VStack spacing={4} align="start">
            <Text fontWeight="bold">Select Document Type:</Text>
            <DocumentTypeSelector
              onTypeSelect={handleDocTypeSelect}
              selectedType={selectedDocType}
            />
          </VStack>
          
          <VStack spacing={4} align="stretch" p={6} bg="green.50" borderRadius="md">
            <Text fontWeight="bold" color="green.700">📂 Document Library</Text>
            <Text color="green.600">
              Your uploaded documents will be organized here by type and ready for AI review.
            </Text>
            <Text fontSize="sm" color="gray.500">
              No documents uploaded yet
            </Text>
          </VStack>
        </FeatureCard>
      )}

      {/* AI Review Section */}
      {selectedSection === 'ai' && (
        <FeatureCard
          title="AI Agent Review"
          icon="🤖"
          headerBg="purple.50"
          alertStatus="info"
          alertTitle="Expert AI Analysis"
          alertMessage="Select specialized AI agents to review your documents with domain expertise."
          actionButton={{
            text: 'Start AI Review',
            colorScheme: 'purple',
            icon: '🤖'
          }}
        >
          <Badge colorScheme="purple" alignSelf="start">
            🎯 Specialized Expertise • 📊 Detailed Analysis • ⚡ Instant Results
          </Badge>
          
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between" p={4} border="2px" borderColor="blue.200" borderRadius="md" bg="blue.50">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Text>💼</Text>
                  <Text fontWeight="bold">Financial Analyst</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Reviews financial projections, cap tables, and revenue models</Text>
              </VStack>
              <Badge colorScheme="blue">Available</Badge>
            </HStack>
            
            <HStack justify="space-between" p={4} border="2px" borderColor="green.200" borderRadius="md" bg="green.50">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Text>⚖️</Text>
                  <Text fontWeight="bold">Legal Expert</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Analyzes patents, contracts, and legal compliance</Text>
              </VStack>
              <Badge colorScheme="green">Available</Badge>
            </HStack>
            
            <HStack justify="space-between" p={4} border="2px" borderColor="purple.200" borderRadius="md" bg="purple.50">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Text>🚀</Text>
                  <Text fontWeight="bold">Business Strategist</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Evaluates pitch decks, business models, and market analysis</Text>
              </VStack>
              <Badge colorScheme="purple">Available</Badge>
            </HStack>
          </VStack>
          
          <VStack spacing={4} align="stretch" p={6} bg="purple.50" borderRadius="md">
            <Text fontWeight="bold" color="purple.700">📋 Review Results</Text>
            <Text color="purple.600">
              Detailed AI analysis reports will appear here with insights, recommendations, and scoring.
            </Text>
            <Text fontSize="sm" color="gray.500">
              No reviews completed yet
            </Text>
          </VStack>
        </FeatureCard>
      )}
    </VStack>
  );
};