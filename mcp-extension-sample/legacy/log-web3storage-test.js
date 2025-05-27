// Log-based debug test for Web3.Storage
const fs = require('fs');
const https = require('https');
const path = require('path');

// Create a log file
const logFile = path.join(__dirname, 'web3storage-test.log');
fs.writeFileSync(logFile, `Web3.Storage Test Log - ${new Date().toISOString()}\n\n`);

function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
}

// Your Web3.Storage token
const token = 'z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';

log(`Starting Web3.Storage test with token: ${token.substring(0, 4)}...${token.substring(token.length - 4)}`);
log(`Node.js version: ${process.version}`);

// Make a request to Web3.Storage API
const options = {
  hostname: 'api.web3.storage',
  path: '/user/uploads',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

log('Sending request to Web3.Storage API...');

const req = https.request(options, (res) => {
  log(`Response status code: ${res.statusCode}`);
  log(`Response headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    log(`Received data chunk of size: ${chunk.length}`);
  });
  
  res.on('end', () => {
    log('Response completed');
    
    if (res.statusCode === 200) {
      log('SUCCESS! Token is valid.');
      
      try {
        const parsedData = JSON.parse(data);
        log(`Found ${parsedData.length} uploads`);
        
        if (parsedData.length > 0) {
          log('\nRecent uploads:');
          parsedData.slice(0, 3).forEach((item, i) => {
            log(`${i+1}. CID: ${item.cid}`);
            log(`   Name: ${item.name || 'Unnamed'}`);
            log(`   Created: ${new Date(item.created).toLocaleString()}`);
          });
        }
      } catch (error) {
        log(`Error parsing response: ${error.message}`);
        log(`Raw response: ${data}`);
      }
    } else {
      log('FAILED! Token may be invalid.');
      log(`Response body: ${data}`);
    }
    
    log('\nTest completed. Check results in web3storage-test.log');
    log(`Log file location: ${logFile}`);
  });
});

req.on('error', (error) => {
  log(`Error making request: ${error.message}`);
  log(`Error stack: ${error.stack}`);
});

log('Sending request...');
req.end();
log('Request sent!');
