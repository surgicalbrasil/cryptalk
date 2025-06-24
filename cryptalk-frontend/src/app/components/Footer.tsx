import React from 'react';
import { Box, Text, Flex, Link } from '@chakra-ui/react';

const Footer: React.FC = () => {
  return (
    <Box
      bg="gray.50"
      color="gray.700"
      borderTopWidth={1}
      borderColor="gray.200"
      mt="auto"
      py={4}
    >
      <Flex
        maxW="1200px"
        mx="auto"
        py={4}
        px={5}
        direction={{ base: 'column', md: 'row' }}
        gap={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Text>© 2025 CrypTalk. All rights reserved</Text>
        <Flex gap={6}>
          <Link href="#" color="gray.500" _hover={{ color: 'blue.500' }}>About</Link>
          <Link href="#" color="gray.500" _hover={{ color: 'blue.500' }}>Privacy</Link>
          <Link href="#" color="gray.500" _hover={{ color: 'blue.500' }}>Terms</Link>
          <Link href="#" color="gray.500" _hover={{ color: 'blue.500' }}>Help</Link>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Footer;
