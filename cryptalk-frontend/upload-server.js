import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import * as ED25519 from '@ucanto/principal/ed25519';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const port = 3001;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Enable CORS for the frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'x-sender-did', 'x-recipient-did']
}));

app.use(express.json());

// Initialize Web3Storage client with company credentials
let w3Client = null;

async function initializeWeb3Client() {
  try {
    console.log('🚀 Initializing Web3Storage client for company...');
    
    const agentKey = process.env.VITE_W3S_AGENT_KEY;
    const spaceDid = process.env.VITE_W3S_SPACE_DID;
    
    if (!agentKey || !spaceDid) {
      throw new Error('Missing Web3Storage credentials in .env.local');
    }
    
    // Parse the agent key
    const principal = ED25519.parse(agentKey);
    
    // Create client
    w3Client = await create({
      principal,
      store: new StoreMemory()
    });
    
    // Set space
    await w3Client.setCurrentSpace(spaceDid);
    
    console.log('✅ Web3Storage client initialized');
    console.log('Space DID:', spaceDid);
    console.log('Agent DID:', principal.did());
    
  } catch (error) {
    console.error('❌ Failed to initialize Web3Storage:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CrypTalk Upload Server',
    w3Connected: !!w3Client 
  });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided' 
      });
    }
    
    const { originalname, mimetype, buffer } = req.file;
    const senderDID = req.headers['x-sender-did'];
    const recipientDID = req.headers['x-recipient-did'];
    
    console.log('File:', originalname, 'Size:', buffer.length);
    console.log('Sender:', senderDID);
    console.log('Recipient:', recipientDID);
    
    // Create File object from buffer
    const file = new File([buffer], originalname, { type: mimetype });
    
    // Upload to Web3Storage using company account
    console.log('Uploading to Web3Storage...');
    const cid = await w3Client.uploadFile(file);
    
    console.log('✅ Upload successful! CID:', cid.toString());
    
    // Log upload metadata for company records
    const uploadRecord = {
      cid: cid.toString(),
      fileName: originalname,
      fileSize: buffer.length,
      mimeType: mimetype,
      senderDID,
      recipientDID,
      timestamp: new Date().toISOString(),
      uploadedBy: 'Surgical Brasil Upload Server'
    };
    
    console.log('Upload record:', uploadRecord);
    
    res.json({
      success: true,
      cid: cid.toString(),
      url: `https://w3s.link/ipfs/${cid}`,
      metadata: uploadRecord
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Start server
async function start() {
  await initializeWeb3Client();
  
  app.listen(port, () => {
    console.log(`🚀 CrypTalk Upload Server running on http://localhost:${port}`);
    console.log('Ready to handle uploads from clients!');
  });
}

start();