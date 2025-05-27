import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Heading,
  Text,
  useToast,
  Card,
  CardBody,
  Badge,
  HStack,
  Divider,
  Code
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import web3StorageService from '../services/Web3StorageService';

const TestUpload: React.FC = () => {
  const { login, isAuthenticated, did } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const yourDID = 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';

  const handleLoginWithYourDID = async () => {
    setIsLoggingIn(true);
    try {
      const result = await login(yourDID, false);
      if (result.success) {
        toast({
          title: 'Login successful!',
          description: 'Ready to test Web3Storage uploads',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast({
      title: 'Uploading...',
      description: `Uploading ${file.name} to Web3Storage`,
      status: 'info',
      duration: 2000,
    });

    try {
      const result = await web3StorageService.uploadEncryptedFile(file);
      
      if (result.success) {
        setUploadResult({
          fileName: file.name,
          fileSize: file.size,
          cid: result.cid,
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: 'Upload successful!',
          description: `File uploaded with CID: ${result.cid}`,
          status: 'success',
          duration: 5000,
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box maxW="800px" mx="auto" p={5}>
      <VStack spacing={6}>
        <Heading>Test Web3Storage Upload</Heading>
        
        {!isAuthenticated ? (
          <Card width="100%">
            <CardBody>
              <VStack spacing={4}>
                <Text>Login with your DID to test uploads:</Text>
                <Code p={2}>{yourDID}</Code>
                <Button
                  colorScheme="blue"
                  onClick={handleLoginWithYourDID}
                  isLoading={isLoggingIn}
                  size="lg"
                >
                  Login with Your DID
                </Button>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card width="100%">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Logged in as:</Text>
                    <Badge colorScheme="green">{did}</Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Web3Storage Status:</Text>
                    <Badge colorScheme={web3StorageService.connectionStatus.connected ? 'green' : 'red'}>
                      {web3StorageService.connectionStatus.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </HStack>
                  
                  <Divider />
                  
                  <VStack>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.jpg,.png"
                    />
                    
                    <Button
                      colorScheme="purple"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload File to Web3Storage
                    </Button>
                    
                    <Text fontSize="sm" color="gray.500">
                      Supported: PDF, TXT, Word, Excel, Images
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
            
            {uploadResult && (
              <Card width="100%">
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <Heading size="md">✅ Upload Result</Heading>
                    <Divider />
                    <HStack justify="space-between">
                      <Text fontWeight="bold">File:</Text>
                      <Text>{uploadResult.fileName}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Size:</Text>
                      <Text>{(uploadResult.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">CID:</Text>
                      <Code fontSize="xs">{uploadResult.cid}</Code>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Timestamp:</Text>
                      <Text fontSize="sm">{uploadResult.timestamp}</Text>
                    </HStack>
                    <Divider />
                    <Text fontSize="sm" color="green.600">
                      ✅ File encrypted and stored in Web3Storage!
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            )}
            
            <Button variant="outline" onClick={() => navigate('/workflow')}>
              Go to Main App
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default TestUpload;