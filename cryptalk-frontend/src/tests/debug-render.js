// Debug script to check for render errors
import * as React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';

// Create a simple wrapper to catch errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Rendering error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#ffeeee', color: 'red' }}>
          <h2>Something went wrong.</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Create a minimal test renderer
try {
  const testDiv = document.createElement('div');
  testDiv.id = 'debug-root';
  document.body.appendChild(testDiv);
  
  const root = ReactDOM.createRoot(testDiv);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  console.log("Debug render completed successfully");
} catch (e) {
  console.error("Error during initial render setup:", e);
}
