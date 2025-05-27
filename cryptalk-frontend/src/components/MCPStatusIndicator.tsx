import React, { useState, useEffect } from 'react';
import { 
  HStack, 
  Text, 
  Badge, 
  Tooltip,
  Box
} from '@chakra-ui/react';
import mcpService from '../services/MCPService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component to show MCP connection status
 */
const MCPStatusIndicator: React.FC = () => {
  const { isAuthenticated, did } = useAuth();
  const [messagingStatus, setMessagingStatus] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<boolean>(false);

  // Poll for connection status
  useEffect(() => {
    if (!isAuthenticated || !did) return;
    
    // Check initial status
    setMessagingStatus(mcpService.isMessagingServerConnected());
    setPaymentStatus(mcpService.isPaymentServerConnected());
    
    // Set up interval to check status
    const interval = setInterval(() => {
      setMessagingStatus(mcpService.isMessagingServerConnected());
      setPaymentStatus(mcpService.isPaymentServerConnected());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, did]);

  if (!isAuthenticated || (!messagingStatus && !paymentStatus)) {
    return null;
  }

  return (
    <Tooltip 
      label="Model Context Protocol Integration Status" 
      hasArrow
      placement="bottom"
    >      <Box>
        <HStack gap={2}>
          <Text fontSize="xs" color="gray.600" fontWeight="medium">MCP:</Text>
          {messagingStatus && (
            <Badge size="sm" colorScheme="green" fontSize="xs">
              Messaging
            </Badge>
          )}
          {paymentStatus && (
            <Badge size="sm" colorScheme="blue" fontSize="xs">
              Payments
            </Badge>
          )}
        </HStack>
      </Box>
    </Tooltip>
  );
};

export default MCPStatusIndicator;
