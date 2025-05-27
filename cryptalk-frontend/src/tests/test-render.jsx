// This is a simplified version of main.tsx to identify React rendering issues
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Simple component to test React rendering without other dependencies
const TestApp = () => {
  return (
    <div style={{ padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
      <h1>CrypTalk Test Render</h1>
      <p>If you can see this, basic React rendering is working.</p>
    </div>
  );
};

// Create simple error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  document.body.innerHTML = `
    <div style="padding: 20px; background: #ffeeee; color: #cc0000;">
      <h2>Error Detected</h2>
      <p>${event.error?.message || 'Unknown error'}</p>
      <pre>${event.error?.stack || 'No stack trace available'}</pre>
    </div>
  `;
});

try {
  console.log('Test render starting...');
  console.log('React version:', React.version);
  
  // Create root element
  const container = document.createElement('div');
  container.id = 'test-root';
  document.body.appendChild(container);
  
  // Render test component
  createRoot(container).render(
    <StrictMode>
      <TestApp />
    </StrictMode>
  );
  
  console.log('Test render completed successfully');
} catch (error) {
  console.error('Error during test render:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; background: #ffeeee; color: #cc0000;">
      <h2>Render Setup Failed</h2>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
    </div>
  `;
}
