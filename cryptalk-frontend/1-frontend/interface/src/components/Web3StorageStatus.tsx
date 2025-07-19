import React, { useEffect, useState } from 'react';
import {
  Text,
  Badge,
  Tooltip,
  VStack,
  Card,
  CardBody,
  HStack,
  Progress,
  CircularProgress,
  Icon,
  Flex,
  Spacer,
  Button,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Alert,
  AlertIcon,
  AlertDescription,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Code
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, RepeatIcon, InfoIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import web3StorageService, { ConnectionStatus, StorageStats } from '../services/Web3StorageService';

const Web3StorageStatus: React.FC = () => {
  const { did, isAuthenticated, connectionStatus } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedStorage: null,
    totalStorage: null,
    fileCount: null
  });
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    // Check connection immediately
    checkConnection();
    
    // Check status periodically
    const interval = setInterval(checkConnection, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    
    try {
      // Get connection status
      await web3StorageService.checkConnection();
      
      // Get storage stats if connected
      if (web3StorageService.connectionStatus.connected) {
        const stats = await web3StorageService.updateStorageStats();
        setStorageStats(stats);
      }
    } catch (error) {
      console.error("Error checking Web3.Storage status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes: number | null) => {
    if (bytes === null) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Calculate used storage percentage
  const getUsedPercentage = (): number => {
    if (storageStats.usedStorage === null || storageStats.totalStorage === null || storageStats.totalStorage === 0) {
      return 0;
    }
    return (storageStats.usedStorage / storageStats.totalStorage) * 100;
  };

  // Get appropriate color for storage progress based on usage
  const getStorageBarColor = (): string => {
    const percentage = getUsedPercentage();
    if (percentage > 85) return 'red';
    if (percentage > 60) return 'orange';
    return 'green';
  };

  // Get last checked time in relative format
  const getLastCheckedText = (): string => {
    if (!connectionStatus.lastChecked) return 'Never';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - connectionStatus.lastChecked.getTime()) / 1000);
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <>
      <Card>
        <CardBody p={4}>
          <VStack align="start" spacing={3} width="100%">
            <Flex width="100%" alignItems="center">
              <Text fontWeight="medium">Web3.Storage Status</Text>
              <Spacer />
              <Tooltip label="Refresh status">
                <IconButton
                  aria-label="Refresh status"
                  icon={<RepeatIcon />}
                  size="sm"
                  isLoading={isLoading}
                  onClick={checkConnection}
                />
              </Tooltip>
              <Tooltip label="View details">
                <IconButton
                  aria-label="View details"
                  icon={<InfoIcon />}
                  size="sm"
                  ml={2}
                  onClick={onOpen}
                />
              </Tooltip>
            </Flex>
            
            <HStack width="100%">
              <Text fontSize="sm">Connection:</Text>
              <Badge colorScheme={connectionStatus.connected ? 'green' : 'red'}>
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </Badge>
              {connectionStatus.connected && <Icon as={CheckCircleIcon} color="green.500" />}
              {!connectionStatus.connected && connectionStatus.error && <Icon as={WarningIcon} color="red.500" />}
            </HStack>
            
            {connectionStatus.error && (
              <Alert status="error" size="sm" borderRadius="md" py={2}>
                <AlertIcon />
                <AlertDescription fontSize="sm">{connectionStatus.error}</AlertDescription>
              </Alert>
            )}
            
            {connectionStatus.connected && (
              <>
                <HStack width="100%">
                  <Text fontSize="sm">Space:</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {connectionStatus.spaceName || 'Unknown'}
                  </Text>
                </HStack>
                
                {storageStats.usedStorage !== null && storageStats.totalStorage !== null && (
                  <VStack width="100%" spacing={1}>
                    <Flex width="100%" justify="space-between">
                      <Text fontSize="xs">
                        {`${formatBytes(storageStats.usedStorage)} of ${formatBytes(storageStats.totalStorage)} used`}
                      </Text>
                      <Text fontSize="xs">{`${Math.round(getUsedPercentage())}%`}</Text>
                    </Flex>
                    <Progress
                      value={getUsedPercentage()}
                      size="sm"
                      width="100%"
                      borderRadius="md"
                      colorScheme={getStorageBarColor()}
                    />
                  </VStack>
                )}
                
                <HStack>
                  <Text fontSize="sm">Your DID:</Text>
                  <Tooltip label={did} hasArrow placement="bottom">
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {did && did.length > 20 ? `${did.substring(0, 20)}...` : did}
                    </Text>
                  </Tooltip>
                </HStack>
              </>
            )}
            
            <Text fontSize="xs" color="gray.500" alignSelf="flex-end">
              Last checked: {getLastCheckedText()}
            </Text>
          </VStack>
        </CardBody>
      </Card>
      
      {/* Detailed Status Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Web3.Storage Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Stat>
                <StatLabel>Connection Status</StatLabel>
                <StatNumber>
                  <Badge colorScheme={connectionStatus.connected ? 'green' : 'red'} fontSize="md">
                    {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </StatNumber>
                <StatHelpText>Last checked: {getLastCheckedText()}</StatHelpText>
              </Stat>
              
              {connectionStatus.error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{connectionStatus.error}</AlertDescription>
                </Alert>
              )}
              
              {connectionStatus.connected && (
                <>
                  <Box>
                    <Text fontWeight="bold" mb={1}>Storage Space</Text>
                    <Text>{connectionStatus.spaceName || 'Unknown'}</Text>
                    {connectionStatus.spaceDid && (
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Space DID: {connectionStatus.spaceDid}
                      </Text>
                    )}
                  </Box>
                  
                  <Box>
                    <Text fontWeight="bold" mb={1}>Storage Usage</Text>
                    {storageStats.usedStorage !== null && storageStats.totalStorage !== null ? (
                      <>
                        <Flex align="center" mb={2}>
                          <CircularProgress 
                            value={getUsedPercentage()} 
                            color={getStorageBarColor()}
                            size="80px"
                          >
                            <Box textAlign="center">
                              <Text fontSize="sm" fontWeight="bold">{Math.round(getUsedPercentage())}%</Text>
                            </Box>
                          </CircularProgress>
                          <VStack ml={4} align="start">
                            <Text>Used: {formatBytes(storageStats.usedStorage)}</Text>
                            <Text>Total: {formatBytes(storageStats.totalStorage)}</Text>
                            {storageStats.fileCount !== null && (
                              <Text>Files: {storageStats.fileCount}</Text>
                            )}
                          </VStack>
                        </Flex>
                      </>
                    ) : (
                      <Text>Storage statistics unavailable</Text>
                    )}
                  </Box>
                  
                  <Box>
                    <Text fontWeight="bold" mb={1}>Your DID</Text>
                    <Code p={2} borderRadius="md" fontSize="sm" width="100%">
                      {did || 'No DID available'}
                    </Code>
                  </Box>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={checkConnection} isLoading={isLoading}>
              Refresh Status
            </Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Web3StorageStatus;
