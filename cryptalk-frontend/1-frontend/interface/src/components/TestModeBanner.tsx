import React from 'react';
import { Alert, AlertIcon, Box, Text, HStack, Badge } from '@chakra-ui/react';
import { TEST_MODE, TEST_CONFIG } from '../config/testMode';

export const TestModeBanner: React.FC = () => {
  if (!TEST_CONFIG.showTestBanner) {
    return null;
  }

  return (
    <Alert status="warning" variant="solid" mb={4}>
      <AlertIcon />
      <Box flex="1">
        <HStack spacing={2} align="center">
          <Text fontWeight="bold">🧪 TEST MODE ENABLED</Text>
          <Badge colorScheme="orange" variant="outline">
            Authentication Disabled
          </Badge>
        </HStack>
        <Text fontSize="sm" mt={1}>
          Using mock authentication data. Set TEST_MODE=false in testMode.ts to enable real authentication.
        </Text>
      </Box>
    </Alert>
  );
};