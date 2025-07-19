import React from 'react';
import { Badge, BadgeProps } from '@chakra-ui/react';

interface StatusBadgeProps extends Omit<BadgeProps, 'colorScheme'> {
  status: 'success' | 'error' | 'warning' | 'info' | 'pending' | 'processing' | 'completed' | 'failed';
  children: React.ReactNode;
}

const statusColorMap = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
  pending: 'orange',
  processing: 'blue',
  completed: 'green',
  failed: 'red'
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  ...props
}) => {
  return (
    <Badge colorScheme={statusColorMap[status]} {...props}>
      {children}
    </Badge>
  );
};