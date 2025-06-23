import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import LoginMetaMask from './pages/LoginMetaMask';
import Dashboard from './pages/Dashboard';
import OnChain from './pages/OnChain';
import Settings from './pages/Settings';
import { ChakraProvider } from '@chakra-ui/react';
import './App.css';

// Protected route component - TEMPORARILY DISABLED FOR TESTING
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  // const { isAuthenticated, isEmailAuthenticated } = useAuth();

  // // Allow access if either traditional auth or email auth is active
  // if (!isAuthenticated && !isEmailAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  // TEMP: Skip authentication for testing
  return children;
};

// Public route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isEmailAuthenticated } = useAuth();

  // Redirect if either traditional auth or email auth is active
  if (isAuthenticated || isEmailAuthenticated) {
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
                element={<Navigate to="/dashboard" replace />}
              />
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/login-metamask" 
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
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/onchain" 
                element={
                  <ProtectedRoute>
                    <OnChain />
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