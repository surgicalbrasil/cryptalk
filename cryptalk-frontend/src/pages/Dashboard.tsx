import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  Button,
  Card,
  CardBody,
  CardHeader,
  Stack,
  Badge,
  Icon,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Alert,
  AlertIcon,
  Divider,
  useToast
} from '@chakra-ui/react';
import { FiFileText, FiUpload, FiUsers, FiShield, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWalletConnection } from '../hooks/useWalletConnection';
import WalletConnectionModal from '../components/WalletConnectionModal';
import UserProfile from '../components/UserProfile';

const Dashboard: React.FC = () => {
  const { 
    user, 
    isEmailAuthenticated, 
    isWalletConnected 
  } = useAuth();
  const navigate = useNavigate();
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [activeOnChainSection, setActiveOnChainSection] = useState<'wallet' | 'payment' | 'chat'>('wallet');
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Wallet connection hook
  const {
    isModalOpen: isWalletModalOpen,
    requireWalletConnection,
    handleWalletConnected,
    closeModal
  } = useWalletConnection({
    feature: 'on-chain features'
  });

  const handleOnChainSectionChange = (section: 'wallet' | 'payment' | 'chat') => {
    setActiveOnChainSection(section);
  };

  const documentTypes = [
    { id: 'pitch', name: 'Pitch Deck', icon: FiFileText, color: 'blue' },
    { id: 'financial', name: 'Financial Projections', icon: FiFileText, color: 'green' },
    { id: 'patent', name: 'Patents', icon: FiShield, color: 'purple' },
    { id: 'captable', name: 'Cap Table', icon: FiUsers, color: 'orange' },
    { id: 'other', name: 'Other Documents', icon: FiFileText, color: 'gray' }
  ];

  return (
    <Box maxW="1400px" mx="auto" p={6} bg={bgColor} minH="calc(100vh - 64px)">

      {/* Main Tabs: Off Chain Space and On Chain Space */}
      <Tabs size="lg" variant="enclosed" colorScheme="blue" defaultIndex={0}>
        <TabList mb={4}>
          <Tab fontSize="lg" fontWeight="semibold">
            📁 Off Chain Space
          </Tab>
          <Tab fontSize="lg" fontWeight="semibold">
            ⛓️ On Chain Space
          </Tab>
        </TabList>

        <TabPanels>
          {/* OFF CHAIN SPACE TAB */}
          <TabPanel p={0}>
            <VStack spacing={1} mb={6} align="start">
              <Heading as="h2" size="xl" color="gray.800">
                Data Room
              </Heading>
              <Text fontSize="md" color="gray.600">
                Create NDAs, upload documents, and manage secure file sharing with AI-powered review
              </Text>
            </VStack>

            <Tabs size="md" variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>📝 NDA Creation</Tab>
                <Tab>📁 Document Upload</Tab>
                <Tab>🤖 AI Review</Tab>
              </TabList>

              <TabPanels>
                {/* NDA Creation Tab */}
                <TabPanel>
                  <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
                    <GridItem>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <HStack>
                            <Icon as={FiFileText} color="blue.500" boxSize={6} />
                            <Heading size="lg">Create Custom NDA</Heading>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <Text color="gray.600">
                              Generate a customized Non-Disclosure Agreement using AI based on your specific requirements.
                            </Text>
                            <Button 
                              colorScheme="blue" 
                              size="lg"
                              leftIcon={<FiFileText />}
                              rightIcon={<FiChevronRight />}
                            >
                              Start NDA Creation
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    </GridItem>
                    
                    <GridItem>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <Heading size="md">Recent NDAs</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Text fontSize="sm" color="gray.500">
                              No NDAs created yet
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    </GridItem>
                  </Grid>
                </TabPanel>

                {/* Document Upload Tab */}
                <TabPanel>
                  <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
                    <GridItem>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <HStack>
                            <Icon as={FiUpload} color="green.500" boxSize={6} />
                            <Heading size="lg">Upload Documents</Heading>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <Text color="gray.600" mb={4}>
                              Select document type and upload your files securely
                            </Text>
                            
                            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={3}>
                              {documentTypes.map((type) => (
                                <Button
                                  key={type.id}
                                  variant={selectedDocType === type.id ? 'solid' : 'outline'}
                                  colorScheme={type.color}
                                  leftIcon={<Icon as={type.icon} />}
                                  onClick={() => setSelectedDocType(type.id)}
                                  size="sm"
                                >
                                  {type.name}
                                </Button>
                              ))}
                            </Grid>
                            
                            {selectedDocType && (
                              <Button 
                                colorScheme="green" 
                                size="lg"
                                leftIcon={<FiUpload />}
                              >
                                Upload Files
                              </Button>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    </GridItem>
                    
                    <GridItem>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <Heading size="md">Uploaded Documents</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Text fontSize="sm" color="gray.500">
                              No documents uploaded yet
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    </GridItem>
                  </Grid>
                </TabPanel>

                {/* AI Review Tab */}
                <TabPanel>
                  <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
                    <GridItem>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <HStack>
                            <Icon as={FiUsers} color="purple.500" boxSize={6} />
                            <Heading size="lg">AI Agent Review</Heading>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <Text color="gray.600">
                              Select AI personas to review your documents based on expertise areas
                            </Text>
                            
                            <Stack spacing={3}>
                              <HStack justify="space-between" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="semibold">Financial Analyst</Text>
                                  <Text fontSize="sm" color="gray.600">Reviews financial projections and cap tables</Text>
                                </VStack>
                                <Badge colorScheme="blue">Available</Badge>
                              </HStack>
                              
                              <HStack justify="space-between" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="semibold">Legal Expert</Text>
                                  <Text fontSize="sm" color="gray.600">Reviews patents and legal documents</Text>
                                </VStack>
                                <Badge colorScheme="green">Available</Badge>
                              </HStack>
                              
                              <HStack justify="space-between" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="semibold">Business Strategist</Text>
                                  <Text fontSize="sm" color="gray.600">Reviews pitch decks and business plans</Text>
                                </VStack>
                                <Badge colorScheme="purple">Available</Badge>
                              </HStack>
                            </Stack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </GridItem>
                    
                    <GridItem>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <Heading size="md">Review Results</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Text fontSize="sm" color="gray.500">
                              No reviews completed yet
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    </GridItem>
                  </Grid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </TabPanel>

          {/* ON CHAIN SPACE TAB - ORIGINAL FUNCTIONALITY */}
          <TabPanel p={0}>
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

            {/* Navigation Tabs */}
            <HStack spacing={4} mb={6} justify="center">
              <Button
                leftIcon={<Text>🦊</Text>}
                colorScheme={activeOnChainSection === 'wallet' ? 'green' : 'gray'}
                variant={activeOnChainSection === 'wallet' ? 'solid' : 'outline'}
                onClick={() => handleOnChainSectionChange('wallet')}
              >
                Connect Wallet
              </Button>
              
              <Button
                leftIcon={<Text>💰</Text>}
                colorScheme={activeOnChainSection === 'payment' ? 'blue' : 'gray'}
                variant={activeOnChainSection === 'payment' ? 'solid' : 'outline'}
                onClick={() => handleOnChainSectionChange('payment')}
              >
                Payments
              </Button>
              
              <Button
                leftIcon={<Text>⏰</Text>}
                colorScheme={activeOnChainSection === 'chat' ? 'purple' : 'gray'}
                variant={activeOnChainSection === 'chat' ? 'solid' : 'outline'}
                onClick={() => handleOnChainSectionChange('chat')}
              >
                Timestamped Chat
              </Button>
            </HStack>

            {/* Content Sections */}
            {activeOnChainSection === 'wallet' && (
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

            {activeOnChainSection === 'payment' && (
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
                    
                    {/* Payment placeholder - will be restored when Payments component is fixed */}
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
                  </VStack>
                </CardBody>
              </Card>
            )}

            {activeOnChainSection === 'chat' && (
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
                    
                    {/* Chat placeholder - will be restored when Chat component is fixed */}
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
                  </VStack>
                </CardBody>
              </Card>
            )}
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

export default Dashboard;