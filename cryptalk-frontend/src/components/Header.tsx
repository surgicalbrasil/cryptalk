import React from 'react';
import { 
  Box, 
  Flex, 
  Button, 
  HStack,
  VStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Badge,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { ChevronDownIcon, ChatIcon, SettingsIcon } from '@chakra-ui/icons';
import { FiMessageCircle, FiShield, FiGrid, FiLogOut } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/AppConfig';

const Header: React.FC = () => {
  const { isAuthenticated, logout, walletAddress } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check if user is admin
  const isAdmin = walletAddress && 
    walletAddress.toLowerCase() === AppConfig.serviceProvider.walletAddress.toLowerCase();
  
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box bg={bgColor} px={4} boxShadow="sm" borderBottom="1px" borderColor={borderColor}>
      <Flex h={16} alignItems="center" justifyContent="center">
        <VStack spacing={0} align="center">
          <HStack spacing={2}>
            <Box 
              fontWeight="bold" 
              fontSize="xl" 
              cursor="pointer" 
              onClick={() => navigate('/')}
              color="blue.600"
            >
              CrypTalk Platform
            </Box>
          </HStack>
          <Text fontSize="xs" color="gray.500">
            Complete solution for secure document sharing and blockchain integration
          </Text>
        </VStack>
        
        {/* Right side actions - only show when authenticated */}
        {isAuthenticated && (
          <Box position="absolute" right={4}>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<SettingsIcon />}
                variant="ghost"
                size="sm"
                aria-label="Settings"
              />
              <MenuList>
                <MenuItem onClick={() => navigate('/dashboard')}>
                  🏠 Plataforma
                </MenuItem>
                <MenuItem onClick={() => navigate('/settings')}>
                  ⚙️ Configurações
                </MenuItem>
                <MenuDivider />
                <MenuItem onClick={handleLogout} icon={<FiLogOut />} color="red.500">
                  Sair
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default Header;