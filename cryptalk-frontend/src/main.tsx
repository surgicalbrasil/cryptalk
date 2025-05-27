import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import App from './App.simple.tsx' // Using simplified version
import ErrorBoundary from './components/ErrorBoundary'

// Debug logging
console.log('CrypTalk: main.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('CrypTalk: Root element not found!');
  document.body.innerHTML = '<div style="padding:20px;color:red;">Error: Root element not found</div>';
} else {
  console.log('CrypTalk: Creating React root...');
  
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('CrypTalk: React app rendered');
  } catch (error) {
    console.error('CrypTalk: Error rendering app:', error);
    rootElement.innerHTML = `<div style="padding:20px;color:red;">Error rendering app: ${error}</div>`;
  }
}
