// Simple script to test Web3.Storage token with fetch
const https = require('https');

const token = 'z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';
console.log('Testing Web3.Storage token:', token);

// Make a simple GET request to the API
const options = {
  hostname: 'api.web3.storage',
  path: '/user/uploads?size=5',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

console.log('Sending request to Web3.Storage API...');

const req = https.get(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received.');
    if (res.statusCode === 200) {
      console.log('SUCCESS! Your Web3.Storage token is valid.');
      try {
        const uploads = JSON.parse(data);
        console.log(`Found ${uploads.length} uploads in your account.`);
      } catch (e) {
        console.log('Could not parse response data:', e.message);
      }
    } else {
      console.log('FAILED! Your token might be invalid.');
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error.message);
});

// Add a simple timeout
console.log('Waiting for response...');
