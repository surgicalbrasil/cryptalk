import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Text,
  Input,
  Progress,
  VStack,
  HStack,
  Icon,
  useToast,
  Badge,
  Divider,
  Card,
  CardBody,
  CardHeader,
  CardFooter
} from '@chakra-ui/react';
import { AttachmentIcon, CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import web3StorageService from '../services/Web3StorageService';
import AppConfig from '../config/AppConfig';
import { getRecipientDID } from '../config/AppConfig';

interface FileUploadProps {
  onUploadSuccess?: (cid: string) => void;
  onUploadError?: (error: Error) => void;
  recipientDID?: string;
  paymentRequired?: boolean;
}

/**
 * FileUpload component for CrypTalk
 * This component handles file uploads to the service provider's Web3Storage
 */
const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  recipientDID = getRecipientDID(),
  paymentRequired = true
}) => {
  const { did } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCID, setUploadedCID] = useState<string | null>(null);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{cid: string, name: string, timestamp: string}[]>([]);
  
  const allowedFileTypes = AppConfig.storage.allowedFileTypes;
  const maxFileSize = AppConfig.storage.maxFileSize;

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Check file type
      const isAllowedType = allowedFileTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          return file.type.match(type) !== null;
        }
      });
      
      // Check file size
      const isAllowedSize = file.size <= maxFileSize;
      
      if (!isAllowedType) {
        toast({
          title: 'Invalid file type',
          description: `Please upload one of the following file types: ${allowedFileTypes.join(', ')}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (!isAllowedSize) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${Math.floor(maxFileSize / (1024 * 1024))}MB`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      setSelectedFile(file);
      toast({
        title: 'File selected',
        description: `${file.name} (${formatFileSize(file.size)})`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (paymentRequired && !hasAgreedToTerms) {
      toast({
        title: 'Agreement required',
        description: 'Please confirm that payment has been completed',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // Create simulated progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = Math.floor(Math.random() * 10) + 5;
          const newProgress = Math.min(prev + increment, 90);
          return prev < 90 ? newProgress : prev;
        });
      }, 500);
      
      // Prepare file for upload
      const fileName = selectedFile.name;
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (!event.target || !event.target.result) {
            throw new Error('Failed to read file');
          }
          
          const fileContent = event.target.result as ArrayBuffer;
          const file = new File([fileContent], fileName, { type: selectedFile.type });
          
          // Upload file to Web3.Storage with encryption
          let result;
          if (file.type === 'application/pdf') {
            // Use specific PDF upload method for PDF files
            result = await web3StorageService.uploadEncryptedPDF(file, recipientDID);
          } else {
            // Use generic upload for other file types
            result = await web3StorageService.storeContent(
              await file.text(),
              {
                encrypted: AppConfig.storage.encryptData,
                name: fileName
              }
            );
          }
          
          clearInterval(progressInterval);
          
          if (!result.success || !result.cid) {
            throw new Error(result.error || 'Upload failed');
          }
          
          setUploadProgress(100);
          setUploadedCID(result.cid);
          
          // Add to uploaded files list
          const newUpload = {
            cid: result.cid,
            name: fileName,
            timestamp: new Date().toISOString()
          };
          
          setUploadedFiles(prev => [...prev, newUpload]);
          
          toast({
            title: 'Upload successful',
            description: `File uploaded with CID: ${result.cid}`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          
          // Reset file input
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          // Call success callback if provided
          if (onUploadSuccess) {
            onUploadSuccess(result.cid);
          }
        } catch (error) {
          clearInterval(progressInterval);
          handleUploadError(error instanceof Error ? error : new Error(String(error)));
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        clearInterval(progressInterval);
        handleUploadError(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      handleUploadError(error instanceof Error ? error : new Error(String(error)));
      setIsUploading(false);
    }
  };
  
  // Handle upload error
  const handleUploadError = (error: Error) => {
    setUploadProgress(0);
    
    toast({
      title: 'Upload failed',
      description: error.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    
    if (onUploadError) {
      onUploadError(error);
    }
  };
  
  // Render file list
  const renderFileList = () => {
    if (uploadedFiles.length === 0) return null;
    
    return (
      <Box mt={6}>
        <Divider mb={4} />
        <Text fontWeight="bold" mb={2}>Uploaded Files:</Text>
        <VStack align="stretch" spacing={2}>
          {uploadedFiles.map((file, index) => (
            <Card key={index} size="sm" variant="outline">
              <CardBody p={3}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">{file.name}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(file.timestamp).toLocaleString()}
                    </Text>
                  </VStack>
                  <Badge colorScheme="green" variant="solid">
                    <HStack spacing={1}>
                      <CheckIcon boxSize={3} />
                      <Text>Uploaded</Text>
                    </HStack>
                  </Badge>
                </HStack>
                <Text fontSize="xs" mt={2} color="gray.500" fontFamily="monospace">
                  CID: {file.cid}
                </Text>
              </CardBody>
            </Card>
          ))}
        </VStack>
      </Box>
    );
  };
  
  return (
    <Box>
      <Card variant="outline" p={4}>
        <CardHeader pb={2} px={2}>
          <Text fontSize="xl" fontWeight="bold">
            Send File to {AppConfig.serviceProvider.name}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Files will be securely stored and encrypted in Web3.Storage
          </Text>
        </CardHeader>
        
        <CardBody pt={0} px={2}>
          <VStack spacing={4} align="start" width="100%">
            <FormControl>
              <FormLabel>Select File</FormLabel>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                disabled={isUploading}
                variant="filled"
                accept={allowedFileTypes.join(',')}
                p={1}
              />
              <FormHelperText>
                Max size: {Math.floor(maxFileSize / (1024 * 1024))}MB. 
                Allowed types: {allowedFileTypes.join(', ')}
              </FormHelperText>
            </FormControl>
            
            {selectedFile && (
              <Box width="100%" p={3} bg="gray.50" borderRadius="md">
                <HStack>
                  <AttachmentIcon color="blue.500" />
                  <VStack spacing={0} align="start">
                    <Text fontWeight="medium">{selectedFile.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {formatFileSize(selectedFile.size)}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}
            
            {paymentRequired && (
              <FormControl>
                <FormLabel>Payment Verification</FormLabel>
                <HStack>
                  <Input 
                    type="checkbox" 
                    checked={hasAgreedToTerms}
                    onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                    disabled={isUploading}
                    width="auto"
                  />
                  <Text>I confirm that payment has been completed for this service</Text>
                </HStack>
              </FormControl>
            )}
            
            {isUploading && (
              <Box width="100%">
                <Text mb={1}>Uploading: {uploadProgress}%</Text>
                <Progress value={uploadProgress} size="sm" colorScheme="blue" width="100%" />
              </Box>
            )}
          </VStack>
        </CardBody>
        
        <CardFooter pt={2} px={2}>
          <Button
            colorScheme="blue"
            onClick={handleUpload}
            isLoading={isUploading}
            loadingText="Uploading..."
            isDisabled={!selectedFile || isUploading || (paymentRequired && !hasAgreedToTerms)}
            leftIcon={<Icon as={AttachmentIcon} />}
          >
            Upload File
          </Button>
        </CardFooter>
      </Card>
      
      {renderFileList()}
    </Box>
  );
};

export default FileUpload;
