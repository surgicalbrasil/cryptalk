import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Divider,
  Icon,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import WalletConnectionModal from './WalletConnectionModal';

const UserProfile: React.FC = () => {
  const { 
    user, 
    isEmailAuthenticated, 
    isWalletConnected,
    disconnectWallet,
    logout
  } = useAuth();
  
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    toast({
      title: 'Wallet disconnected',
      description: 'Your wallet has been disconnected. You can still use off-chain features.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'Failed to logout properly',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
    onClose();
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <>
      <Card maxW="md" mx="auto">
        <CardHeader>
          <Heading size="md">Account Profile</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Email Authentication Section */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold">Email Authentication</Text>
                {isEmailAuthenticated ? (
                  <Badge colorScheme="green" variant="subtle">
                    <HStack spacing={1}>
                      <CheckCircleIcon boxSize={3} />
                      <Text>Connected</Text>
                    </HStack>
                  </Badge>
                ) : (
                  <Badge colorScheme="red" variant="subtle">
                    <HStack spacing={1}>
                      <WarningIcon boxSize={3} />
                      <Text>Not Connected</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
              
              {user && (
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" color="blue.700">
                    📧 {user.email}
                  </Text>
                </Box>
              )}
              
              <Text fontSize="xs" color="gray.500" mt={1}>
                Email authentication provides access to general platform features and off-chain chat.
              </Text>
            </Box>

            <Divider />

            {/* Wallet Connection Section */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold">Wallet Connection</Text>
                {isWalletConnected ? (
                  <Badge colorScheme="green" variant="subtle">
                    <HStack spacing={1}>
                      <CheckCircleIcon boxSize={3} />
                      <Text>Connected</Text>
                    </HStack>
                  </Badge>
                ) : (
                  <Badge colorScheme="yellow" variant="subtle">
                    <HStack spacing={1}>
                      <WarningIcon boxSize={3} />
                      <Text>Optional</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
              
              {isWalletConnected && user?.walletAddress ? (
                <Box p={3} bg="green.50" borderRadius="md" mb={2}>
                  <Text fontSize="sm" color="green.700">
                    🦊 {formatAddress(user.walletAddress)}
                  </Text>
                </Box>
              ) : (
                <Box p={3} bg="yellow.50" borderRadius="md" mb={2}>
                  <Text fontSize="sm" color="yellow.700">
                    🔗 No wallet connected
                  </Text>
                </Box>
              )}
              
              <Text fontSize="xs" color="gray.500" mb={3}>
                Wallet connection is required for on-chain features like secure medical document storage and cryptocurrency payments.
              </Text>
              
              {isWalletConnected ? (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  onClick={handleDisconnectWallet}
                >
                  Disconnect Wallet
                </Button>
              ) : (
                <Button
                  size="sm"
                  colorScheme="orange"
                  onClick={handleConnectWallet}
                >
                  Connect Wallet
                </Button>
              )}
            </Box>

            <Divider />

            {/* Feature Access Summary */}
            <Box>
              <Text fontWeight="bold" mb={2}>Feature Access</Text>
              <VStack spacing={2} align="start" fontSize="sm">
                <HStack>
                  <CheckCircleIcon color="green.500" boxSize={4} />
                  <Text>Off-chain messaging</Text>
                </HStack>
                <HStack>
                  <CheckCircleIcon color="green.500" boxSize={4} />
                  <Text>Basic file sharing</Text>
                </HStack>
                <HStack>
                  {isWalletConnected ? (
                    <CheckCircleIcon color="green.500" boxSize={4} />
                  ) : (
                    <WarningIcon color="yellow.500" boxSize={4} />
                  )}
                  <Text color={isWalletConnected ? "inherit" : "gray.500"}>
                    On-chain secure storage
                  </Text>
                </HStack>
                <HStack>
                  {isWalletConnected ? (
                    <CheckCircleIcon color="green.500" boxSize={4} />
                  ) : (
                    <WarningIcon color="yellow.500" boxSize={4} />
                  )}
                  <Text color={isWalletConnected ? "inherit" : "gray.500"}>
                    Cryptocurrency payments
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            {/* Logout Button */}
            <Button
              colorScheme="gray"
              variant="outline"
              onClick={onOpen}
              size="sm"
            >
              Logout
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        feature="secure storage and payments"
        onSuccess={() => {
          setIsWalletModalOpen(false);
          toast({
            title: 'Wallet connected',
            description: 'You now have access to all platform features',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }}
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Logout
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to logout? You will need to authenticate again to access the platform.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleLogout} ml={3}>
                Logout
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default UserProfile;