import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginMetaMask from './pages/LoginMetaMask';
import ClientWorkflow from './pages/ClientWorkflow';
import { AuthProvider } from './contexts/AuthContext';

function SimpleApp() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginMetaMask />} />
            <Route path="/login" element={<LoginMetaMask />} />
            <Route path="/workflow" element={<ClientWorkflow />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default SimpleApp;