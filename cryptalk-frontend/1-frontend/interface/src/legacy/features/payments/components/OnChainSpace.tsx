import React, { useState } from 'react';
import {
  VStack,
  Heading,
  Text,
  HStack,
  Badge,
  Alert,
  AlertIcon,
  Button,
  Divider,
  Box,
  useToast
} from '@chakra-ui/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useWalletConnection } from '../../../hooks/useWalletConnection';
import { SectionTabs } from '../../../shared/components/Navigation/SectionTabs';
import { FeatureCard } from '../../../shared/components/Layout/FeatureCard';
import UserProfile from '../../../components/UserProfile';

type OnChainSection = 'wallet' | 'payment' | 'chat';

const sectionOptions = [
  { id: 'wallet', label: 'Connect Wallet', icon: '🦊', colorScheme: 'green' },
  { id: 'payment', label: 'Payments', icon: '💰', colorScheme: 'blue' },
  { id: 'chat', label: 'Timestamped Chat', icon: '⏰', colorScheme: 'purple' }
];

export const OnChainSpace: React.FC = () => {
  const { user, isEmailAuthenticated, isWalletConnected } = useAuth();
  const [activeSection, setActiveSection] = useState<OnChainSection>('wallet');
  const toast = useToast();

  const {
    isModalOpen: isWalletModalOpen,
    requireWalletConnection,
    handleWalletConnected,
    closeModal
  } = useWalletConnection({
    feature: 'on-chain features'
  });

  const handleSectionChange = (section: string) => {
    setActiveSection(section as OnChainSection);
  };

  const handleConnectWallet = () => {
    requireWalletConnection(() => {
      toast({
        title: 'Wallet Connected',
        description: 'You can now access all on-chain features',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <VStack spacing={4} mb={8}>
        <Heading size="lg">⛓️ On Chain Features</Heading>
        <Text color="gray.600" maxW="2xl" textAlign="center">
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

      {/* Navigation */}
      <SectionTabs
        options={sectionOptions}
        activeTab={activeSection}
        onTabChange={handleSectionChange}
      />

      {/* Wallet Connection Section */}
      {activeSection === 'wallet' && (
        <FeatureCard
          title="Wallet Connection"
          icon="🦊"
          headerBg="green.50"
          alertStatus={isWalletConnected ? 'success' : 'warning'}
          alertTitle={isWalletConnected ? 'Wallet Successfully Connected' : 'Wallet Not Connected'}
          alertMessage={
            isWalletConnected && user?.walletAddress
              ? `Address: ${user.walletAddress}\nNetwork: Polygon Mumbai Testnet`
              : 'Connect your MetaMask wallet to access blockchain features'
          }
          actionButton={!isWalletConnected ? {
            text: 'Connect MetaMask Wallet',
            colorScheme: 'orange',
            icon: '🦊',
            onClick: handleConnectWallet
          } : undefined}
        >
          <VStack spacing={4} align="start">
            <Text fontWeight="bold">Why Connect Your Wallet?</Text>
            <VStack spacing={2} align="start" pl={4}>
              <Text fontSize="sm">• 🔒 Secure cryptocurrency payments</Text>
              <Text fontSize="sm">• 📝 Immutable message timestamps</Text>
              <Text fontSize="sm">• 🗂️ Encrypted file storage on blockchain</Text>
              <Text fontSize="sm">• ⚖️ Legal compliance and audit trails</Text>
            </VStack>
          </VStack>

          <Divider />
          <UserProfile />
        </FeatureCard>
      )}

      {/* Payment Section */}
      {activeSection === 'payment' && (
        <FeatureCard
          title="Secure Payments"
          icon="💰"
          headerBg="blue.50"
          alertStatus="info"
          alertMessage="Make secure cryptocurrency payments using your connected wallet."
        >
          <VStack spacing={4} align="stretch" p={6} bg="blue.50" borderRadius="md">
            <Text fontWeight="bold" color="blue.700">💰 Crypto Payment System</Text>
            <Text color="blue.600">
              Send and receive cryptocurrency payments with your connected MetaMask wallet.
              All transactions are recorded on the Polygon blockchain for transparency.
            </Text>
            <Button colorScheme="blue" size="lg" isDisabled>
              Payment System (Coming Soon)
            </Button>
          </VStack>
        </FeatureCard>
      )}

      {/* Timestamped Chat Section */}
      {activeSection === 'chat' && (
        <FeatureCard
          title="Timestamped Secure Chat"
          icon="⏰"
          headerBg="purple.50"
          alertStatus="info"
          alertTitle="Blockchain-Recorded Messages"
          alertMessage="All messages are encrypted, timestamped, and stored on Polygon blockchain for immutable record keeping and legal compliance."
        >
          <Badge colorScheme="purple" alignSelf="start">
            🔐 End-to-End Encrypted • ⏰ Immutable Timestamps • ⛓️ Blockchain Verified
          </Badge>
          
          <Box border="2px" borderColor="purple.200" borderRadius="md" p={6}>
            <VStack spacing={4} align="stretch">
              <Text fontWeight="bold" color="purple.700">⏰ Blockchain Chat System</Text>
              <Text color="purple.600">
                Send encrypted messages that are permanently timestamped and recorded on the blockchain.
                Perfect for legal compliance and immutable communication records.
              </Text>
              <HStack>
                <Button colorScheme="purple" size="lg" isDisabled>
                  Chat Interface (Coming Soon)
                </Button>
                <Button colorScheme="gray" variant="outline" size="lg" isDisabled>
                  📎 Upload Files
                </Button>
              </HStack>
            </VStack>
          </Box>
          
          <Alert status="warning" size="sm">
            <AlertIcon />
            <Text fontSize="sm">
              ⚠️ Messages sent here are permanent and cannot be deleted. 
              They will be stored on the blockchain forever.
            </Text>
          </Alert>
        </FeatureCard>
      )}
    </VStack>
  );
};