import React, { useEffect, useState } from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Text,
  VStack
} from '@chakra-ui/react';
// import { OffChainSpace } from '../features/storage/components/OffChainSpace';
import { OnChainSpace } from '../features/payments/components/OnChainSpace';
import DocumentAnalysis from '../components/DocumentAnalysis';
import WalletConnectionModal from '../components/WalletConnectionModal';
import { useWalletConnection } from '../hooks/useWalletConnection';
import CrypTalk from '../index';

const ModularDashboard: React.FC = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const [cryptalkReady, setCryptalkReady] = useState(false);
  const [cryptalkError, setCryptalkError] = useState<string | null>(null);

  const {
    isModalOpen: isWalletModalOpen,
    handleWalletConnected,
    closeModal
  } = useWalletConnection({
    feature: 'on-chain features'
  });

  // Initialize CrypTalk system
  useEffect(() => {
    const initCrypTalk = async () => {
      try {
        console.log('🚀 Initializing CrypTalk modular system...');
        const result = await CrypTalk.initialize();
        
        if (result.success) {
          setCryptalkReady(true);
          console.log('✅ CrypTalk system ready with modules:', result.modules);
        } else {
          setCryptalkError('Failed to initialize CrypTalk system');
        }
      } catch (error) {
        console.error('❌ CrypTalk initialization error:', error);
        setCryptalkError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initCrypTalk();
  }, []);

  // Show loading state while CrypTalk initializes
  if (!cryptalkReady && !cryptalkError) {
    return (
      <Box maxW="1400px" mx="auto" p={6} bg={bgColor} minH="calc(100vh - 64px)">
        <VStack spacing={4} justify="center" minH="400px">
          <Spinner size="xl" color="blue.500" />
          <Text fontSize="lg" color="gray.600">
            🚀 Initializing CrypTalk Modular System...
          </Text>
          <Text fontSize="sm" color="gray.500">
            Loading Storage, Chat, and Payment modules
          </Text>
        </VStack>
      </Box>
    );
  }

  // Show error state if initialization failed
  if (cryptalkError) {
    return (
      <Box maxW="1400px" mx="auto" p={6} bg={bgColor} minH="calc(100vh - 64px)">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">Failed to initialize CrypTalk system</Text>
            <Text fontSize="sm">{cryptalkError}</Text>
          </VStack>
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxW="1400px" mx="auto" p={6} bg={bgColor} minH="calc(100vh - 64px)">
      {/* System Ready Banner */}
      <Alert status="success" mb={4} borderRadius="md">
        <AlertIcon />
        <Text fontWeight="bold">
          🎉 CrypTalk Modular System Ready! Ultra-modular architecture with beautiful UI.
        </Text>
      </Alert>

      {/* Main Tabs: Off Chain Space and On Chain Space */}
      <Tabs size="lg" variant="enclosed" colorScheme="blue" defaultIndex={0}>
        <TabList mb={4}>
          <Tab fontSize="lg" fontWeight="semibold">
            📄 Document Analysis
          </Tab>
          <Tab fontSize="lg" fontWeight="semibold">
            ⛓️ On Chain Space
          </Tab>
        </TabList>

        <TabPanels>
          {/* DOCUMENT ANALYSIS TAB */}
          <TabPanel p={0}>
            <DocumentAnalysis />
          </TabPanel>

          {/* ON CHAIN SPACE TAB */}
          <TabPanel p={0}>
            <OnChainSpace />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={isWalletModalOpen}
        onClose={closeModal}
        feature="on-chain features"
        onSuccess={handleWalletConnected}
      />
    </Box>
  );
};

export default ModularDashboard;