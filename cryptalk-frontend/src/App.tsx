import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginMetaMask from './pages/LoginMetaMask';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import ClientWorkflow from './pages/ClientWorkflow';
import TestUpload from './pages/TestUpload';
import TestDirectUpload from './pages/TestDirectUpload';
import Web3StorageSetup from './pages/Web3StorageSetup';
import { ChakraProvider } from '@chakra-ui/react';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Public routes */}
              <Route 
                path="/" 
                element={
                  <PublicRoute>
                    <LoginMetaMask />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginMetaMask />
                  </PublicRoute>
                } 
              />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <ClientDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat/general" 
                element={
                  <ProtectedRoute>
                    <Chat chatType="off-chain" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat/secure" 
                element={
                  <ProtectedRoute>
                    <Chat chatType="on-chain" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/payments" 
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/workflow" 
                element={
                  <ProtectedRoute>
                    <ClientWorkflow />
                  </ProtectedRoute>
                } 
              />
              
              {/* Test routes - public */}
              <Route path="/test-upload" element={<TestUpload />} />
              <Route path="/test-direct" element={<TestDirectUpload />} />
              <Route path="/w3-setup" element={<Web3StorageSetup />} />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;