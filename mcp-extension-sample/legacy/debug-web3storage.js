// Debug script for Web3.Storage
console.log('Starting Web3.Storage debug script...');
console.log('Current time:', new Date().toISOString());
console.log('Node.js version:', process.version);

const token = 'z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';
console.log('Testing token:', token);

// Try with the require('node-fetch') approach
try {
  console.log('Attempting direct HTTP request...');
  const https = require('https');
  
  const options = {
    hostname: 'api.web3.storage',
    port: 443,
    path: '/user/uploads',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  console.log('Request options:', JSON.stringify(options));
  
  const req = https.request(options, (res) => {
    console.log('Response received!');
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', JSON.stringify(res.headers));
    
    let responseData = '';
    
    res.on('data', (chunk) => {
      console.log('Received data chunk of size:', chunk.length);
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response completed!');
      
      try {
        if (responseData.length > 0) {
          console.log('First 100 chars of response:', responseData.substring(0, 100));
          const parsedData = JSON.parse(responseData);
          console.log('Parsed response successfully!');
          console.log('Number of items:', parsedData.length);
        } else {
          console.log('Response was empty');
        }
      } catch (error) {
        console.error('Error parsing response:', error);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error making request:', error);
  });
  
  console.log('Sending request...');
  req.end();
  console.log('Request sent!');
  
} catch (error) {
  console.error('Error in direct HTTP request:', error);
}

// Keep the process alive to see all output
console.log('Script will exit in 10 seconds...');
setTimeout(() => {
  console.log('Debug script completed');
}, 10000);
