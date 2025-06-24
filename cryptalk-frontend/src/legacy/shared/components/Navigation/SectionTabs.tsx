import React from 'react';
import { HStack, Button, Text } from '@chakra-ui/react';

interface TabOption {
  id: string;
  label: string;
  icon: string;
  colorScheme: string;
}

interface SectionTabsProps {
  options: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  justify?: 'center' | 'flex-start' | 'flex-end';
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
  options,
  activeTab,
  onTabChange,
  justify = 'center'
}) => {
  return (
    <HStack spacing={4} mb={6} justify={justify}>
      {options.map((option) => (
        <Button
          key={option.id}
          leftIcon={<Text>{option.icon}</Text>}
          colorScheme={activeTab === option.id ? option.colorScheme : 'gray'}
          variant={activeTab === option.id ? 'solid' : 'outline'}
          onClick={() => onTabChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </HStack>
  );
};