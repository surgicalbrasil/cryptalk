import React, { useCallback, useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Icon,
  Progress,
  HStack,
  Badge,
  Button,
  useToast,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
// import { useDropzone } from 'react-dropzone'; // TODO: Install react-dropzone
// Temporary mock implementation for testing
const useDropzone = ({ onDrop, accept, maxSize, maxFiles }: any) => ({
  getRootProps: () => ({ onClick: () => {} }),
  getInputProps: () => ({}),
  isDragActive: false,
  isDragReject: false
});
import { FiUpload, FiFile, FiCheck, FiX } from 'react-icons/fi';
import { useFileUpload } from '../hooks/useFileUpload';
import { DocumentCategory } from '../../../shared/types';

interface FileUploadZoneProps {
  category: DocumentCategory;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  onUploadComplete?: (files: any[]) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  category,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  onUploadComplete
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { uploadProgress, isUploading, uploadFile, uploadMultipleFiles } = useFileUpload();
  const toast = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      if (acceptedFiles.length > maxFiles) {
        toast({
          title: 'Too many files',
          description: `Maximum ${maxFiles} files allowed`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const oversizedFiles = acceptedFiles.filter(file => file.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const uploadedResults = await uploadMultipleFiles(acceptedFiles, category);
      setUploadedFiles(prev => [...prev, ...uploadedResults]);
      
      toast({
        title: 'Files uploaded successfully',
        description: `${acceptedFiles.length} file(s) uploaded to ${category}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onUploadComplete?.(uploadedResults);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [category, maxFiles, maxFileSize, uploadMultipleFiles, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
    maxFiles
  });

  const getBorderColor = () => {
    if (isDragReject) return 'red.300';
    if (isDragActive) return 'blue.300';
    return 'gray.300';
  };

  const getBackgroundColor = () => {
    if (isDragReject) return 'red.50';
    if (isDragActive) return 'blue.50';
    return 'gray.50';
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Upload Zone */}
      <Box
        {...getRootProps()}
        p={8}
        border="2px"
        borderStyle="dashed"
        borderColor={getBorderColor()}
        borderRadius="lg"
        bg={getBackgroundColor()}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: 'blue.400',
          bg: 'blue.50'
        }}
      >
        <input {...getInputProps()} />
        <VStack spacing={4}>
          <Icon as={FiUpload} w={12} h={12} color="gray.400" />
          
          {isDragActive ? (
            <Text fontSize="lg" fontWeight="medium" color="blue.600">
              Drop files here to upload...
            </Text>
          ) : isDragReject ? (
            <Text fontSize="lg" fontWeight="medium" color="red.600">
              Some files are not supported
            </Text>
          ) : (
            <VStack spacing={2}>
              <Text fontSize="lg" fontWeight="medium" color="gray.600">
                Drag & drop files here, or click to select
              </Text>
              <Text fontSize="sm" color="gray.500">
                Supported: {acceptedFileTypes.join(', ')}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Max {maxFiles} files, {(maxFileSize / 1024 / 1024).toFixed(0)}MB each
              </Text>
            </VStack>
          )}
          
          <Badge colorScheme="blue" variant="outline">
            Category: {category}
          </Badge>
        </VStack>
      </Box>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <VStack spacing={2} align="stretch">
          <Text fontWeight="medium">Upload Progress:</Text>
          {uploadProgress.map((progress) => (
            <Box key={progress.fileId} p={3} bg="gray.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">
                  File {progress.fileId.split('-').pop()}
                </Text>
                <Badge 
                  colorScheme={
                    progress.status === 'completed' ? 'green' :
                    progress.status === 'failed' ? 'red' :
                    'blue'
                  }
                >
                  {progress.status}
                </Badge>
              </HStack>
              <Progress 
                value={progress.progress} 
                colorScheme={
                  progress.status === 'completed' ? 'green' :
                  progress.status === 'failed' ? 'red' :
                  'blue'
                }
                size="sm"
              />
            </Box>
          ))}
        </VStack>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <VStack spacing={2} align="stretch">
          <Text fontWeight="medium">Uploaded Files:</Text>
          <List spacing={2}>
            {uploadedFiles.map((file) => (
              <ListItem key={file.id} p={2} bg="green.50" borderRadius="md">
                <HStack justify="space-between">
                  <HStack>
                    <ListIcon as={FiCheck} color="green.500" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">{file.name}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {(file.size / 1024).toFixed(1)} KB • {file.type}
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="green" size="sm">
                    {file.encrypted ? '🔒 Encrypted' : '📄 Plain'}
                  </Badge>
                </HStack>
              </ListItem>
            ))}
          </List>
        </VStack>
      )}
    </VStack>
  );
};