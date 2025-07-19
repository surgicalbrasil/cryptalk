import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Alert,
  AlertIcon,
  Progress,
  Image,
  QRCode,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Spinner,
  Divider,
  Icon,
  Code,
  Tooltip
} from '@chakra-ui/react';
import { FiCopy, FiRefreshCw, FiClock, FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { PIXOnRampService, ConversionQuote } from '../services/PIXOnRampService';
import { PIXPayment, PaymentCurrency, PIXStatus } from '../../../shared/types';

interface PIXOnRampInterfaceProps {
  targetWallet: string;
  onTransactionComplete?: (transactionId: string) => void;
  onTransactionFailed?: (error: string) => void;
}

export const PIXOnRampInterface: React.FC<PIXOnRampInterfaceProps> = ({
  targetWallet,
  onTransactionComplete,
  onTransactionFailed
}) => {
  const [amount, setAmount] = useState<string>('');
  const [targetCurrency, setTargetCurrency] = useState<PaymentCurrency>('USDC');
  const [quote, setQuote] = useState<ConversionQuote | null>(null);
  const [pixPayment, setPixPayment] = useState<PIXPayment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const toast = useToast();
  
  const [pixService] = useState(() => new PIXOnRampService(
    process.env.REACT_APP_PIX_API_ENDPOINT || '/api/pix',
    process.env.REACT_APP_PIX_API_KEY || ''
  ));

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Update countdown timer
  useEffect(() => {
    if (pixPayment && pixPayment.status === 'pending') {
      const timer = setInterval(() => {
        const remaining = Math.max(0, pixPayment.expiresAt.getTime() - Date.now());
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
          setPixPayment(prev => prev ? { ...prev, status: 'expired' } : null);
          toast({
            title: 'PIX Payment Expired',
            description: 'The PIX payment has expired. Please create a new payment.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [pixPayment, toast]);

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount in BRL',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsQuoteLoading(true);
    try {
      const newQuote = await pixService.getConversionQuote(parseFloat(amount), targetCurrency);
      setQuote(newQuote);
      
      toast({
        title: 'Quote Updated',
        description: `You will receive ~${newQuote.estimatedOutput.toFixed(6)} ${targetCurrency}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to get quote',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsQuoteLoading(false);
    }
  };

  const handleCreatePIXPayment = async () => {
    if (!quote || !amount) return;

    setIsLoading(true);
    try {
      const payment = await pixService.createPIXPayment(
        parseFloat(amount),
        targetCurrency,
        targetWallet,
        `Crypto purchase - ${parseFloat(amount)} BRL to ${targetCurrency}`
      );
      
      setPixPayment(payment);
      setTimeRemaining(payment.expiresAt.getTime() - Date.now());
      
      // Start polling for payment status
      const interval = setInterval(async () => {
        try {
          const status = await pixService.checkPIXStatus(payment.id);
          setPixPayment(status);
          
          if (status.status === 'paid') {
            clearInterval(interval);
            setPollingInterval(null);
            await handleProcessTransaction(status);
          } else if (status.status === 'expired' || status.status === 'cancelled') {
            clearInterval(interval);
            setPollingInterval(null);
          }
        } catch (error) {
          console.error('Error polling PIX status:', error);
        }
      }, 5000);
      
      setPollingInterval(interval);
      
      toast({
        title: 'PIX Payment Created',
        description: 'Scan the QR code or copy the PIX key to complete payment',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to create PIX payment',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessTransaction = async (payment: PIXPayment) => {
    if (!quote) return;

    try {
      const transaction = await pixService.processOnRampTransaction(payment, quote, targetWallet);
      
      toast({
        title: 'Transaction Processing',
        description: 'Your crypto purchase is being processed',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      onTransactionComplete?.(transaction.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Transaction Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      onTransactionFailed?.(errorMessage);
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard',
        description: `${label} copied successfully`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    });
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: PIXStatus): string => {
    switch (status) {
      case 'paid': return 'green';
      case 'pending': return 'blue';
      case 'expired': return 'red';
      case 'cancelled': return 'gray';
      default: return 'yellow';
    }
  };

  const getStatusIcon = (status: PIXStatus) => {
    switch (status) {
      case 'paid': return FiCheck;
      case 'pending': return FiClock;
      case 'expired': return FiX;
      case 'cancelled': return FiX;
      default: return FiInfo;
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <VStack spacing={2} align="center">
        <Heading size="lg">🇧🇷 PIX On-Ramp</Heading>
        <Text color="gray.600" textAlign="center">
          Buy cryptocurrency instantly with PIX - Brazil's instant payment system
        </Text>
        <Badge colorScheme="green" p={2}>
          💸 Instant transfers • 🔒 Secure • 🇧🇷 Brazilian Real (BRL)
        </Badge>
      </VStack>

      {/* Amount and Currency Selection */}
      {!pixPayment && (
        <Card>
          <CardHeader>
            <Heading size="md">1. Enter Amount & Get Quote</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Grid templateColumns="2fr 1fr 1fr" gap={4} alignItems="end">
                <VStack align="start" spacing={2}>
                  <Text fontWeight="medium">Amount (BRL)</Text>
                  <Input
                    placeholder="100.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    min="10"
                    max="50000"
                    size="lg"
                  />
                  <Text fontSize="sm" color="gray.500">
                    Min: R$ 10.00 • Max: R$ 50,000.00
                  </Text>
                </VStack>
                
                <VStack align="start" spacing={2}>
                  <Text fontWeight="medium">Target Crypto</Text>
                  <Select
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value as PaymentCurrency)}
                    size="lg"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH</option>
                    <option value="MATIC">MATIC</option>
                  </Select>
                </VStack>
                
                <Button
                  colorScheme="blue"
                  onClick={handleGetQuote}
                  isLoading={isQuoteLoading}
                  loadingText="Getting Quote"
                  size="lg"
                  isDisabled={!amount || parseFloat(amount) <= 0}
                >
                  Get Quote
                </Button>
              </Grid>

              {/* Quote Display */}
              {quote && (
                <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="bold" color="blue.700">Conversion Quote</Text>
                      <Badge colorScheme="blue">
                        Expires in {Math.ceil((quote.expiresAt.getTime() - Date.now()) / 60000)} min
                      </Badge>
                    </HStack>
                    
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Stat size="sm">
                        <StatLabel>You Pay</StatLabel>
                        <StatNumber>R$ {quote.amount.toFixed(2)}</StatNumber>
                        <StatHelpText>Brazilian Real</StatHelpText>
                      </Stat>
                      
                      <Stat size="sm">
                        <StatLabel>You Receive</StatLabel>
                        <StatNumber>{quote.estimatedOutput.toFixed(6)} {quote.toCurrency}</StatNumber>
                        <StatHelpText>Rate: {quote.rate.toFixed(4)}</StatHelpText>
                      </Stat>
                    </Grid>
                    
                    <HStack justify="space-between" fontSize="sm" color="gray.600">
                      <Text>Processing Fee: R$ {quote.fees.total.toFixed(2)}</Text>
                      <Text>Provider: {quote.provider}</Text>
                    </HStack>
                    
                    <Button
                      colorScheme="blue"
                      onClick={handleCreatePIXPayment}
                      isLoading={isLoading}
                      loadingText="Creating Payment"
                      size="lg"
                    >
                      Create PIX Payment
                    </Button>
                  </VStack>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* PIX Payment Instructions */}
      {pixPayment && (
        <Card>
          <CardHeader>
            <HStack justify="space-between" align="center">
              <Heading size="md">2. Complete PIX Payment</Heading>
              <HStack spacing={2}>
                <Badge colorScheme={getStatusColor(pixPayment.status)} p={2}>
                  <HStack spacing={1}>
                    <Icon as={getStatusIcon(pixPayment.status)} />
                    <Text>{pixPayment.status.toUpperCase()}</Text>
                  </HStack>
                </Badge>
                {pixPayment.status === 'pending' && (
                  <Badge colorScheme="orange" p={2}>
                    <HStack spacing={1}>
                      <FiClock />
                      <Text>{formatTimeRemaining(timeRemaining)}</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            {pixPayment.status === 'pending' && (
              <VStack spacing={6} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Complete your PIX payment</Text>
                    <Text fontSize="sm">
                      Use your bank app to scan the QR code or copy the PIX key below
                    </Text>
                  </Box>
                </Alert>

                <Grid templateColumns="1fr 1fr" gap={6}>
                  {/* QR Code */}
                  <VStack spacing={3}>
                    <Text fontWeight="bold">Scan QR Code</Text>
                    <Box p={4} bg="white" borderRadius="md" border="1px" borderColor="gray.200">
                      {pixPayment.qrCode ? (
                        <Image src={pixPayment.qrCode} alt="PIX QR Code" maxW="200px" />
                      ) : (
                        <Box w="200px" h="200px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                          <Text color="gray.500">QR Code</Text>
                        </Box>
                      )}
                    </Box>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      Open your bank app and scan this code
                    </Text>
                  </VStack>

                  {/* PIX Key */}
                  <VStack spacing={3} align="stretch">
                    <Text fontWeight="bold">Or Copy PIX Key</Text>
                    <VStack spacing={2} align="stretch">
                      <Text fontSize="sm" color="gray.600">PIX Key:</Text>
                      <HStack>
                        <Code p={2} fontSize="sm" flex={1} wordBreak="break-all">
                          {pixPayment.pixKey}
                        </Code>
                        <Tooltip label="Copy PIX key">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyToClipboard(pixPayment.pixKey, 'PIX key')}
                          >
                            <FiCopy />
                          </Button>
                        </Tooltip>
                      </HStack>
                    </VStack>
                    
                    <VStack spacing={2} align="stretch">
                      <Text fontSize="sm" color="gray.600">Amount:</Text>
                      <HStack>
                        <Code p={2} fontSize="lg" flex={1}>
                          R$ {pixPayment.amount.toFixed(2)}
                        </Code>
                        <Tooltip label="Copy amount">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyToClipboard(pixPayment.amount.toFixed(2), 'Amount')}
                          >
                            <FiCopy />
                          </Button>
                        </Tooltip>
                      </HStack>
                    </VStack>

                    <Alert status="warning" size="sm">
                      <AlertIcon />
                      <Text fontSize="sm">
                        Payment will expire in {formatTimeRemaining(timeRemaining)}
                      </Text>
                    </Alert>
                  </VStack>
                </Grid>

                <Progress value={(1 - timeRemaining / (30 * 60 * 1000)) * 100} colorScheme="blue" />
              </VStack>
            )}

            {pixPayment.status === 'paid' && (
              <VStack spacing={4}>
                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">PIX Payment Confirmed!</Text>
                    <Text fontSize="sm">
                      Your crypto purchase is being processed and will arrive shortly
                    </Text>
                  </Box>
                </Alert>
                
                <HStack spacing={4}>
                  <Icon as={FiCheck} color="green.500" w={6} h={6} />
                  <Text>PIX payment received at {pixPayment.paidAt?.toLocaleTimeString()}</Text>
                </HStack>
                
                <Spinner size="lg" color="blue.500" />
                <Text color="gray.600">Processing your crypto purchase...</Text>
              </VStack>
            )}

            {(pixPayment.status === 'expired' || pixPayment.status === 'cancelled') && (
              <VStack spacing={4}>
                <Alert status="error">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">
                      PIX Payment {pixPayment.status === 'expired' ? 'Expired' : 'Cancelled'}
                    </Text>
                    <Text fontSize="sm">
                      Please create a new payment to continue with your crypto purchase
                    </Text>
                  </Box>
                </Alert>
                
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    setPixPayment(null);
                    setQuote(null);
                  }}
                >
                  Create New Payment
                </Button>
              </VStack>
            )}
          </CardBody>
        </Card>
      )}

      {/* Information */}
      <Card>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold">How PIX On-Ramp Works:</Text>
            <VStack spacing={2} align="start" pl={4}>
              <Text fontSize="sm">1. 💰 Enter the amount in Brazilian Real (BRL) you want to spend</Text>
              <Text fontSize="sm">2. 🎯 Choose which cryptocurrency you want to receive</Text>
              <Text fontSize="sm">3. 📱 Complete the PIX payment using your bank app</Text>
              <Text fontSize="sm">4. ⚡ Receive crypto in your wallet within minutes</Text>
            </VStack>
            
            <Divider />
            
            <HStack justify="space-between" fontSize="sm" color="gray.600">
              <Text>🔒 Secure & Regulated</Text>
              <Text>⚡ Instant Processing</Text>
              <Text>🇧🇷 Brazilian Banking System</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};