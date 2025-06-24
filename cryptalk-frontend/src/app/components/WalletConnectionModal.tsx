import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Box,
  Alert,
  AlertIcon,
  useToast,
  Flex,
  Icon
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string; // Name of the feature requiring wallet connection
  onSuccess?: () => void; // Callback when wallet is successfully connected
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  feature = 'on-chain features',
  onSuccess
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(!!window.ethereum);
  const { connectWallet, isWalletConnected, user } = useAuth();
  const toast = useToast();

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: 'MetaMask not found',
        description: 'Please install MetaMask extension to continue',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsConnecting(true);
      const result = await connectWallet();

      if (result.success) {
        toast({
          title: 'Wallet connected',
          description: 'Your wallet has been successfully connected',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        throw new Error(result.error || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Connect Wallet Required</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box textAlign="center">
              <Flex direction="column" align="center" justify="center" mb={4}>
                <Box p={4} borderRadius="full" bg="orange.50" mb={2}>
                  <Text fontSize="3xl">🦊</Text>
                </Box>
                <Text fontSize="lg" fontWeight="bold">
                  Wallet Connection Required
                </Text>
              </Flex>
              
              <Text color="gray.600" mb={4}>
                To access {feature}, you need to connect your MetaMask wallet for secure blockchain transactions.
              </Text>
              
              {user && (
                <Box p={3} bg="blue.50" borderRadius="md" mb={4}>
                  <Text fontSize="sm" color="blue.700">
                    📧 Logged in as: {user.email}
                  </Text>
                </Box>
              )}
            </Box>

            {!isMetaMaskInstalled && (
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm">
                    MetaMask is not installed. Please install it first.
                  </Text>
                  <Button
                    as="a"
                    href="https://metamask.io"
                    target="_blank"
                    size="sm"
                    colorScheme="blue"
                    variant="link"
                    mt={1}
                    rightIcon={<ExternalLinkIcon />}
                  >
                    Install MetaMask
                  </Button>
                </Box>
              </Alert>
            )}

            <VStack spacing={2} fontSize="sm" color="gray.600" textAlign="left">
              <Text fontWeight="bold">Why do I need to connect my wallet?</Text>
              <VStack spacing={1} align="start" pl={4}>
                <Text>• Secure medical document storage on blockchain</Text>
                <Text>• Cryptocurrency payments and transactions</Text>
                <Text>• Access to premium encrypted features</Text>
                <Text>• Immutable record keeping</Text>
              </VStack>
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <VStack spacing={3} w="full">
            <Button
              colorScheme="orange"
              size="lg"
              width="full"
              onClick={handleConnectWallet}
              isLoading={isConnecting}
              loadingText="Connecting..."
              disabled={!isMetaMaskInstalled}
            >
              {isMetaMaskInstalled ? 'Connect MetaMask' : 'Install MetaMask First'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WalletConnectionModal;