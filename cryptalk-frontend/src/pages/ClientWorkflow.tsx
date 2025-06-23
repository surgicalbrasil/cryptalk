import React, { useState, useEffect } from 'react';
import {
  Box, 
  Grid, 
  GridItem, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Heading,
  Text,
  Badge,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Divider,
  VStack,
  Alert,
  AlertIcon,
  Button
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import Chat from './Chat';
import Payments from './Payments';
import FileUpload from '../components/FileUpload';
import AppConfig from '../config/AppConfig';
import paymentService from '../services/PaymentService';
import messagingService from '../services/MessagingService';
import WalletConnectionModal from '../components/WalletConnectionModal';
import UserProfile from '../components/UserProfile';
import { useWalletConnection } from '../hooks/useWalletConnection';

/**
 * ClientWorkflow page
 * This page implements the full client workflow:
 * 1. Chat and discuss services
 * 2. Make payment
 * 3. Upload files
 */
const ClientWorkflow: React.FC = () => {
  const { 
    did, 
    user, 
    isEmailAuthenticated, 
    isWalletConnected 
  } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [isMetaMaskUser, setIsMetaMaskUser] = useState(false);
  
  // Wallet connection hook for on-chain features
  const {
    isModalOpen: isWalletModalOpen,
    requireWalletConnection,
    handleWalletConnected,
    closeModal
  } = useWalletConnection({
    feature: 'secure payments and file storage'
  });
  
  // Check if user is logged in with MetaMask
  useEffect(() => {
    if (did) {
      const usingMetaMask = did.startsWith('did:eth:');
      setIsMetaMaskUser(usingMetaMask);
      console.log(`Client workflow: User authenticated with ${usingMetaMask ? 'MetaMask' : 'Web3.Storage DID'}`);
    }
  }, [did]);
  
  // Check for incoming payments
  useEffect(() => {
    // Listen for payments from the client
    const checkForPayments = async () => {
      const payments = paymentService.getTransactionsByRecipient(AppConfig.serviceProvider.walletAddress);
      const pendingPayments = payments.filter(p => p.status === 'completed');
      
      if (pendingPayments.length > 0) {
        setPaymentVerified(true);
        if (pendingPayments[0].txHash) {
          setPaymentTxHash(pendingPayments[0].txHash);
        }
        
        toast({
          title: 'Payment Received',
          description: 'Your payment has been verified. You can now upload files.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    };
    
    // Check once on load
    checkForPayments();
    
    // Set up interval to check periodically
    const interval = setInterval(checkForPayments, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [toast]);
  
  // Handle tab changes to enforce workflow
  const handleTabChange = (index: number) => {
    // Require wallet connection for On Chain tab, payments and file upload
    if ((index === 1 || index === 2 || index === 3) && !isWalletConnected) {
      requireWalletConnection(() => {
        setActiveTab(index);
      });
      return;
    }
    
    // Block access to file upload until payment is verified
    if (index === 3 && !paymentVerified) {
      toast({
        title: 'Payment Required',
        description: 'Please complete payment before uploading files',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setActiveTab(index);
  };
  
  // Handle successful payment
  const handlePaymentSuccess = (txHash: string) => {
    setPaymentVerified(true);
    setPaymentTxHash(txHash);
    
    toast({
      title: 'Payment Complete',
      description: 'Your payment has been processed. You can now upload files.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    // Automatically move to the file upload tab
    setTimeout(() => {
      setActiveTab(3);
    }, 1500);
  };
  
  // Handle successful upload
  const handleUploadSuccess = async (cid: string) => {
    // Send a message notifying about the file upload
    await messagingService.sendMessage(
      `File uploaded successfully with CID: ${cid}`,
      AppConfig.serviceProvider.did
    );
    
    toast({
      title: 'File Uploaded',
      description: 'Your file has been securely uploaded to Web3.Storage',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };
    return (
    <Box p={4}>
      <Heading mb={4}>Surgical Brasil Services</Heading>
      <Grid templateColumns="1fr auto" gap={2} mb={6}>
        <Text>Follow the steps below to complete your service request.</Text>
        <VStack spacing={2} align="end">
          {isEmailAuthenticated && user && (
            <Badge colorScheme="blue" display="flex" alignItems="center">
              <Box as="span" mr={1}>📧</Box> {user.email}
            </Badge>
          )}
          {isWalletConnected && user?.walletAddress ? (
            <Badge colorScheme="green" display="flex" alignItems="center">
              <Box as="span" mr={1}>🦊</Box> Wallet Connected ({user.walletAddress.substring(0, 6)}...)
            </Badge>
          ) : (
            <Badge colorScheme="yellow" display="flex" alignItems="center">
              <Box as="span" mr={1}>⚠️</Box> Wallet Required for On-Chain Features
            </Badge>
          )}
        </VStack>
      </Grid>
      
      <Tabs index={activeTab} onChange={handleTabChange} variant="enclosed" colorScheme={isMetaMaskUser ? "orange" : "blue"}>
        <TabList>
          <Tab>1. Chat &amp; Discuss</Tab>
          <Tab>2. On Chain</Tab>
          <Tab>3. Make Payment</Tab>
          <Tab isDisabled={!paymentVerified}>4. Upload Files</Tab>
        </TabList>
        
        <TabPanels>
          {/* Chat Panel */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Step 1: Discuss Service Details</Text>
                  <Text>Chat with Surgical Brasil to discuss service details. All messages are timestamped for your records.</Text>
                </Box>
              </Alert>
              
              <Card variant="outline">
                <CardHeader bg="gray.50" py={3}>
                  <Heading size="md">Chat with Surgical Brasil</Heading>
                </CardHeader>
                <CardBody p={0}>
                  <Chat />
                </CardBody>
              </Card>
              
              <Divider my={2} />
              
              <Button 
                colorScheme="blue" 
                onClick={() => handleTabChange(1)}
                width="200px"
                alignSelf="center"
              >
                Continue to On Chain
              </Button>
            </VStack>
          </TabPanel>
          
          {/* On Chain Tab Panel */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Step 2: On Chain Features</Text>
                  <Text>Access secure blockchain features including wallet connection, payments, and timestamped chat records.</Text>
                </Box>
              </Alert>

              {/* Wallet Connection Section */}
              <Card variant="outline">
                <CardHeader bg="green.50" py={3}>
                  <Heading size="md">🦊 Wallet Connection</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {isWalletConnected && user?.walletAddress ? (
                      <Alert status="success">
                        <AlertIcon />
                        <Box>
                          <Text fontWeight="bold">Wallet Connected</Text>
                          <Text fontSize="sm">Address: {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</Text>
                        </Box>
                      </Alert>
                    ) : (
                      <Alert status="warning">
                        <AlertIcon />
                        <Box>
                          <Text fontWeight="bold">Wallet Not Connected</Text>
                          <Text fontSize="sm">Connect your MetaMask wallet to access on-chain features</Text>
                        </Box>
                      </Alert>
                    )}
                    
                    {!isWalletConnected && (
                      <Button
                        colorScheme="orange"
                        onClick={() => requireWalletConnection(() => {})}
                        leftIcon={<Text>🦊</Text>}
                      >
                        Connect MetaMask Wallet
                      </Button>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* Payment Section */}
              {isWalletConnected && (
                <Card variant="outline">
                  <CardHeader bg="blue.50" py={3}>
                    <Heading size="md">💰 Secure Payment</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Text color="gray.600">
                        Make secure cryptocurrency payments directly from your wallet for premium services.
                      </Text>
                      <Button
                        colorScheme="blue"
                        onClick={() => handleTabChange(2)}
                        width="200px"
                      >
                        Go to Payment
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {/* Timestamped Chat Section */}
              {isWalletConnected && (
                <Card variant="outline">
                  <CardHeader bg="purple.50" py={3}>
                    <Heading size="md">⏰ Timestamped Secure Chat</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Text color="gray.600">
                        All messages in this chat are recorded on the blockchain with immutable timestamps for legal compliance and record keeping.
                      </Text>
                      
                      {/* On Chain Chat Component */}
                      <Box border="1px" borderColor="gray.200" borderRadius="md" p={4} minH="300px">
                        <Text fontSize="sm" color="gray.500" mb={3}>
                          🔐 On-Chain Secure Chat - All messages are encrypted and timestamped
                        </Text>
                        <Chat chatType="on-chain" />
                      </Box>
                      
                      <Alert status="info" size="sm">
                        <AlertIcon />
                        <Text fontSize="sm">
                          Messages sent here are encrypted, stored on Polygon blockchain, and can be used as legal records.
                        </Text>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              <Divider my={2} />
              
              {isWalletConnected && (
                <Button 
                  colorScheme="blue" 
                  onClick={() => handleTabChange(2)}
                  width="200px"
                  alignSelf="center"
                >
                  Continue to Payment
                </Button>
              )}
            </VStack>
          </TabPanel>
          
          {/* Payment Panel */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Step 3: Complete Payment</Text>
                  {isMetaMaskUser ? (
                    <Text>Send cryptocurrency payment to Surgical Brasil's wallet address using your connected MetaMask wallet. Once payment is verified, you can upload files.</Text>
                  ) : (
                    <Text>Send cryptocurrency payment to Surgical Brasil's wallet address. Once payment is verified, you can upload files.</Text>
                  )}
                </Box>
              </Alert>
              
              <Card variant="outline">
                <CardHeader bg="gray.50" py={3}>
                  <Heading size="md">Make Payment</Heading>
                </CardHeader>
                <CardBody>
                  <Payments onPaymentSuccess={handlePaymentSuccess} />
                </CardBody>
              </Card>
              
              {paymentVerified && (
                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Payment Complete</Text>
                    <Text>Your payment has been verified. You can now proceed to file upload.</Text>
                    {paymentTxHash && (
                      <Text fontSize="sm" mt={1}>Transaction Hash: {paymentTxHash}</Text>
                    )}
                  </Box>
                </Alert>
              )}
              
              <Divider my={2} />
              
              {paymentVerified && (
                <Button 
                  colorScheme="blue" 
                  onClick={() => handleTabChange(3)}
                  width="200px"
                  alignSelf="center"
                >
                  Continue to File Upload
                </Button>
              )}
            </VStack>
          </TabPanel>
          
          {/* File Upload Panel */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Step 4: Upload Files</Text>
                  <Text>Upload files securely to Web3.Storage. Files are encrypted and accessible only by you and Surgical Brasil.</Text>
                </Box>
              </Alert>
              
              <Card variant="outline">
                <CardHeader bg="gray.50" py={3}>
                  <Heading size="md">Upload Files</Heading>
                </CardHeader>
                <CardBody>
                  <FileUpload 
                    paymentRequired={false} 
                    recipientDID={AppConfig.serviceProvider.did}
                    onUploadSuccess={handleUploadSuccess}
                  />
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={isWalletModalOpen}
        onClose={closeModal}
        feature="secure payments and file storage"
        onSuccess={handleWalletConnected}
      />
    </Box>
  );
};

export default ClientWorkflow;
