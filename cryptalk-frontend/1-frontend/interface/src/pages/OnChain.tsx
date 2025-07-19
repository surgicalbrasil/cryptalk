import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Button,
  Alert,
  AlertIcon,
  Divider,
  Badge,
  useToast,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useWalletConnection } from '../hooks/useWalletConnection';
import WalletConnectionModal from '../components/WalletConnectionModal';
import UserProfile from '../components/UserProfile';
// Chat and Payments components temporarily removed - using placeholders

const OnChain: React.FC = () => {
  const { 
    user, 
    isEmailAuthenticated, 
    isWalletConnected 
  } = useAuth();
  
  const [activeSection, setActiveSection] = useState<'wallet' | 'payment' | 'chat'>('wallet');
  const toast = useToast();

  // Wallet connection hook
  const {
    isModalOpen: isWalletModalOpen,
    requireWalletConnection,
    handleWalletConnected,
    closeModal
  } = useWalletConnection({
    feature: 'on-chain features'
  });

  const handleSectionChange = (section: 'wallet' | 'payment' | 'chat') => {
    if (section !== 'wallet' && !isWalletConnected) {
      requireWalletConnection(() => {
        setActiveSection(section);
      });
      return;
    }
    setActiveSection(section);
  };

  if (!isEmailAuthenticated) {
    return (
      <Box p={8} textAlign="center">
        <Alert status="warning" maxW="md" mx="auto">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Authentication Required</Text>
            <Text>Please login with your email to access On Chain features.</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="7xl" mx="auto">
      {/* Header */}
      <VStack spacing={4} mb={8} textAlign="center">
        <Heading size="lg">⛓️ On Chain Features</Heading>
        <Text color="gray.600" maxW="2xl">
          Access secure blockchain features including wallet management, cryptocurrency payments, 
          and timestamped chat records stored on Polygon blockchain.
        </Text>
        
        {/* Status Badges */}
        <HStack spacing={3}>
          {user && (
            <Badge colorScheme="blue" p={2}>
              📧 {user.email}
            </Badge>
          )}
          {isWalletConnected && user?.walletAddress ? (
            <Badge colorScheme="green" p={2}>
              🦊 {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
            </Badge>
          ) : (
            <Badge colorScheme="yellow" p={2}>
              ⚠️ Wallet Required
            </Badge>
          )}
        </HStack>
      </VStack>

      {/* Navigation Tabs */}
      <HStack spacing={4} mb={6} justify="center">
        <Button
          leftIcon={<Text>🦊</Text>}
          colorScheme={activeSection === 'wallet' ? 'green' : 'gray'}
          variant={activeSection === 'wallet' ? 'solid' : 'outline'}
          onClick={() => handleSectionChange('wallet')}
        >
          Connect Wallet
        </Button>
        
        <Button
          leftIcon={<Text>💰</Text>}
          colorScheme={activeSection === 'payment' ? 'blue' : 'gray'}
          variant={activeSection === 'payment' ? 'solid' : 'outline'}
          onClick={() => handleSectionChange('payment')}
          isDisabled={!isWalletConnected}
        >
          Payments
        </Button>
        
        <Button
          leftIcon={<Text>⏰</Text>}
          colorScheme={activeSection === 'chat' ? 'purple' : 'gray'}
          variant={activeSection === 'chat' ? 'solid' : 'outline'}
          onClick={() => handleSectionChange('chat')}
          isDisabled={!isWalletConnected}
        >
          Timestamped Chat
        </Button>
      </HStack>

      {/* Content Sections */}
      {activeSection === 'wallet' && (
        <Card>
          <CardHeader bg="green.50">
            <Heading size="md">🦊 Wallet Connection</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              {isWalletConnected && user?.walletAddress ? (
                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Wallet Successfully Connected</Text>
                    <Text fontSize="sm">Address: {user.walletAddress}</Text>
                    <Text fontSize="sm" color="gray.600">Network: Polygon Mumbai Testnet</Text>
                  </Box>
                </Alert>
              ) : (
                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Wallet Not Connected</Text>
                    <Text fontSize="sm">Connect your MetaMask wallet to access blockchain features</Text>
                  </Box>
                </Alert>
              )}

              <VStack spacing={4} align="start">
                <Text fontWeight="bold">Why Connect Your Wallet?</Text>
                <VStack spacing={2} align="start" pl={4}>
                  <Text fontSize="sm">• 🔒 Secure cryptocurrency payments</Text>
                  <Text fontSize="sm">• 📝 Immutable message timestamps</Text>
                  <Text fontSize="sm">• 🗂️ Encrypted file storage on blockchain</Text>
                  <Text fontSize="sm">• ⚖️ Legal compliance and audit trails</Text>
                </VStack>
              </VStack>

              {!isWalletConnected && (
                <Button
                  colorScheme="orange"
                  size="lg"
                  onClick={() => requireWalletConnection(() => {
                    toast({
                      title: 'Wallet Connected',
                      description: 'You can now access all on-chain features',
                      status: 'success',
                      duration: 3000,
                      isClosable: true,
                    });
                  })}
                  leftIcon={<Text>🦊</Text>}
                >
                  Connect MetaMask Wallet
                </Button>
              )}

              {/* User Profile Component */}
              <Divider />
              <UserProfile />
            </VStack>
          </CardBody>
        </Card>
      )}

      {activeSection === 'payment' && isWalletConnected && (
        <Card>
          <CardHeader bg="blue.50">
            <Heading size="md">💰 Secure Payments</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Text>Make secure cryptocurrency payments using your connected wallet.</Text>
              </Alert>
              {/* Payments component placeholder */}
              <VStack spacing={4} align="stretch" p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" textAlign="center">💰 Payment Features</Text>
                <Text textAlign="center" color="gray.600">
                  Payment functionality is currently being updated.
                </Text>
                <Text fontSize="sm" textAlign="center" color="gray.500">
                  This section will allow secure cryptocurrency payments once the payment component is restored.
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      )}

      {activeSection === 'chat' && isWalletConnected && (
        <Card>
          <CardHeader bg="purple.50">
            <Heading size="md">⏰ Timestamped Secure Chat</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Blockchain-Recorded Messages</Text>
                  <Text fontSize="sm">
                    All messages are encrypted, timestamped, and stored on Polygon blockchain 
                    for immutable record keeping and legal compliance.
                  </Text>
                </Box>
              </Alert>
              
              <Badge colorScheme="purple" alignSelf="start">
                🔐 End-to-End Encrypted • ⏰ Immutable Timestamps • ⛓️ Blockchain Verified
              </Badge>
              
              <Box border="2px" borderColor="purple.200" borderRadius="md" p={4}>
                {/* Chat component placeholder */}
                <VStack spacing={4} align="stretch" p={4} bg="purple.50" borderRadius="md">
                  <Text fontWeight="bold" textAlign="center">⏰ Timestamped Chat</Text>
                  <Text textAlign="center" color="gray.600">
                    Blockchain-recorded chat functionality is currently being restored.
                  </Text>
                  <VStack spacing={2} align="start" fontSize="sm" color="gray.500">
                    <Text>• 🔐 End-to-end encrypted messaging</Text>
                    <Text>• ⏰ Immutable blockchain timestamps</Text>
                    <Text>• ⛓️ Polygon network verification</Text>
                    <Text>• 🗂️ Permanent message storage</Text>
                  </VStack>
                  <Text fontSize="xs" textAlign="center" color="gray.400" fontStyle="italic">
                    This feature will be available once the chat component is restored.
                  </Text>
                </VStack>
              </Box>
              
              <Alert status="warning" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  ⚠️ Messages sent here are permanent and cannot be deleted. 
                  They will be stored on the blockchain forever.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      )}

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

export default OnChain;