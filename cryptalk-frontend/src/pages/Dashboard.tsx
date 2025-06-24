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
          {/* OFF CHAIN SPACE TAB - ON CHAIN STYLE DESIGN */}
          <TabPanel p={0}>
            <VStack spacing={4} mb={8}>
              <Heading size="lg">📁 Off Chain Features</Heading>
              <Text color="gray.600" maxW="2xl" textAlign="center">
                Create NDAs, upload documents, and manage secure file sharing with AI-powered review.
                All operations are performed off-chain for fast and free document management.
              </Text>
              
              {/* Status Badges */}
              <HStack spacing={3}>
                <Badge colorScheme="blue" p={2}>
                  📝 NDA Ready
                </Badge>
                <Badge colorScheme="green" p={2}>
                  📁 Upload Ready
                </Badge>
                <Badge colorScheme="purple" p={2}>
                  🤖 AI Ready
                </Badge>
              </HStack>
            </VStack>

            {/* Navigation Tabs */}
            <HStack spacing={4} mb={6} justify="center">
              <Button
                leftIcon={<Text>📝</Text>}
                colorScheme={selectedDocType === 'nda' ? 'blue' : 'gray'}
                variant={selectedDocType === 'nda' ? 'solid' : 'outline'}
                onClick={() => setSelectedDocType('nda')}
              >
                NDA Creation
              </Button>
              
              <Button
                leftIcon={<Text>📁</Text>}
                colorScheme={selectedDocType === 'upload' ? 'green' : 'gray'}
                variant={selectedDocType === 'upload' ? 'solid' : 'outline'}
                onClick={() => setSelectedDocType('upload')}
              >
                Document Upload
              </Button>
              
              <Button
                leftIcon={<Text>🤖</Text>}
                colorScheme={selectedDocType === 'ai' ? 'purple' : 'gray'}
                variant={selectedDocType === 'ai' ? 'solid' : 'outline'}
                onClick={() => setSelectedDocType('ai')}
              >
                AI Review
              </Button>
            </HStack>

            {/* Content Sections */}
            {(selectedDocType === 'nda' || selectedDocType === '') && (
              <Card>
                <CardHeader bg="blue.50">
                  <Heading size="md">📝 NDA Creation</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">AI-Powered NDA Generation</Text>
                        <Text fontSize="sm">Create customized Non-Disclosure Agreements using advanced AI technology.</Text>
                      </Box>
                    </Alert>

                    <VStack spacing={4} align="start">
                      <Text fontWeight="bold">Why Use AI NDA Creation?</Text>
                      <VStack spacing={2} align="start" pl={4}>
                        <Text fontSize="sm">• 🤖 Tailored to your specific requirements</Text>
                        <Text fontSize="sm">• ⚡ Generated in seconds, not hours</Text>
                        <Text fontSize="sm">• 📋 Legally compliant templates</Text>
                        <Text fontSize="sm">• ✏️ Fully customizable and editable</Text>
                      </VStack>
                    </VStack>

                    <Button
                      colorScheme="blue"
                      size="lg"
                      leftIcon={<Text>📝</Text>}
                    >
                      Start NDA Creation
                    </Button>

                    <Divider />
                    
                    {/* Recent NDAs placeholder */}
                    <VStack spacing={4} align="stretch" p={6} bg="blue.50" borderRadius="md">
                      <Text fontWeight="bold" color="blue.700">📄 Recent NDAs</Text>
                      <Text color="blue.600">
                        Your recently created NDAs will appear here for quick access and reuse.
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        No NDAs created yet
                      </Text>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {selectedDocType === 'upload' && (
              <Card>
                <CardHeader bg="green.50">
                  <Heading size="md">📁 Document Upload</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Alert status="success">
                      <AlertIcon />
                      <Text>Securely upload your documents for safe storage and AI analysis.</Text>
                    </Alert>
                    
                    <VStack spacing={4} align="start">
                      <Text fontWeight="bold">Select Document Type:</Text>
                      <Grid templateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={3} w="full">
                        <Button
                          variant="outline"
                          colorScheme="blue"
                          leftIcon={<Icon as={FiFileText} />}
                          size="md"
                          p={4}
                          h="auto"
                          flexDir="column"
                          spacing={2}
                        >
                          <Text fontWeight="bold">Pitch Deck</Text>
                          <Text fontSize="xs" color="gray.600">Business presentations</Text>
                        </Button>
                        
                        <Button
                          variant="outline"
                          colorScheme="green"
                          leftIcon={<Icon as={FiFileText} />}
                          size="md"
                          p={4}
                          h="auto"
                          flexDir="column"
                          spacing={2}
                        >
                          <Text fontWeight="bold">Financial</Text>
                          <Text fontSize="xs" color="gray.600">Projections & reports</Text>
                        </Button>
                        
                        <Button
                          variant="outline"
                          colorScheme="purple"
                          leftIcon={<Icon as={FiShield} />}
                          size="md"
                          p={4}
                          h="auto"
                          flexDir="column"
                          spacing={2}
                        >
                          <Text fontWeight="bold">Patents</Text>
                          <Text fontSize="xs" color="gray.600">IP documentation</Text>
                        </Button>
                        
                        <Button
                          variant="outline"
                          colorScheme="orange"
                          leftIcon={<Icon as={FiUsers} />}
                          size="md"
                          p={4}
                          h="auto"
                          flexDir="column"
                          spacing={2}
                        >
                          <Text fontWeight="bold">Cap Table</Text>
                          <Text fontSize="xs" color="gray.600">Equity structure</Text>
                        </Button>
                      </Grid>
                    </VStack>
                    
                    <Button colorScheme="green" size="lg" leftIcon={<FiUpload />}>
                      Upload Documents
                    </Button>
                    
                    {/* Uploaded documents placeholder */}
                    <VStack spacing={4} align="stretch" p={6} bg="green.50" borderRadius="md">
                      <Text fontWeight="bold" color="green.700">📂 Document Library</Text>
                      <Text color="green.600">
                        Your uploaded documents will be organized here by type and ready for AI review.
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        No documents uploaded yet
                      </Text>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {selectedDocType === 'ai' && (
              <Card>
                <CardHeader bg="purple.50">
                  <Heading size="md">🤖 AI Agent Review</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Expert AI Analysis</Text>
                        <Text fontSize="sm">
                          Select specialized AI agents to review your documents with domain expertise.
                        </Text>
                      </Box>
                    </Alert>
                    
                    <Badge colorScheme="purple" alignSelf="start">
                      🎯 Specialized Expertise • 📊 Detailed Analysis • ⚡ Instant Results
                    </Badge>
                    
                    {/* AI Agents */}
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
                    
                    <Button colorScheme="purple" size="lg" leftIcon={<Text>🤖</Text>}>
                      Start AI Review
                    </Button>
                    
                    {/* Review results placeholder */}
                    <VStack spacing={4} align="stretch" p={6} bg="purple.50" borderRadius="md">
                      <Text fontWeight="bold" color="purple.700">📋 Review Results</Text>
                      <Text color="purple.600">
                        Detailed AI analysis reports will appear here with insights, recommendations, and scoring.
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        No reviews completed yet
                      </Text>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            )}
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