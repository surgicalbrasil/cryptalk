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
  Avatar,
  Divider,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { AIAgent } from '../types';

interface AIAgentSelectorProps {
  agents: AIAgent[];
  selectedAgent: AIAgent | null;
  onAgentSelect: (agent: AIAgent) => void;
  disabled?: boolean;
}

export const AIAgentSelector: React.FC<AIAgentSelectorProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  disabled = false
}) => {
  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="semibold">
          Select AI Agent
        </Text>
        {selectedAgent && (
          <Badge colorScheme="blue" p={2}>
            {selectedAgent.icon} {selectedAgent.name}
          </Badge>
        )}
      </HStack>

      {agents.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          <Text>No AI agents available for this document type.</Text>
        </Alert>
      ) : (
        <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
          {agents.map((agent) => (
            <GridItem key={agent.id}>
              <Card
                cursor={disabled ? 'not-allowed' : 'pointer'}
                opacity={disabled ? 0.6 : 1}
                border="2px"
                borderColor={
                  selectedAgent?.id === agent.id ? 'blue.300' : 'gray.200'
                }
                bg={selectedAgent?.id === agent.id ? 'blue.50' : 'white'}
                transition="all 0.2s"
                _hover={
                  !disabled
                    ? {
                        borderColor: 'blue.300',
                        bg: 'blue.50',
                        transform: 'translateY(-2px)',
                        shadow: 'md'
                      }
                    : {}
                }
                onClick={() => !disabled && onAgentSelect(agent)}
              >
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {/* Agent Header */}
                    <HStack spacing={3}>
                      <Avatar
                        name={agent.name}
                        size="md"
                        bg="blue.500"
                        color="white"
                      />
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Text fontSize="xl">{agent.icon}</Text>
                          <Text fontSize="lg" fontWeight="bold">
                            {agent.name}
                          </Text>
                        </HStack>
                        <Badge
                          colorScheme={agent.available ? 'green' : 'gray'}
                          size="sm"
                        >
                          {agent.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </VStack>
                    </HStack>

                    {/* Agent Description */}
                    <Text fontSize="sm" color="gray.600">
                      {agent.description}
                    </Text>

                    <Divider />

                    {/* Expertise */}
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold">
                        Expertise:
                      </Text>
                      <VStack align="start" spacing={1}>
                        {agent.expertise.map((skill, index) => (
                          <HStack key={index} spacing={2}>
                            <Badge
                              colorScheme="blue"
                              variant="subtle"
                              fontSize="xs"
                            >
                              {skill}
                            </Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </VStack>

                    {/* Selection Button */}
                    <Button
                      size="sm"
                      colorScheme={selectedAgent?.id === agent.id ? 'blue' : 'gray'}
                      variant={selectedAgent?.id === agent.id ? 'solid' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) onAgentSelect(agent);
                      }}
                      disabled={disabled || !agent.available}
                    >
                      {selectedAgent?.id === agent.id ? 'Selected' : 'Select Agent'}
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      )}

      {/* Selected Agent Summary */}
      {selectedAgent && (
        <Box
          p={4}
          bg="blue.50"
          borderRadius="md"
          border="1px"
          borderColor="blue.200"
        >
          <VStack spacing={3} align="start">
            <HStack>
              <Text fontSize="lg">{selectedAgent.icon}</Text>
              <Text fontSize="md" fontWeight="semibold">
                {selectedAgent.name} Selected
              </Text>
            </HStack>
            
            <Text fontSize="sm" color="gray.700">
              {selectedAgent.description}
            </Text>
            
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="medium">
                Specializes in:
              </Text>
              {selectedAgent.expertise.slice(0, 3).map((skill, index) => (
                <Badge key={index} colorScheme="blue" size="sm">
                  {skill}
                </Badge>
              ))}
              {selectedAgent.expertise.length > 3 && (
                <Badge colorScheme="gray" size="sm">
                  +{selectedAgent.expertise.length - 3} more
                </Badge>
              )}
            </HStack>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};