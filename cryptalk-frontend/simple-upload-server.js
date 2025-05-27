import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const app = express();
const port = 3001;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'x-sender-did', 'x-recipient-did']
}));

app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CrypTalk Upload Server (Simple)',
    mode: 'Using w3 CLI directly'
  });
});

// Upload endpoint using w3 CLI
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided' 
      });
    }
    
    const { filename, originalname, size } = req.file;
    const filePath = req.file.path;
    const senderDID = req.headers['x-sender-did'];
    const recipientDID = req.headers['x-recipient-did'];
    
    console.log('File:', originalname, 'Size:', size);
    console.log('Sender:', senderDID);
    console.log('Recipient:', recipientDID);
    
    // Upload using w3 CLI
    console.log('Uploading to Web3Storage using w3 CLI...');
    const { stdout, stderr } = await execAsync(`w3 up "${filePath}"`);
    
    if (stderr) {
      console.error('CLI Error:', stderr);
    }
    
    // Extract CID from output
    // Output format: "⁂ https://w3s.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    const cidMatch = stdout.match(/ipfs\/([a-zA-Z0-9]+)/);
    
    if (!cidMatch) {
      throw new Error('Could not extract CID from w3 output');
    }
    
    const cid = cidMatch[1];
    console.log('✅ Upload successful! CID:', cid);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    // Create upload record
    const uploadRecord = {
      cid,
      fileName: originalname,
      fileSize: size,
      senderDID,
      recipientDID,
      timestamp: new Date().toISOString(),
      uploadedBy: 'Surgical Brasil Upload Server'
    };
    
    // Save record to a log file
    const logEntry = JSON.stringify(uploadRecord) + '\n';
    fs.appendFileSync('upload-log.json', logEntry);
    
    res.json({
      success: true,
      cid,
      url: `https://w3s.link/ipfs/${cid}`,
      metadata: uploadRecord
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Get upload history
app.get('/api/uploads', (req, res) => {
  try {
    if (!fs.existsSync('upload-log.json')) {
      return res.json({ uploads: [] });
    }
    
    const logs = fs.readFileSync('upload-log.json', 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    
    res.json({ uploads: logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read upload history' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 CrypTalk Simple Upload Server running on http://localhost:${port}`);
  console.log('Using w3 CLI for uploads - no Web3Storage client needed!');
  console.log('Ready to handle uploads from clients!');
});