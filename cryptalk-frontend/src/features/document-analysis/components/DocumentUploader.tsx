import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Alert,
  AlertIcon,
  Badge,
  Icon,
  useToast,
  Divider,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiCheck } from 'react-icons/fi';
import { DocumentFile, DocumentCategory } from '../types';
import { formatFileSize } from '../../../shared/utils/formatters';

interface DocumentUploaderProps {
  category: DocumentCategory;
  onUpload: (file: File, category: DocumentCategory) => Promise<DocumentFile>;
  onFileSelect?: (files: DocumentFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  category,
  onUpload,
  onFileSelect,
  maxFiles = 5,
  disabled = false
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<DocumentFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<DocumentFile[]>([]);
  const toast = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const filesToUpload = acceptedFiles.slice(0, maxFiles - uploadedFiles.length);
    
    if (filesToUpload.length < acceptedFiles.length) {
      toast({
        title: 'File Limit Exceeded',
        description: `Only ${maxFiles} files are allowed. ${acceptedFiles.length - filesToUpload.length} files were ignored.`,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    }

    // Validate files
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    filesToUpload.forEach(file => {
      if (file.size > category.maxSize) {
        invalidFiles.push(file);
      } else if (!category.acceptedTypes.includes(file.type)) {
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid Files',
        description: `${invalidFiles.length} files were rejected due to size or type restrictions.`,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }

    // Upload valid files
    const uploadPromises = validFiles.map(async (file) => {
      try {
        const documentFile = await onUpload(file, category);
        return documentFile;
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}`,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        return null;
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    const successfulUploads = results
      .filter((result): result is PromiseFulfilledResult<DocumentFile> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    if (successfulUploads.length > 0) {
      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      onFileSelect?.(successfulUploads);
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${successfulUploads.length} file(s)`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [category, onUpload, onFileSelect, maxFiles, uploadedFiles.length, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: category.acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles: maxFiles - uploadedFiles.length,
    disabled: disabled || uploadedFiles.length >= maxFiles
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    setUploadingFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📊';
    return '📄';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'uploading': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Drop Zone */}
      <Box
        {...getRootProps()}
        border="2px dashed"
        borderColor={isDragActive ? 'blue.300' : 'gray.300'}
        borderRadius="lg"
        p={8}
        textAlign="center"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        bg={isDragActive ? 'blue.50' : 'gray.50'}
        transition="all 0.2s"
        _hover={!disabled ? { borderColor: 'blue.400', bg: 'blue.50' } : {}}
        opacity={disabled ? 0.6 : 1}
      >
        <input {...getInputProps()} />
        <VStack spacing={4}>
          <Icon as={FiUpload} size="40px" color={isDragActive ? 'blue.500' : 'gray.500'} />
          <VStack spacing={2}>
            <Text fontSize="lg" fontWeight="semibold">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </Text>
            <Text fontSize="sm" color="gray.500">
              or click to select files
            </Text>
          </VStack>
          
          {/* File Requirements */}
          <VStack spacing={2} pt={4}>
            <HStack spacing={2} flexWrap="wrap" justify="center">
              <Badge colorScheme="blue" fontSize="xs">
                Max {formatFileSize(category.maxSize)}
              </Badge>
              <Badge colorScheme="green" fontSize="xs">
                {category.acceptedTypes.length} file types
              </Badge>
              <Badge colorScheme="purple" fontSize="xs">
                Up to {maxFiles} files
              </Badge>
            </HStack>
            
            <Text fontSize="xs" color="gray.500">
              Accepted: {category.acceptedTypes.map(type => {
                const ext = type.split('/').pop()?.toUpperCase();
                return ext?.includes('OFFICEDOCUMENT') ? 'DOCX/XLSX/PPTX' : ext;
              }).join(', ')}
            </Text>
          </VStack>
        </VStack>
      </Box>

      {/* File List */}
      {(uploadingFiles.length > 0 || uploadedFiles.length > 0) && (
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={4}>
            {uploadedFiles.length > 0 && `Uploaded Files (${uploadedFiles.length}/${maxFiles})`}
          </Text>
          
          <VStack spacing={3} align="stretch">
            {[...uploadingFiles, ...uploadedFiles].map((file) => (
              <Box
                key={file.id}
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                p={4}
                bg="white"
              >
                <Grid templateColumns="auto 1fr auto auto" gap={4} alignItems="center">
                  <GridItem>
                    <Text fontSize="2xl">{getFileIcon(file.type)}</Text>
                  </GridItem>
                  
                  <GridItem>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {file.name}
                      </Text>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500">
                          {formatFileSize(file.size)}
                        </Text>
                        <Badge colorScheme={getStatusColor(file.uploadStatus)} size="sm">
                          {file.uploadStatus}
                        </Badge>
                      </HStack>
                    </VStack>
                  </GridItem>
                  
                  <GridItem>
                    {file.uploadStatus === 'uploading' && (
                      <Progress
                        value={file.uploadProgress}
                        size="sm"
                        colorScheme="blue"
                        width="100px"
                      />
                    )}
                    {file.uploadStatus === 'completed' && (
                      <Icon as={FiCheck} color="green.500" />
                    )}
                  </GridItem>
                  
                  <GridItem>
                    <Button
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeFile(file.id)}
                    >
                      <Icon as={FiX} />
                    </Button>
                  </GridItem>
                </Grid>
                
                {file.uploadStatus === 'uploading' && (
                  <Progress
                    value={file.uploadProgress}
                    size="xs"
                    colorScheme="blue"
                    mt={2}
                  />
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Upload Limit Warning */}
      {uploadedFiles.length >= maxFiles && (
        <Alert status="warning">
          <AlertIcon />
          <Text fontSize="sm">
            Upload limit reached ({maxFiles} files). Remove files to upload more.
          </Text>
        </Alert>
      )}
    </VStack>
  );
};