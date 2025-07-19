import React from 'react';
import { Box, Flex, Button, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { isAuthenticated, did, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const shortenDID = (did: string) => {
    if (!did) return '';
    return `${did.substring(0, 15)}...`;
  };

  return (
    <Box bg="white" px={4} boxShadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Box fontWeight="bold" fontSize="xl" cursor="pointer" onClick={() => navigate('/')}>
          CrypTalk
        </Box>

        <Flex gap={2}>
          {isAuthenticated ? (
            <>
              <Flex gap={2} display={{ base: 'none', md: 'flex' }}>
                <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                <Button variant="ghost" onClick={() => navigate('/chat')}>Chat</Button>
                <Button variant="ghost" onClick={() => navigate('/payments')}>Payments</Button>
                <Button variant="ghost" onClick={() => navigate('/settings')}>Settings</Button>
              </Flex>
              <Button colorScheme="red" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button colorScheme="blue" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;
