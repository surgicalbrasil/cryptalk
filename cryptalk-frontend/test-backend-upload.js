import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3001';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow : colors.blue;
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Test 1: Check if server is running
async function testServerHealth() {
  log('Testing server health...', 'info');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      log('✅ Server is healthy', 'success');
      log(`   Service: ${data.service}`, 'info');
      log(`   Mode: ${data.mode}`, 'info');
      return true;
    } else {
      log('❌ Server health check failed', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Cannot connect to server: ${error.message}`, 'error');
    log('   Make sure the upload server is running on port 3001', 'warning');
    return false;
  }
}

// Test 2: Upload a text file
async function testTextFileUpload() {
  log('Testing text file upload...', 'info');
  
  try {
    // Create test file
    const testContent = `CrypTalk Test Upload
Timestamp: ${new Date().toISOString()}
Type: Text File Test
This is a test document for the CrypTalk upload system.`;
    
    const blob = new Blob([testContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'test-document.txt');
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'x-sender-did': 'did:key:z6MktestSenderDID123',
        'x-recipient-did': 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      log('✅ Text file upload successful', 'success');
      log(`   CID: ${result.cid}`, 'info');
      log(`   URL: ${result.url}`, 'info');
      return true;
    } else {
      log(`❌ Upload failed: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Upload error: ${error.message}`, 'error');
    return false;
  }
}

// Test 3: Upload a JSON file (simulating encrypted data)
async function testJSONFileUpload() {
  log('Testing JSON file upload (encrypted data simulation)...', 'info');
  
  try {
    // Create encrypted data structure
    const encryptedData = {
      metadata: {
        fileName: 'patient-record.pdf',
        fileType: 'application/pdf',
        fileSize: 245760,
        uploadedAt: new Date().toISOString(),
        encryptedBy: 'CrypTalk CompanyCryptoService',
        algorithm: 'AES-256-GCM'
      },
      encryptedContent: Buffer.from('This would be encrypted file content').toString('base64'),
      signature: 'mock-signature-' + Date.now(),
      recipientDID: 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
    };
    
    const blob = new Blob([JSON.stringify(encryptedData, null, 2)], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, 'encrypted-patient-record.json');
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'x-sender-did': 'did:key:z6MktestPatientDID456',
        'x-recipient-did': 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      log('✅ JSON file upload successful', 'success');
      log(`   CID: ${result.cid}`, 'info');
      log(`   Metadata saved: ${JSON.stringify(result.metadata, null, 2)}`, 'info');
      return true;
    } else {
      log(`❌ Upload failed: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Upload error: ${error.message}`, 'error');
    return false;
  }
}

// Test 4: Upload large file
async function testLargeFileUpload() {
  log('Testing large file upload (5MB)...', 'info');
  
  try {
    // Create 5MB of data
    const size = 5 * 1024 * 1024; // 5MB
    const buffer = Buffer.alloc(size);
    
    // Fill with pattern
    for (let i = 0; i < size; i++) {
      buffer[i] = i % 256;
    }
    
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, 'large-test-file.bin');
    
    const startTime = Date.now();
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'x-sender-did': 'did:key:z6MktestLargeFileDID789',
        'x-recipient-did': 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
      },
      body: formData
    });
    
    const uploadTime = Date.now() - startTime;
    const result = await response.json();
    
    if (result.success) {
      log('✅ Large file upload successful', 'success');
      log(`   CID: ${result.cid}`, 'info');
      log(`   Upload time: ${uploadTime}ms`, 'info');
      log(`   Speed: ${(size / uploadTime * 1000 / 1024 / 1024).toFixed(2)} MB/s`, 'info');
      return true;
    } else {
      log(`❌ Upload failed: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Upload error: ${error.message}`, 'error');
    return false;
  }
}

// Test 5: Error handling - no file
async function testNoFileError() {
  log('Testing error handling - no file...', 'info');
  
  try {
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'x-sender-did': 'did:key:z6MktestErrorDID',
        'x-recipient-did': 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
      }
    });
    
    const result = await response.json();
    
    if (!result.success && result.error === 'No file provided') {
      log('✅ Error handling correct: No file error detected', 'success');
      return true;
    } else {
      log('❌ Error handling failed', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Test error: ${error.message}`, 'error');
    return false;
  }
}

// Test 6: Check upload history
async function testUploadHistory() {
  log('Testing upload history endpoint...', 'info');
  
  try {
    const response = await fetch(`${API_URL}/api/uploads`);
    const data = await response.json();
    
    if (data.uploads && Array.isArray(data.uploads)) {
      log('✅ Upload history retrieved', 'success');
      log(`   Total uploads: ${data.uploads.length}`, 'info');
      
      if (data.uploads.length > 0) {
        const latest = data.uploads[data.uploads.length - 1];
        log(`   Latest upload:`, 'info');
        log(`     - File: ${latest.fileName}`, 'info');
        log(`     - CID: ${latest.cid}`, 'info');
        log(`     - Time: ${latest.timestamp}`, 'info');
      }
      return true;
    } else {
      log('❌ Invalid history response', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ History error: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + colors.blue + '=====================================' + colors.reset);
  console.log(colors.blue + '🧪 CrypTalk Backend Upload Tests' + colors.reset);
  console.log(colors.blue + '=====================================' + colors.reset + '\n');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Text File Upload', fn: testTextFileUpload },
    { name: 'JSON File Upload', fn: testJSONFileUpload },
    { name: 'Large File Upload', fn: testLargeFileUpload },
    { name: 'Error Handling', fn: testNoFileError },
    { name: 'Upload History', fn: testUploadHistory }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n${colors.yellow}Running: ${test.name}${colors.reset}`);
    console.log('-'.repeat(40));
    
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + colors.blue + '=====================================' + colors.reset);
  console.log(colors.blue + '📊 Test Results' + colors.reset);
  console.log(colors.blue + '=====================================' + colors.reset);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`📈 Success Rate: ${(passed / tests.length * 100).toFixed(1)}%\n`);
  
  if (failed === 0) {
    console.log(colors.green + '🎉 All tests passed! Backend is working correctly.' + colors.reset);
  } else {
    console.log(colors.red + '⚠️  Some tests failed. Please check the errors above.' + colors.reset);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error(colors.red + 'Fatal error running tests:', error, colors.reset);
});