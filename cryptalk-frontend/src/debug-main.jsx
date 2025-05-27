// Minimal main entry point for debugging white screen issue
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Simple component for testing
const TestComponent = () => {
  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>CrypTalk Render Test</h1>
      <p>If you can see this message, React is rendering correctly.</p>
    </div>
  );
};

// Log information about the environment
console.log('React version:', React.version);
console.log('Environment:', import.meta.env.MODE);

// Create a global error handler to catch any render errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  // Display error on page
  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.margin = '20px';
  errorDiv.style.backgroundColor = '#ffeeee';
  errorDiv.style.border = '1px solid #cc0000';
  errorDiv.style.borderRadius = '4px';
  
  errorDiv.innerHTML = `
    <h2>Error Detected</h2>
    <p><strong>${event.error?.message || 'Unknown error'}</strong></p>
    <pre style="overflow:auto;max-height:300px">${event.error?.stack || ''}</pre>
  `;
  
  document.body.appendChild(errorDiv);
});

// Try to render the test component
try {
  console.log('Attempting to render test component...');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found in the DOM');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <TestComponent />
    </React.StrictMode>
  );
  
  console.log('Render successful!');
} catch (error) {
  console.error('Failed to render:', error);
  
  // Create fallback content if render fails
  const fallbackContent = document.createElement('div');
  fallbackContent.style.padding = '20px';
  fallbackContent.innerHTML = `
    <h1>CrypTalk - Render Error</h1>
    <p>There was a problem rendering the application:</p>
    <div style="padding: 10px; background: #ffeeee; border: 1px solid #cc0000;">
      <strong>${error.message}</strong>
      <pre style="overflow:auto;max-height:300px">${error.stack}</pre>
    </div>
  `;
  
  document.body.appendChild(fallbackContent);
}
