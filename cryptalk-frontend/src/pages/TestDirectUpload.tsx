import React, { useState } from 'react';
import { Box, Button, VStack, Text, useToast } from '@chakra-ui/react';
import * as Client from '@web3-storage/w3up-client';

const TestDirectUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState('');
  const toast = useToast();

  const testUpload = async () => {
    try {
      setIsUploading(true);
      setResult('Creating client...');
      
      // Create client - it will use browser's IndexedDB for storage
      const client = await Client.create();
      
      setResult('Client created. Getting current space...');
      
      // Get current space
      const currentSpace = client.currentSpace();
      if (!currentSpace) {
        // List spaces
        const spaces = await client.spaces();
        setResult(`Found ${spaces.length} spaces`);
        
        if (spaces.length > 0) {
          await client.setCurrentSpace(spaces[0].did());
          setResult(`Using space: ${spaces[0].name || spaces[0].did()}`);
        } else {
          throw new Error('No spaces available');
        }
      } else {
        setResult(`Current space: ${currentSpace.name || currentSpace.did()}`);
      }
      
      // Create test file
      const testContent = `CrypTalk test upload: ${new Date().toISOString()}`;
      const testFile = new File([testContent], 'cryptalk-test.txt', { type: 'text/plain' });
      
      setResult('Uploading file...');
      
      // Upload
      const cid = await client.uploadFile(testFile);
      
      setResult(`Success! CID: ${cid.toString()}`);
      
      toast({
        title: 'Upload Successful!',
        description: `CID: ${cid.toString()}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setResult(`Error: ${error.message}`);
      
      toast({
        title: 'Upload Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="2xl" fontWeight="bold">Direct W3UP Test</Text>
        
        <Button 
          colorScheme="blue" 
          onClick={testUpload}
          isLoading={isUploading}
          loadingText="Uploading..."
        >
          Test Direct Upload
        </Button>
        
        <Box p={4} bg="gray.100" borderRadius="md">
          <Text fontFamily="mono" whiteSpace="pre-wrap">
            {result || 'Click button to test upload'}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default TestDirectUpload;