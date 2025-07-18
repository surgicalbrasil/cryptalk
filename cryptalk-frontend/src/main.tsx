import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'  // Beautiful full app with login/dashboard
// import App from './app/App.tsx'  // Simple modular demo
// import App from './App.simple.tsx' // Using simplified version
import ErrorBoundary from './components/ErrorBoundary'

// Fix for Magic SDK logger issue - Global logger polyfill
if (typeof window !== 'undefined') {
  const logger = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };
  
  // Add logger to window
  if (!window.logger) {
    window.logger = logger;
  }
  
  // Add logger to global scope (for modules that expect it)
  if (typeof globalThis !== 'undefined' && !globalThis.logger) {
    globalThis.logger = logger;
  }
  
  // Add logger to self (for web workers)
  if (typeof self !== 'undefined' && !self.logger) {
    self.logger = logger;
  }
}

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
