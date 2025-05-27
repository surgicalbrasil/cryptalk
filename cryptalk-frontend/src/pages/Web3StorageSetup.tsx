import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Input,
  useToast,
  Container,
  Heading,
  Alert,
  AlertIcon,
  Code,
  Divider,
  HStack,
  Badge
} from '@chakra-ui/react';
import * as Client from '@web3-storage/w3up-client';
import { useNavigate } from 'react-router-dom';

const Web3StorageSetup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'verify' | 'done'>('email');
  const [setupInfo, setSetupInfo] = useState<any>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create client
      const client = await Client.create();
      
      // Login with email
      console.log('🔐 Logging in with email:', email);
      const account = await client.login(email);
      
      setStep('verify');
      
      toast({
        title: 'Check your email',
        description: 'We sent a verification link to your email',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      // Wait for verification
      await account.plan.wait();
      
      // Create space
      console.log('📦 Creating space...');
      const space = await client.createSpace('cryptalk-production');
      await space.save();
      await client.setCurrentSpace(space.did());
      
      // Save setup info
      const info = {
        email,
        spaceDid: space.did(),
        spaceName: 'cryptalk-production',
        agentDid: client.agent().did()
      };
      
      setSetupInfo(info);
      setStep('done');
      
      // Save to localStorage for the app
      localStorage.setItem('w3up-client-setup', JSON.stringify(info));
      
      toast({
        title: 'Setup complete!',
        description: 'Your Web3Storage account is ready',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/chat/secure');
  };

  return (
    <Container maxW="lg" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading mb={2}>Web3Storage Setup</Heading>
          <Text color="gray.600">
            Configure your Web3Storage account for CrypTalk
          </Text>
        </Box>

        {step === 'email' && (
          <Box p={6} borderWidth={1} borderRadius="lg" bg="white">
            <VStack spacing={4}>
              <Text>Enter your email to create or access your Web3Storage account:</Text>
              
              <Input
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="lg"
              />
              
              <Button
                colorScheme="blue"
                size="lg"
                width="full"
                onClick={handleEmailSubmit}
                isLoading={isLoading}
                loadingText="Setting up..."
              >
                Continue with Email
              </Button>
              
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  We'll send you a verification link. This is free and no credit card required.
                </Text>
              </Alert>
            </VStack>
          </Box>
        )}

        {step === 'verify' && (
          <Box p={6} borderWidth={1} borderRadius="lg" bg="white">
            <VStack spacing={4}>
              <Badge colorScheme="orange" fontSize="lg" p={2}>
                Waiting for email verification...
              </Badge>
              
              <Text textAlign="center">
                We sent a verification link to:
              </Text>
              <Code fontSize="lg">{email}</Code>
              
              <Text textAlign="center" color="gray.600">
                Please check your email and click the verification link.
                This page will update automatically.
              </Text>
              
              <Box>
                <HStack justify="center">
                  <Box className="spinner" />
                </HStack>
              </Box>
            </VStack>
          </Box>
        )}

        {step === 'done' && setupInfo && (
          <Box p={6} borderWidth={1} borderRadius="lg" bg="white">
            <VStack spacing={4} align="stretch">
              <Badge colorScheme="green" fontSize="lg" p={2} textAlign="center">
                ✅ Setup Complete!
              </Badge>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" mb={2}>Your Web3Storage Configuration:</Text>
                <VStack align="stretch" spacing={2} p={4} bg="gray.50" borderRadius="md">
                  <HStack>
                    <Text fontWeight="semibold">Email:</Text>
                    <Code>{setupInfo.email}</Code>
                  </HStack>
                  <HStack>
                    <Text fontWeight="semibold">Space:</Text>
                    <Code>{setupInfo.spaceName}</Code>
                  </HStack>
                  <HStack>
                    <Text fontWeight="semibold">Space DID:</Text>
                    <Code fontSize="xs">{setupInfo.spaceDid}</Code>
                  </HStack>
                </VStack>
              </Box>
              
              <Button
                colorScheme="green"
                size="lg"
                onClick={handleContinue}
              >
                Go to Secure Chat
              </Button>
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default Web3StorageSetup;