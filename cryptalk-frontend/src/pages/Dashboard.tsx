import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  HStack,
  Button
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Web3StorageStatus from '../components/Web3StorageStatus';
import mcpService from '../services/MCPService';

const Dashboard: React.FC = () => {
  const { did } = useAuth();
  const navigate = useNavigate();

  const handleNavigateToChat = () => {
    navigate('/chat');
  };

  const handleNavigateToPayments = () => {
    navigate('/payments');
  };

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <Box mb={8}>
        <Heading as="h1" size="xl" mb={2}>
          Welcome to CrypTalk
        </Heading>
        <Text color="gray.600">
          Your decentralized messaging platform with Web3.Storage integration
        </Text>
      </Box>

      {/* MCP Status */}
      <Box mb={8}>
        <Box p={5} borderWidth={1} borderRadius="lg" bg="blue.50" borderColor="blue.200">
          <Heading size="md" mb={2} color="blue.700">Surgical Brasil Services</Heading>
          <Text mb={4}>
            Access the complete workflow for Surgical Brasil services. Chat with Surgical Brasil,
            make cryptocurrency payments, and securely upload files.
          </Text>
          <Button 
            colorScheme="blue" 
            size="lg" 
            onClick={() => navigate('/workflow')}
            _hover={{ bg: 'blue.600' }}
          >
            Start Workflow
          </Button>
        </Box>
      </Box>

      {/* Storage Status */}
      <Box mb={8}>
        <Web3StorageStatus />
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <GridItem>
          <Box height="100%" p={5} borderWidth={1} borderRadius="lg" bg="white">
            <Heading size="md" mb={4}>Messaging</Heading>
            <Text mb={4}>
              Send and receive encrypted messages using Web3.Storage. All messages are stored
              in a decentralized way and encrypted with your DID.
            </Text>
            <Button colorScheme="blue" onClick={handleNavigateToChat}>
              Open Chat
            </Button>
          </Box>
        </GridItem>

        <GridItem>
          <Box height="100%" p={5} borderWidth={1} borderRadius="lg" bg="white">
            <Heading size="md" mb={4}>Payments</Heading>
            <Text mb={4}>
              Send cryptocurrency payments and store transaction records securely
              on Web3.Storage with your DID authentication.
            </Text>
            <Button colorScheme="green" onClick={handleNavigateToPayments}>
              Manage Payments
            </Button>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Dashboard;
