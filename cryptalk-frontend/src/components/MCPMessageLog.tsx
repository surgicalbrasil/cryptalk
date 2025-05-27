import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Heading,
  Badge,
  VStack,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import mcpService from '../services/MCPService';
import { Message } from '../services/MessagingService';
import { PaymentData } from '../services/MCPService';

/**
 * Component to display logs of MCP messages and payments
 */
const MCPMessageLog: React.FC = () => {
  const [logs, setLogs] = useState<Array<{type: 'message' | 'payment', content: string, timestamp: string}>>([]);
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Add a test log entry for initialization
  useEffect(() => {
    addLog('message', 'MCP Log initialized and ready to capture messages');
    
    // Subscribe to messages
    mcpService.onMessage((message: Message) => {
      addLog('message', `Received: "${message.content}" from ${message.sender.substring(0, 12)}...`);
    });
    
    // Subscribe to payments
    mcpService.onPayment((payment: PaymentData) => {
      addLog('payment', `Payment: ${payment.amount} ETH to ${payment.recipient.substring(0, 10)}...`);
    });
  }, []);
  
  /**
   * Add a log entry
   */
  const addLog = (type: 'message' | 'payment', content: string) => {
    setLogs(prev => [
      { type, content, timestamp: new Date().toISOString() },
      ...prev
    ].slice(0, 10)); // Keep only the 10 most recent logs
  };
  
  /**
   * Clear all logs
   */
  const clearLogs = () => {
    setLogs([]);
    addLog('message', 'Logs cleared');
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Heading size="sm">MCP Communication Log</Heading>
        <Button size="xs" onClick={clearLogs}>Clear</Button>
      </Box>
      
      <Box 
        borderWidth="1px" 
        borderRadius="md" 
        p={2} 
        bg={bgColor}
        borderColor={borderColor}
        height="150px"
        overflowY="auto"
      >
        {logs.length === 0 ? (
          <Text fontSize="xs" color="gray.500" p={2}>No MCP messages yet.</Text>
        ) : (
          <VStack align="stretch" gap={1}>
            {logs.map((log, i) => (
              <Box key={i} fontSize="xs" p={1}>
                <Badge 
                  size="sm" 
                  colorScheme={log.type === 'message' ? 'green' : 'blue'}
                  mr={1}
                >
                  {log.type}
                </Badge>
                <Text as="span" color="gray.600" mr={1}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text as="span">{log.content}</Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default MCPMessageLog;
