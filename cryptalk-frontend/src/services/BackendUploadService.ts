/**
 * Backend Upload Service
 * Handles file uploads through the company's backend server
 * This way clients don't need Web3Storage accounts
 */

const UPLOAD_SERVER_URL = 'http://localhost:3001';

interface UploadResponse {
  success: boolean;
  cid?: string;
  url?: string;
  metadata?: any;
  error?: string;
}

class BackendUploadService {
  /**
   * Check if upload server is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${UPLOAD_SERVER_URL}/health`);
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Upload server not available:', error);
      return false;
    }
  }

  /**
   * Upload file through backend server
   */
  async uploadFile(
    file: File,
    senderDID: string,
    recipientDID: string
  ): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading file through backend server...');
      console.log('File:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Send request with metadata in headers
      const response = await fetch(`${UPLOAD_SERVER_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-sender-did': senderDID,
          'x-recipient-did': recipientDID
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Upload failed with status ${response.status}`);
      }
      
      console.log('✅ Backend upload successful!');
      console.log('CID:', result.cid);
      console.log('URL:', result.url);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Backend upload error:', error);
      
      // Check if server is running
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        return {
          success: false,
          error: 'Upload server is not running. Please contact support.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Upload encrypted file (with metadata)
   */
  async uploadEncryptedFile(
    file: File,
    senderDID: string,
    recipientDID: string,
    encryptionMetadata?: any
  ): Promise<UploadResponse> {
    try {
      // If we have encryption metadata, create a wrapper file
      if (encryptionMetadata) {
        const wrapper = {
          originalName: file.name,
          encryptedData: await file.text(),
          metadata: encryptionMetadata,
          timestamp: new Date().toISOString()
        };
        
        const wrapperBlob = new Blob([JSON.stringify(wrapper)], { type: 'application/json' });
        const wrapperFile = new File([wrapperBlob], `encrypted-${file.name}.json`, { type: 'application/json' });
        
        return this.uploadFile(wrapperFile, senderDID, recipientDID);
      }
      
      // Otherwise, upload as-is
      return this.uploadFile(file, senderDID, recipientDID);
      
    } catch (error: any) {
      console.error('❌ Encrypted upload error:', error);
      return {
        success: false,
        error: error.message || 'Encrypted upload failed'
      };
    }
  }
}

// Singleton instance
export const backendUploadService = new BackendUploadService();
export default backendUploadService;