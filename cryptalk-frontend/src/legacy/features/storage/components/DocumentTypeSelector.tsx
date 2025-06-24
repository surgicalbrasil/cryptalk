import React from 'react';
import { Grid, Button, Text, Icon } from '@chakra-ui/react';
import { FiFileText, FiUsers, FiShield } from 'react-icons/fi';
import { DocumentCategory } from '../../../shared/types';

interface DocumentType {
  id: DocumentCategory;
  name: string;
  description: string;
  icon: any;
  colorScheme: string;
}

interface DocumentTypeSelectorProps {
  onTypeSelect: (type: DocumentCategory) => void;
  selectedType?: DocumentCategory;
}

const documentTypes: DocumentType[] = [
  {
    id: 'presentations',
    name: 'Pitch Deck',
    description: 'Business presentations',
    icon: FiFileText,
    colorScheme: 'blue'
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'Projections & reports',
    icon: FiFileText,
    colorScheme: 'green'
  },
  {
    id: 'patents',
    name: 'Patents',
    description: 'IP documentation',
    icon: FiShield,
    colorScheme: 'purple'
  },
  {
    id: 'other',
    name: 'Cap Table',
    description: 'Equity structure',
    icon: FiUsers,
    colorScheme: 'orange'
  }
];

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  onTypeSelect,
  selectedType
}) => {
  return (
    <Grid templateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={3} w="full">
      {documentTypes.map((docType) => (
        <Button
          key={docType.id}
          variant={selectedType === docType.id ? 'solid' : 'outline'}
          colorScheme={docType.colorScheme}
          leftIcon={<Icon as={docType.icon} />}
          size="md"
          p={4}
          h="auto"
          flexDir="column"
          spacing={2}
          onClick={() => onTypeSelect(docType.id)}
        >
          <Text fontWeight="bold">{docType.name}</Text>
          <Text fontSize="xs" color="gray.600">{docType.description}</Text>
        </Button>
      ))}
    </Grid>
  );
};