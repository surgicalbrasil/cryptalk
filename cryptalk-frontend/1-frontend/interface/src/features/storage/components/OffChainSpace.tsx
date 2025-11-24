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
import { DocumentAnalyzer } from '../../document-analysis/components/DocumentAnalyzer';
import { DocumentCategory } from '../../../shared/types';
import { DocumentService } from '../../document-analysis/services/documentService';

type OffChainSection = 'nda' | 'upload' | 'ai';

const sectionOptions = [
  { id: 'nda', label: 'NDA Creation', icon: '📝', colorScheme: 'blue' },
  { id: 'upload', label: 'Document Upload', icon: '📁', colorScheme: 'green' },
  { id: 'ai', label: 'AI Review', icon: '🤖', colorScheme: 'purple' }
];

export const OffChainSpace: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<OffChainSection>('upload');
  const [selectedDocType, setSelectedDocType] = useState<DocumentCategory | undefined>();
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [availableCategories] = useState(DocumentService.getDocumentCategories());

  const handleSectionChange = (section: string) => {
    setSelectedSection(section as OffChainSection);
    setShowAnalyzer(false);
  };

  const handleDocTypeSelect = (type: DocumentCategory) => {
    setSelectedDocType(type);
    setShowAnalyzer(true);
  };

  const handleBackToCategories = () => {
    setShowAnalyzer(false);
    setSelectedDocType(undefined);
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
        showAnalyzer && selectedDocType ? (
          <DocumentAnalyzer
            category={selectedDocType}
            onBack={handleBackToCategories}
          />
        ) : (
          <FeatureCard
            title="Document Upload & Analysis"
            icon="📁"
            headerBg="green.50"
            alertStatus="success"
            alertMessage="Upload documents and get AI-powered analysis with specialized agents."
          >
            <VStack spacing={4} align="start">
              <Text fontWeight="bold">Select Document Type:</Text>
              <DocumentTypeSelector
                onTypeSelect={handleDocTypeSelect}
                selectedType={selectedDocType}
              />
            </VStack>
            
            <VStack spacing={4} align="stretch" p={6} bg="green.50" borderRadius="md">
              <Text fontWeight="bold" color="green.700">📂 Available Document Categories</Text>
              <Text color="green.600">
                Choose a document type above to start uploading and get specialized AI analysis.
              </Text>
              <VStack align="start" spacing={2}>
                {availableCategories.map((category) => (
                  <HStack key={category.id} spacing={2}>
                    <Text fontSize="lg">{category.icon}</Text>
                    <Text fontSize="sm" fontWeight="medium">{category.name}</Text>
                    <Badge colorScheme="blue" size="sm">
                      {category.agents.length} AI Agents
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </FeatureCard>
        )
      )}

      {/* AI Review Section */}
      {selectedSection === 'ai' && (
        showAnalyzer && selectedDocType ? (
          <DocumentAnalyzer
            category={selectedDocType}
            onBack={handleBackToCategories}
          />
        ) : (
          <FeatureCard
            title="AI Agent Review"
            icon="🤖"
            headerBg="purple.50"
            alertStatus="info"
            alertTitle="Expert AI Analysis"
            alertMessage="Select document type to access specialized AI agents for in-depth analysis."
          >
            <VStack spacing={4} align="start">
              <Text fontWeight="bold">Select Document Type for AI Review:</Text>
              <DocumentTypeSelector
                onTypeSelect={handleDocTypeSelect}
                selectedType={selectedDocType}
              />
            </VStack>
            
            <Badge colorScheme="purple" alignSelf="start">
              🎯 Specialized Expertise • 📊 Detailed Analysis • ⚡ Instant Results
            </Badge>
            
            <VStack spacing={4} align="stretch" p={6} bg="purple.50" borderRadius="md">
              <Text fontWeight="bold" color="purple.700">🤖 AI Agent Capabilities</Text>
              <Text color="purple.600">
                Our AI agents provide expert analysis tailored to your document type:
              </Text>
              
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between" p={3} border="1px" borderColor="blue.200" borderRadius="md" bg="blue.50">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Text>💼</Text>
                      <Text fontWeight="bold" fontSize="sm">Financial Analyst</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">Reviews financial projections, cap tables, and revenue models</Text>
                  </VStack>
                  <Badge colorScheme="blue" size="sm">Available</Badge>
                </HStack>
                
                <HStack justify="space-between" p={3} border="1px" borderColor="green.200" borderRadius="md" bg="green.50">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Text>⚖️</Text>
                      <Text fontWeight="bold" fontSize="sm">Legal Expert</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">Analyzes patents, contracts, and legal compliance</Text>
                  </VStack>
                  <Badge colorScheme="green" size="sm">Available</Badge>
                </HStack>
                
                <HStack justify="space-between" p={3} border="1px" borderColor="purple.200" borderRadius="md" bg="purple.50">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Text>🚀</Text>
                      <Text fontWeight="bold" fontSize="sm">Business Strategist</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">Evaluates pitch decks, business models, and market analysis</Text>
                  </VStack>
                  <Badge colorScheme="purple" size="sm">Available</Badge>
                </HStack>
                
                <HStack justify="space-between" p={3} border="1px" borderColor="orange.200" borderRadius="md" bg="orange.50">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Text>🔧</Text>
                      <Text fontWeight="bold" fontSize="sm">Technical Expert</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">Reviews technical specs, architecture, and innovation</Text>
                  </VStack>
                  <Badge colorScheme="orange" size="sm">Available</Badge>
                </HStack>
              </VStack>
            </VStack>
          </FeatureCard>
        )
      )}
    </VStack>
  );
};