import React from 'react';
import { ChakraProvider as BaseChakraProvider } from '@chakra-ui/react';

interface ChakraProps {
  children: React.ReactNode;
}

// Wrapper component for Chakra UI
export const ChakraWrapper: React.FC<ChakraProps> = ({ children }) => {
  return (
    <BaseChakraProvider>
      {children}
    </BaseChakraProvider>
  );
};
