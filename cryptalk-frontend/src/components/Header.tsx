import React from 'react';
import { 
  Box, 
  Flex, 
  Button, 
  HStack,
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
      <Flex h={16} alignItems="center" justifyContent="space-between">
        {/* Logo */}
        <HStack spacing={3}>
          <Box 
            fontWeight="bold" 
            fontSize="xl" 
            cursor="pointer" 
            onClick={() => navigate('/')}
            color="blue.600"
          >
            CrypTalk
          </Box>
          <Badge colorScheme="green" variant="subtle">Beta</Badge>
        </HStack>
        
        {isAuthenticated && (
          <HStack spacing={4} flex={1} justify="center" display={{ base: 'none', md: 'flex' }}>
            {/* Dashboard */}
            <Button
              leftIcon={<FiGrid />}
              variant={isActive('/dashboard') ? 'solid' : 'ghost'}
              colorScheme={isActive('/dashboard') ? 'blue' : 'gray'}
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>

            {/* Chat Dropdown */}
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                leftIcon={<ChatIcon />}
                variant={location.pathname.includes('/chat') ? 'solid' : 'ghost'}
                colorScheme={location.pathname.includes('/chat') ? 'blue' : 'gray'}
                size="sm"
              >
                Chats
              </MenuButton>
              <MenuList>
                <MenuItem 
                  icon={<FiMessageCircle color="#3182CE" />}
                  onClick={() => navigate('/chat/general')}
                >
                  <HStack justify="space-between" w="full">
                    <Text>Chat Geral</Text>
                    <Badge colorScheme="blue" size="sm">Off-chain</Badge>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  icon={<FiShield color="#38A169" />}
                  onClick={() => navigate('/chat/secure')}
                >
                  <HStack justify="space-between" w="full">
                    <Text>Chat Médico</Text>
                    <Badge colorScheme="green" size="sm">On-chain</Badge>
                  </HStack>
                </MenuItem>
                <MenuDivider />
                <MenuItem fontSize="xs" color="gray.500" isDisabled>
                  <Text>Off-chain: Grátis e instantâneo</Text>
                </MenuItem>
                <MenuItem fontSize="xs" color="gray.500" isDisabled>
                  <Text>On-chain: Seguro e criptografado</Text>
                </MenuItem>
              </MenuList>
            </Menu>

            {/* Admin Panel - Only show for admin */}
            {isAdmin && (
              <Button
                leftIcon={<SettingsIcon />}
                variant={isActive('/admin') ? 'solid' : 'ghost'}
                colorScheme={isActive('/admin') ? 'purple' : 'gray'}
                size="sm"
                onClick={() => navigate('/admin')}
              >
                Painel Admin
              </Button>
            )}

            {/* Payments Button */}
            <Button
              leftIcon={<>💳</>}
              variant={isActive('/payments') ? 'solid' : 'ghost'}
              colorScheme={isActive('/payments') ? 'orange' : 'gray'}
              size="sm"
              onClick={() => navigate('/payments')}
            >
              Pagamentos
            </Button>

            {/* Surgical Brasil Button */}
            <Button
              variant={isActive('/workflow') ? 'solid' : 'outline'}
              colorScheme="teal"
              size="sm"
              onClick={() => navigate('/workflow')}
            >
              Surgical Brasil
            </Button>
          </HStack>
        )}

        {/* Right side actions */}
        <HStack spacing={2}>
          {isAuthenticated ? (
            <>
              {/* Settings Menu */}
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<SettingsIcon />}
                  variant="ghost"
                  size="sm"
                  aria-label="Settings"
                />
                <MenuList>
                  <MenuItem onClick={() => navigate('/settings')}>
                    ⚙️ Configurações
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout} icon={<FiLogOut />} color="red.500">
                    Sair
                  </MenuItem>
                </MenuList>
              </Menu>

              {/* Mobile menu for small screens */}
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<ChevronDownIcon />}
                  variant="outline"
                  size="sm"
                  display={{ base: 'flex', md: 'none' }}
                  aria-label="Menu"
                />
                <MenuList>
                  <MenuItem onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={() => navigate('/chat/general')}>
                    💬 Chat Geral
                  </MenuItem>
                  <MenuItem onClick={() => navigate('/chat/secure')}>
                    🔒 Chat Médico
                  </MenuItem>
                  {isAdmin && (
                    <>
                      <MenuDivider />
                      <MenuItem onClick={() => navigate('/admin')} color="purple.500">
                        🛠️ Painel Admin
                      </MenuItem>
                    </>
                  )}
                  <MenuDivider />
                  <MenuItem onClick={() => navigate('/workflow')}>
                    🏥 Surgical Brasil
                  </MenuItem>
                </MenuList>
              </Menu>
            </>
          ) : (
            <Button colorScheme="blue" onClick={() => navigate('/login')} size="sm">
              Entrar
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;