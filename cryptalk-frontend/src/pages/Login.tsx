import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  useToast,
  Container,
  Alert,
  AlertIcon,
  Input,
  FormControl,
  FormLabel,
  Divider,
  Flex,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Grid,
  Badge,
  FormErrorMessage,
  Icon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { CheckCircleIcon, EmailIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/AppConfig';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMetaMaskLoading, setIsMetaMaskLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { loginWithEmail, isEmailAuthenticated, isInitialized, connectWallet } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isEmailAuthenticated) {
      navigate('/dashboard');
    }
  }, [isInitialized, isEmailAuthenticated, navigate]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');
    
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setEmailError('Email address is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setEmailError('');
      
      const result = await loginWithEmail(email);
      
      if (result.success) {
        setEmailSent(true);
        toast({
          title: 'Magic Link Sent! 📧',
          description: 'Check your email and click the link to sign in.',
          status: 'success',
          duration: 10000,
          isClosable: true,
          position: 'top',
        });
      } else {
        setEmailError(result.error || 'Failed to send magic link');
        toast({
          title: 'Login failed',
          description: result.error || 'Failed to send magic link',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Email login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      setEmailError(errorMessage);
      toast({
        title: 'Login failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setEmailSent(false);
    setEmail('');
  };

  const handleMetaMaskConnect = async () => {
    try {
      setIsMetaMaskLoading(true);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        toast({
          title: 'MetaMask not found',
          description: 'Please install MetaMask extension to connect your wallet.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        toast({
          title: 'No accounts found',
          description: 'Please unlock your MetaMask wallet and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const walletAddress = accounts[0];
      
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('MetaMask connection error:', error);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect to MetaMask',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsMetaMaskLoading(false);
    }
  };

  return (
    <Box maxW="1200px" mx="auto" p={6} bg="gray.50" minH="calc(100vh - 64px)">
      {/* Header */}
      <VStack spacing={2} mb={8} textAlign="center">
        <Heading size="2xl" color="gray.800">
          Welcome to CrypTalk Platform
        </Heading>
        <Text fontSize="md" color="gray.600">
          Choose your authentication method
        </Text>
      </VStack>

      {/* Main Authentication Options */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={8} mb={8}>
        {/* Email Authentication Card */}
        <Card>
          <CardHeader bg="blue.50">
            <VStack spacing={2}>
              <Text fontSize="3xl">📧</Text>
              <Heading size="md">Email Authentication</Heading>
            </VStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Text color="gray.600" textAlign="center">
                Secure, passwordless authentication
              </Text>

              {!emailSent ? (
                <form onSubmit={handleEmailLogin} style={{ width: '100%' }}>
                  <VStack spacing={4} w="full">
                    <FormControl isRequired isInvalid={!!emailError}>
                      <FormLabel>Email Address</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter your email address"
                        size="lg"
                        bg="white"
                        autoComplete="email"
                        isDisabled={isLoading}
                      />
                      {emailError && (
                        <FormErrorMessage>{emailError}</FormErrorMessage>
                      )}
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      width="full"
                      isLoading={isLoading}
                      loadingText="Sending magic link..."
                      leftIcon={<EmailIcon />}
                      isDisabled={!email || !!emailError}
                    >
                      Send Magic Link
                    </Button>
                  </VStack>
                </form>
              ) : (
                <VStack spacing={4}>
                  <Alert
                    status="success"
                    variant="subtle"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    height="200px"
                    borderRadius="md"
                  >
                    <AlertIcon boxSize="40px" mr={0} />
                    <AlertTitle mt={4} mb={1} fontSize="lg">
                      Check Your Email!
                    </AlertTitle>
                    <AlertDescription maxWidth="sm">
                      We've sent a magic link to <strong>{email}</strong>.
                      Click the link in your email to complete sign in.
                    </AlertDescription>
                  </Alert>

                  <VStack spacing={2} w="full">
                    <Text fontSize="sm" color="gray.600">
                      Didn't receive the email?
                    </Text>
                    <Button
                      variant="outline"
                      colorScheme="blue"
                      size="sm"
                      onClick={handleResendEmail}
                    >
                      Try Again with Different Email
                    </Button>
                  </VStack>
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Wallet Authentication Card */}
        <Card>
          <CardHeader bg="orange.50">
            <VStack spacing={2}>
              <Text fontSize="3xl">🦊</Text>
              <Heading size="md">Wallet Authentication</Heading>
            </VStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Text color="gray.600" textAlign="center">
                Connect wallet for blockchain features
              </Text>

              <Button
                onClick={handleMetaMaskConnect}
                colorScheme="orange"
                size="lg"
                width="full"
                isLoading={isMetaMaskLoading}
                loadingText="Connecting MetaMask..."
                leftIcon={<Text>🦊</Text>}
              >
                Connect MetaMask Wallet
              </Button>

              {!window.ethereum && (
                <Alert status="warning" size="sm">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Please install MetaMask extension
                  </Text>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Grid>


      {/* Footer */}
      <Text textAlign="center" fontSize="sm" color="gray.500" mt={8}>
        © {new Date().getFullYear()} {AppConfig.serviceProvider.name}. All rights reserved.
      </Text>
    </Box>
  );
};

export default Login;