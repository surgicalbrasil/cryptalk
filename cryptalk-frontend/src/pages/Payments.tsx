import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  FormControl, 
  FormLabel, 
  Input, 
  Button, 
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import paymentService, { PaymentTransaction } from '../services/PaymentService';
import AppConfig, { getRecipientWalletAddress, getRecipientDID } from '../config/AppConfig';
import MetaMaskUtils from '../utils/MetaMaskUtils';

interface PaymentsProps {
  onPaymentSuccess?: (txHash: string) => void;
}

const Payments: React.FC<PaymentsProps> = ({ onPaymentSuccess }) => {
  const { did } = useAuth();
  const [balance, setBalance] = useState('0.0');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientDID, setRecipientDID] = useState('');  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);
  const toast = useToast();
  useEffect(() => {
    const fetchBalance = async () => {
      const walletBalance = await paymentService.getBalance();
      setBalance(walletBalance);
      
      // Get transactions 
      const txs = paymentService.getTransactions();
      setTransactions(txs);
      
      // Set demo recipient DID if none exists
      if (!recipientDID) {
        setRecipientDID('did:key:z6MkgGtyCyRfHDjFoHbYHxNwHhMzk9LjCUPiRh9XcLQsDj5j');
      }      // Set Surgical Brasil's wallet address as the default recipient
      if (!recipientAddress) {
        setRecipientAddress(getRecipientWalletAddress());
      }
      
      // Set the service provider's DID if none exists
      if (!recipientDID) {
        setRecipientDID(getRecipientDID());
      }

      // Check for MetaMask availability
      setIsMetaMaskAvailable(MetaMaskUtils.isMetaMaskConnected());
    };
    fetchBalance();

    // Listen for MetaMask account changes
    const handleAccountsChanged = (accounts: string[]) => {
      setIsMetaMaskAvailable(accounts.length > 0);
    };
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);
  const validatePaymentInputs = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
    
    if (!recipientAddress) {
      toast({
        title: 'Invalid recipient',
        description: 'Please enter a valid recipient address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }

    return true;
  };

  const handleSendPayment = async () => {
    if (!validatePaymentInputs()) return;
    
    setIsLoading(true);
    
    try {
      const tx = await paymentService.sendPayment(
        recipientAddress, 
        parseFloat(amount), 
        recipientDID
      );
      
      if (tx) {
        // Update our transactions list
        setTransactions(prev => [tx, ...prev]);
        
        // Update balance after transaction
        const newBalance = await paymentService.getBalance();
        setBalance(newBalance);
          // Clear form
        setAmount('');
        
        // Call the onPaymentSuccess callback if provided
        if (onPaymentSuccess && tx.txHash) {
          onPaymentSuccess(tx.txHash);
        }
        
        toast({
          title: 'Payment sent',
          description: `Successfully sent ${amount} ETH to ${recipientAddress.substring(0, 10)}...`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment failed',
        description: 'There was an error processing your payment. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPaymentWithMetaMask = async () => {
    if (!validatePaymentInputs()) return;
    
    if (!window.ethereum || !window.ethereum.selectedAddress) {
      toast({
        title: 'MetaMask not connected',
        description: 'Please connect your MetaMask wallet first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const tx = await paymentService.sendPaymentWithMetaMask(
        recipientAddress, 
        parseFloat(amount), 
        recipientDID
      );
      
      if (tx) {
        // Update our transactions list
        setTransactions(prev => [tx, ...prev]);
          // Clear form
        setAmount('');
        
        // Call the onPaymentSuccess callback if provided
        if (onPaymentSuccess && tx.txHash) {
          onPaymentSuccess(tx.txHash);
        }
        
        toast({
          title: 'MetaMask Payment sent',
          description: `Successfully sent ${amount} ETH to ${recipientAddress.substring(0, 10)}...`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('MetaMask transaction failed');
      }
    } catch (error) {
      console.error('MetaMask payment error:', error);
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'There was an error processing your MetaMask payment',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <Heading mb={4} size="lg">CrypTalk Payments</Heading>
      <Grid
        templateColumns={{ base: "1fr", md: "1fr 2fr" }}
        gap={6}
      >
        {/* Left column - Payment form */}
        <GridItem>
          <Card>
            <CardHeader>
              <Heading size="md">Send Payment</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Stat>
                  <StatLabel>Your Balance</StatLabel>
                  <StatNumber>{balance} ETH</StatNumber>
                  <StatHelpText>Available for payments</StatHelpText>
                </Stat>
                
                <Divider />
                
                <FormControl isRequired>
                  <FormLabel>Recipient Address</FormLabel>
                  <Input
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Recipient DID (Optional)</FormLabel>
                  <Input
                    placeholder="did:key:..."
                    value={recipientDID}
                    onChange={(e) => setRecipientDID(e.target.value)}
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Amount (ETH)</FormLabel>
                  <Input
                    placeholder="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    step="0.001"
                    min="0"
                  />
                </FormControl>
              </VStack>
            </CardBody>
            <CardFooter>
              <VStack w="full" spacing={3}>
                <Button
                  colorScheme="green"
                  onClick={handleSendPayment}
                  isLoading={isLoading}
                  loadingText="Sending..."
                  isFullWidth
                >
                  Send Payment (Internal Wallet)
                </Button>

                {isMetaMaskAvailable && (
                  <Button
                    colorScheme="orange"
                    onClick={handleSendPaymentWithMetaMask}
                    isLoading={isLoading}
                    loadingText="Sending via MetaMask..."
                    isFullWidth
                    leftIcon={<Text>🦊</Text>}
                  >
                    Send with MetaMask
                  </Button>
                )}

                {!isMetaMaskAvailable && (
                  <Button
                    as="a"
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (MetaMaskUtils.isMetaMaskInstalled()) {
                        await MetaMaskUtils.connectToMetaMask();
                        setIsMetaMaskAvailable(MetaMaskUtils.isMetaMaskConnected());
                      } else {
                        window.open('https://metamask.io', '_blank');
                      }
                    }}
                    colorScheme="gray"
                    isFullWidth
                  >
                    {MetaMaskUtils.isMetaMaskInstalled() ? 'Connect MetaMask' : 'Install MetaMask'}
                  </Button>
                )}
              </VStack>
            </CardFooter>
          </Card>
        </GridItem>
        
        {/* Right column - Transaction history */}
        <GridItem>
          <Card height="100%">            <CardHeader>
              <Heading size="md">Transaction History</Heading>
              <HStack>
                <Text fontSize="sm" color="gray.500">
                  Transactions are stored on Web3.Storage
                </Text>
                {isMetaMaskAvailable && (
                  <Badge colorScheme="orange" variant="subtle">
                    MetaMask Connected
                  </Badge>
                )}
              </HStack>
            </CardHeader>
            
            <CardBody overflowY="auto">
              {transactions.length > 0 ? (
                <TableContainer>
                  <Table variant="simple" size="sm">                    <Thead>
                      <Tr>
                        <Th>Amount</Th>
                        <Th>Recipient</Th>
                        <Th>Status</Th>
                        <Th>Method</Th>
                        <Th>Date</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {transactions.map((tx, index) => (
                        <Tr key={index}>
                          <Td>{tx.amount} ETH</Td>
                          <Td>{`${tx.recipient.substring(0, 10)}...`}</Td>
                          <Td>
                            <Badge
                              colorScheme={
                                tx.status === 'completed'
                                  ? 'green'
                                  : tx.status === 'pending'
                                  ? 'yellow'
                                  : 'red'
                              }
                            >
                              {tx.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={tx.sender.startsWith('0x') ? 'orange' : 'blue'}
                            >
                              {tx.sender.startsWith('0x') ? '🦊 MetaMask' : 'Internal'}
                            </Badge>
                          </Td>
                          <Td>{new Date(tx.timestamp).toLocaleDateString()}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500" textAlign="center" py={10}>
                  No transaction history yet
                </Text>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Payments;
