import React from 'react';
import {
  Box,
  Flex,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  overlay?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  overlay = true,
  size = 'lg'
}) => {
  const overlayBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(0, 0, 0, 0.8)');

  if (!isLoading) {
    return <>{children}</>;
  }

  if (overlay) {
    return (
      <Box position="relative">
        {children}
        <Flex
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg={overlayBg}
          align="center"
          justify="center"
          zIndex={1000}
          borderRadius="inherit"
        >
          <VStack spacing={4}>
            <Spinner size={size} thickness="4px" speed="0.65s" />
            <Text fontWeight="medium" color="gray.600">
              {message}
            </Text>
          </VStack>
        </Flex>
      </Box>
    );
  }

  return (
    <Flex align="center" justify="center" minH="200px">
      <VStack spacing={4}>
        <Spinner size={size} thickness="4px" speed="0.65s" />
        <Text fontWeight="medium" color="gray.600">
          {message}
        </Text>
      </VStack>
    </Flex>
  );
};