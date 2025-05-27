import React from 'react';

function AppTest() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>CrypTalk - Test Mode</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('Button clicked!')}>
        Test Button
      </button>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0e0e0' }}>
        <p>Debug Info:</p>
        <ul>
          <li>React: ✓ Working</li>
          <li>Page: Test Mode</li>
          <li>Next: Check main App component</li>
        </ul>
      </div>
    </div>
  );
}

export default AppTest;