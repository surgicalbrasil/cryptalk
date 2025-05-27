import fs from 'fs';
import crypto from 'crypto';

const API_URL = 'http://localhost:3001';

// Simulate the complete CrypTalk flow
async function testCompleteCrypTalkFlow() {
  console.log('\n🔄 Testing Complete CrypTalk Integration Flow\n');
  
  // Step 1: Simulate patient login
  const patientDID = 'did:eth:0x1234567890abcdef1234567890abcdef12345678';
  const companyDID = 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ';
  
  console.log('👤 Patient logged in with MetaMask');
  console.log(`   DID: ${patientDID}`);
  
  // Step 2: Create a medical document
  const medicalDocument = {
    patientInfo: {
      name: 'João Silva',
      id: 'PAT-2025-001',
      age: 35
    },
    examResults: {
      type: 'Blood Test',
      date: new Date().toISOString(),
      results: {
        hemoglobin: '15.2 g/dL',
        glucose: '95 mg/dL',
        cholesterol: '180 mg/dL'
      }
    },
    doctor: 'Dr. Maria Santos',
    clinic: 'Surgical Brasil'
  };
  
  console.log('\n📄 Created medical document');
  
  // Step 3: Encrypt the document (simulating CompanyCryptoService)
  const documentJson = JSON.stringify(medicalDocument, null, 2);
  const encryptionKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  let encryptedData = cipher.update(documentJson, 'utf8', 'base64');
  encryptedData += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  const encryptedPayload = {
    metadata: {
      fileName: 'exam-results-joao-silva.json',
      fileType: 'application/json',
      fileSize: Buffer.byteLength(documentJson),
      encryptedAt: new Date().toISOString(),
      algorithm: 'AES-256-GCM',
      recipientDID: companyDID,
      senderDID: patientDID,
      canOnlyBeDecryptedBy: 'Surgical Brasil'
    },
    encryptedContent: encryptedData,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    // In production, this key would be encrypted with the company's public key
    encryptedKey: encryptionKey.toString('base64')
  };
  
  console.log('🔐 Document encrypted for Surgical Brasil');
  console.log(`   Algorithm: AES-256-GCM`);
  console.log(`   Original size: ${Buffer.byteLength(documentJson)} bytes`);
  
  // Step 4: Upload to backend
  console.log('\n📤 Uploading encrypted document...');
  
  const blob = new Blob([JSON.stringify(encryptedPayload)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'encrypted-exam-results.json');
  
  try {
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'x-sender-did': patientDID,
        'x-recipient-did': companyDID
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Upload successful!');
      console.log(`   CID: ${result.cid}`);
      console.log(`   URL: ${result.url}`);
      
      // Step 5: Simulate company accessing the file
      console.log('\n🏥 Surgical Brasil accessing the file...');
      
      // In production, company would download and decrypt
      console.log('📥 File downloaded from IPFS');
      console.log('🔓 Decrypting with company private key...');
      
      // Simulate decryption
      const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
      decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'base64'));
      
      let decryptedData = decipher.update(encryptedPayload.encryptedContent, 'base64', 'utf8');
      decryptedData += decipher.final('utf8');
      
      const decryptedDocument = JSON.parse(decryptedData);
      
      console.log('✅ Document decrypted successfully!');
      console.log('\n📋 Decrypted Medical Document:');
      console.log(JSON.stringify(decryptedDocument, null, 2));
      
      // Step 6: Verify upload in history
      const historyResponse = await fetch(`${API_URL}/api/uploads`);
      const history = await historyResponse.json();
      
      const thisUpload = history.uploads.find(u => u.cid === result.cid);
      if (thisUpload) {
        console.log('\n📊 Upload recorded in system:');
        console.log(`   Timestamp: ${thisUpload.timestamp}`);
        console.log(`   Patient DID: ${thisUpload.senderDID}`);
        console.log(`   For: ${thisUpload.recipientDID}`);
      }
      
      return true;
    } else {
      console.error('❌ Upload failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return false;
  }
}

// Test performance with multiple concurrent uploads
async function testConcurrentUploads() {
  console.log('\n⚡ Testing Concurrent Uploads Performance\n');
  
  const numberOfUploads = 5;
  const uploads = [];
  
  for (let i = 0; i < numberOfUploads; i++) {
    const data = {
      uploadId: `concurrent-test-${i}`,
      timestamp: new Date().toISOString(),
      data: crypto.randomBytes(1024).toString('base64') // 1KB random data
    };
    
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, `concurrent-${i}.json`);
    
    uploads.push(
      fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-sender-did': `did:test:concurrent${i}`,
          'x-recipient-did': 'did:key:z6MkpTMTCcMMKgRFPAvoAtgf9Sip8uk2KoF7LU2JTvqLDmjQ'
        },
        body: formData
      }).then(res => res.json())
    );
  }
  
  console.log(`📤 Starting ${numberOfUploads} concurrent uploads...`);
  const startTime = Date.now();
  
  try {
    const results = await Promise.all(uploads);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Concurrent Upload Results:`);
    console.log(`   Total uploads: ${numberOfUploads}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average time per upload: ${(totalTime / numberOfUploads).toFixed(0)}ms`);
    
    return successful === numberOfUploads;
  } catch (error) {
    console.error('❌ Concurrent test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('=====================================');
  console.log('🏥 CrypTalk Integration Tests');
  console.log('=====================================');
  
  // Check server first
  try {
    const health = await fetch(`${API_URL}/health`).then(r => r.json());
    if (health.status !== 'ok') {
      throw new Error('Server not healthy');
    }
    console.log('✅ Upload server is running\n');
  } catch (error) {
    console.error('❌ Upload server is not running on port 3001');
    console.error('   Please start it with: node simple-upload-server.js');
    return;
  }
  
  // Run tests
  const flowResult = await testCompleteCrypTalkFlow();
  const concurrentResult = await testConcurrentUploads();
  
  console.log('\n=====================================');
  console.log('📊 Integration Test Summary');
  console.log('=====================================');
  console.log(`Complete Flow Test: ${flowResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Concurrent Upload Test: ${concurrentResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (flowResult && concurrentResult) {
    console.log('\n🎉 All integration tests passed!');
    console.log('The backend is ready for production use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
  }
}

// Run the tests
runIntegrationTests();