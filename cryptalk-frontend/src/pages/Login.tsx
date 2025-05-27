import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  useToast,
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Image,
  Divider,
  HStack,
  Center,
  Spinner
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import AppConfig from '../config/AppConfig';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const Login: React.FC = () => {
  // Redirect to the MetaMask login component automatically
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login-metamask'); // Redirect to MetaMask login
  }, [navigate]);
  
  return <></>;  // Empty component as we're redirecting
};

export default Login;