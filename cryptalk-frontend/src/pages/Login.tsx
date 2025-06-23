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
  Flex
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/AppConfig';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithEmail, isEmailAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isEmailAuthenticated) {
      navigate('/dashboard');
    }
  }, [isInitialized, isEmailAuthenticated, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await loginWithEmail(email);
      
      if (result.success) {
        toast({
          title: 'Check your email',
          description: 'We sent you a magic link to sign in. Click the link in your email to complete authentication.',
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        // Note: The user will be redirected when they click the magic link in their email
        // and return to the application
      } else {
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
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Failed to send magic link',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8} align="stretch">
        <VStack spacing={3} textAlign="center">
          <Heading>Welcome to CrypTalk</Heading>
          <Text color="gray.600">
            Secure messaging for {AppConfig.serviceProvider.name}
          </Text>
        </VStack>

        <Box p={6} borderWidth={1} borderRadius="lg" bg="white" boxShadow="sm">
          <VStack spacing={6}>
            <Box textAlign="center" w="full">
              <Heading size="md" mb={2}>Sign in with Email</Heading>
              <Text fontSize="sm" color="gray.600">
                Enter your email address and we'll send you a magic link to sign in.
              </Text>
            </Box>
            
            <Flex direction="column" align="center" justify="center" w="full">
              <Box p={4} borderRadius="full" bg="blue.50" mb={4}>
                <Text fontSize="2xl">✉️</Text>
              </Box>
            </Flex>

            <form onSubmit={handleEmailLogin} style={{ width: '100%' }}>
              <VStack spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    size="lg"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  loadingText="Sending magic link..."
                >
                  Send Magic Link
                </Button>
              </VStack>
            </form>
          </VStack>
        </Box>
        
        <Divider />
        
        <VStack spacing={2}>
          <Text textAlign="center" fontSize="sm" color="gray.500">
            Need wallet features for secure payments?
          </Text>
          <Button
            variant="link"
            colorScheme="blue"
            size="sm"
            onClick={() => navigate('/login-metamask')}
          >
            Login with MetaMask instead
          </Button>
        </VStack>
        
        <Text textAlign="center" fontSize="sm" color="gray.500">
          © {new Date().getFullYear()} {AppConfig.serviceProvider.name}. All rights reserved.
        </Text>
      </VStack>
    </Container>
  );
};

export default Login;