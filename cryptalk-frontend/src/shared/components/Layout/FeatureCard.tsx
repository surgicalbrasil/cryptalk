import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  Alert,
  AlertIcon,
  Button,
  Text,
  Box
} from '@chakra-ui/react';

interface FeatureCardProps {
  title: string;
  icon: string;
  headerBg: string;
  alertStatus: 'info' | 'success' | 'warning' | 'error';
  alertTitle?: string;
  alertMessage: string;
  children?: React.ReactNode;
  actionButton?: {
    text: string;
    colorScheme: string;
    icon?: string;
    onClick?: () => void;
    disabled?: boolean;
  };
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  icon,
  headerBg,
  alertStatus,
  alertTitle,
  alertMessage,
  children,
  actionButton
}) => {
  return (
    <Card>
      <CardHeader bg={headerBg}>
        <Heading size="md">{icon} {title}</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Alert status={alertStatus}>
            <AlertIcon />
            <Box>
              {alertTitle && <Text fontWeight="bold">{alertTitle}</Text>}
              <Text fontSize="sm">{alertMessage}</Text>
            </Box>
          </Alert>
          
          {children}
          
          {actionButton && (
            <Button
              colorScheme={actionButton.colorScheme}
              size="lg"
              onClick={actionButton.onClick}
              isDisabled={actionButton.disabled}
              leftIcon={actionButton.icon ? <Text>{actionButton.icon}</Text> : undefined}
            >
              {actionButton.text}
            </Button>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};