import React from 'react';

const LoadingFallback: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{ color: '#2D3748' }}>CrypTalk</h1>
      <p style={{ color: '#718096' }}>Loading...</p>
      <div style={{
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#4299E1',
        color: 'white',
        borderRadius: '5px'
      }}>
        Initializing Application
      </div>
    </div>
  );
};

export default LoadingFallback;