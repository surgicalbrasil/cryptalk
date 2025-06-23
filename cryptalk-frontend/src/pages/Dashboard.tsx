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
  useColorModeValue
} from '@chakra-ui/react';
import { FiFileText, FiUpload, FiUsers, FiShield, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { did } = useAuth();
  const navigate = useNavigate();
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const documentTypes = [
    { id: 'pitch', name: 'Pitch Deck', icon: FiFileText, color: 'blue' },
    { id: 'financial', name: 'Financial Projections', icon: FiFileText, color: 'green' },
    { id: 'patent', name: 'Patents', icon: FiShield, color: 'purple' },
    { id: 'captable', name: 'Cap Table', icon: FiUsers, color: 'orange' },
    { id: 'other', name: 'Other Documents', icon: FiFileText, color: 'gray' }
  ];

  return (
    <Box maxW="1400px" mx="auto" p={6} bg={bgColor} minH="calc(100vh - 64px)">
      {/* Header */}
      <VStack spacing={1} mb={8} align="start">
        <Heading as="h1" size="2xl" color="gray.800">
          Data Room
        </Heading>
        <Text fontSize="lg" color="gray.600">
          Create NDAs, upload documents, and manage secure file sharing with AI-powered review
        </Text>
      </VStack>

      <Tabs size="lg" variant="enclosed" colorScheme="blue">
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

      {/* Quick Actions */}
      <Box mt={8}>
        <Card bg={cardBg} borderColor="blue.200" borderWidth={2}>
          <CardBody>
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Text fontWeight="semibold" fontSize="lg">Ready to share confidentially?</Text>
                <Text color="gray.600">Use our On-chain interface for secure, encrypted file sharing</Text>
              </VStack>
              <Button 
                colorScheme="green" 
                size="lg"
                leftIcon={<>⛓️</>}
                onClick={() => navigate('/onchain')}
              >
                Go to On Chain
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
