import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import LoginMetaMask from './pages/LoginMetaMask';
import Dashboard from './pages/Dashboard';
import ModularDashboard from './pages/ModularDashboard';
import Settings from './pages/Settings';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import { TestModeBanner } from './components/TestModeBanner';
import { TEST_CONFIG } from './config/testMode';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isEmailAuthenticated } = useAuth();

  // Skip auth checks in test mode
  if (TEST_CONFIG.skipAuthChecks) {
    return children;
  }

  // Allow access if either traditional auth or email auth is active
  if (!isAuthenticated && !isEmailAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isEmailAuthenticated } = useAuth();

  // Auto-redirect to dashboard in test mode
  if (TEST_CONFIG.autoLogin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect if either traditional auth or email auth is active
  if (isAuthenticated || isEmailAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Public routes */}
              <Route 
                path="/" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
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
                    <>
                      <TestModeBanner />
                      <ModularDashboard />
                    </>
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