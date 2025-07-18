import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Grid,
  GridItem,
  Card,
  CardBody,
  Icon,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiFile, FiUpload } from 'react-icons/fi';
import { DocumentCategory } from '../../../shared/types';
import { DocumentService } from '../../document-analysis/services/documentService';
import { formatFileSize } from '../../../shared/utils/formatters';

interface DocumentTypeSelectorProps {
  onTypeSelect: (type: DocumentCategory) => void;
  selectedType?: DocumentCategory;
  disabled?: boolean;
}

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  onTypeSelect,
  selectedType,
  disabled = false
}) => {
  const categories = DocumentService.getDocumentCategories();

  const getFileTypeText = (types: string[]): string => {
    const extensions = types.map(type => {
      if (type.includes('pdf')) return 'PDF';
      if (type.includes('word')) return 'DOC';
      if (type.includes('excel') || type.includes('sheet')) return 'XLS';
      if (type.includes('powerpoint') || type.includes('presentation')) return 'PPT';
      if (type.includes('markdown')) return 'MD';
      return type.split('/').pop()?.toUpperCase() || 'FILE';
    });
    return extensions.join(', ');
  };

  return (
    <VStack spacing={4} align="stretch">
      {categories.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          <Text>No document categories available at the moment.</Text>
        </Alert>
      ) : (
        <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
          {categories.map((category) => (
            <GridItem key={category.id}>
              <Card
                cursor={disabled ? 'not-allowed' : 'pointer'}
                opacity={disabled ? 0.6 : 1}
                border="2px"
                borderColor={
                  selectedType?.id === category.id ? 'green.300' : 'gray.200'
                }
                bg={selectedType?.id === category.id ? 'green.50' : 'white'}
                transition="all 0.2s"
                _hover={
                  !disabled
                    ? {
                        borderColor: 'green.300',
                        bg: 'green.50',
                        transform: 'translateY(-2px)',
                        shadow: 'md'
                      }
                    : {}
                }
                onClick={() => !disabled && onTypeSelect(category)}
              >
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {/* Category Header */}
                    <HStack spacing={3}>
                      <Box
                        fontSize="3xl"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        w="60px"
                        h="60px"
                        bg="gray.100"
                        borderRadius="lg"
                      >
                        <Text>{category.icon}</Text>
                      </Box>
                      
                      <VStack align="start" spacing={1} flex="1">
                        <Text fontSize="lg" fontWeight="bold">
                          {category.name}
                        </Text>
                        <Badge colorScheme="blue" size="sm">
                          {category.agents.length} AI Agents
                        </Badge>
                      </VStack>
                    </HStack>

                    {/* Category Description */}
                    <Text fontSize="sm" color="gray.600">
                      {category.description}
                    </Text>

                    {/* File Requirements */}
                    <VStack spacing={2} align="start">
                      <HStack spacing={2}>
                        <Icon as={FiFile} color="gray.500" />
                        <Text fontSize="sm" fontWeight="medium">
                          Accepted Files:
                        </Text>
                      </HStack>
                      
                      <HStack spacing={1} flexWrap="wrap">
                        {getFileTypeText(category.acceptedTypes).split(', ').map((type, index) => (
                          <Badge key={index} colorScheme="gray" size="sm">
                            {type}
                          </Badge>
                        ))}
                      </HStack>
                      
                      <HStack spacing={2}>
                        <Icon as={FiUpload} color="gray.500" />
                        <Text fontSize="sm" color="gray.600">
                          Max size: {formatFileSize(category.maxSize)}
                        </Text>
                      </HStack>
                    </VStack>

                    {/* AI Agents Preview */}
                    <VStack spacing={2} align="start">
                      <Text fontSize="sm" fontWeight="medium">
                        Available AI Agents:
                      </Text>
                      <VStack align="start" spacing={1}>
                        {category.agents.slice(0, 3).map((agent) => (
                          <HStack key={agent.id} spacing={2}>
                            <Text fontSize="sm">{agent.icon}</Text>
                            <Text fontSize="sm" color="gray.600">
                              {agent.name}
                            </Text>
                          </HStack>
                        ))}
                        {category.agents.length > 3 && (
                          <Text fontSize="sm" color="gray.500">
                            +{category.agents.length - 3} more agents
                          </Text>
                        )}
                      </VStack>
                    </VStack>

                    {/* Selection Button */}
                    <Button
                      colorScheme={selectedType?.id === category.id ? 'green' : 'gray'}
                      variant={selectedType?.id === category.id ? 'solid' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) onTypeSelect(category);
                      }}
                      disabled={disabled}
                      leftIcon={selectedType?.id === category.id ? <Icon as={FiUpload} /> : undefined}
                    >
                      {selectedType?.id === category.id ? 'Selected' : 'Select Category'}
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      )}

      {/* Selected Category Summary */}
      {selectedType && (
        <Box
          p={4}
          bg="green.50"
          borderRadius="md"
          border="1px"
          borderColor="green.200"
        >
          <VStack spacing={3} align="start">
            <HStack>
              <Text fontSize="lg">{selectedType.icon}</Text>
              <Text fontSize="md" fontWeight="semibold">
                {selectedType.name} Selected
              </Text>
            </HStack>
            
            <Text fontSize="sm" color="gray.700">
              {selectedType.description}
            </Text>
            
            <HStack spacing={4} flexWrap="wrap">
              <Badge colorScheme="green" p={2}>
                📄 {getFileTypeText(selectedType.acceptedTypes)}
              </Badge>
              <Badge colorScheme="blue" p={2}>
                📊 Max {formatFileSize(selectedType.maxSize)}
              </Badge>
              <Badge colorScheme="purple" p={2}>
                🤖 {selectedType.agents.length} AI Agents
              </Badge>
            </HStack>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};