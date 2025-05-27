// Simple HTTP-based test for Web3.Storage
const https = require('https');

// Your Web3.Storage token
const token = 'z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';

// Function to make a simple API request to Web3.Storage
function testWebStorageAPI() {
  return new Promise((resolve, reject) => {
    console.log('Testing Web3.Storage API with your token...');
    
    // Options for the HTTP request
    const options = {
      hostname: 'api.web3.storage',
      path: '/user/uploads',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    };
    
    // Make the request
    const req = https.request(options, (res) => {
      let data = '';
      
      // Handle response data
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Process the complete response
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(data);
            console.log('✅ API Connection Successful!');
            console.log(`✅ Status Code: ${res.statusCode}`);
            console.log(`📊 Found ${parsedData.length} uploads in your account.`);
            
            if (parsedData.length > 0) {
              console.log('\nRecent uploads:');
              parsedData.slice(0, 5).forEach((item, i) => {
                console.log(`${i+1}. Name: ${item.name || 'Unnamed'}`);
                console.log(`   CID: ${item.cid}`);
                console.log(`   Created: ${new Date(item.created).toLocaleString()}`);
                console.log(`   Size: ${formatSize(item.dagSize)}`);
                console.log(`   URL: https://${item.cid}.ipfs.w3s.link`);
                console.log('---');
              });
            }
            
            resolve(true);
          } catch (error) {
            console.error('❌ Error parsing API response:', error.message);
            reject(error);
          }
        } else {
          console.error(`❌ API Error: Status Code ${res.statusCode}`);
          console.error(`Response: ${data}`);
          
          if (res.statusCode === 401) {
            console.error('The token appears to be invalid or expired.');
          } else if (res.statusCode === 404) {
            console.error('The API endpoint might have changed or is unavailable.');
          }
          
          reject(new Error(`API Error: ${res.statusCode}`));
        }
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      console.error('❌ Connection Error:', error.message);
      reject(error);
    });
    
    // Complete the request
    req.end();
  });
}

// Utility function to format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the test
console.log('🔑 Testing Web3.Storage Key: ' + token.substring(0, 4) + '...' + token.substring(token.length - 4));
testWebStorageAPI()
  .then(() => {
    console.log('\n✅ Your Web3.Storage key is working correctly!');
    console.log('You can now use the CrypTalk application with IPFS functionality.');
  })
  .catch((error) => {
    console.error('\n❌ Web3.Storage key test failed:', error.message);
    console.error('Please check your token and try again.');
  });
