import { useState, useCallback } from 'react';
import { UploadProgress, StorageFile, DocumentCategory } from '../../../shared/types';

export interface UseFileUploadReturn {
  uploadProgress: UploadProgress[];
  isUploading: boolean;
  uploadFile: (file: File, category: DocumentCategory) => Promise<StorageFile>;
  uploadMultipleFiles: (files: File[], category: DocumentCategory) => Promise<StorageFile[]>;
  cancelUpload: (fileId: string) => void;
  clearProgress: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateProgress = useCallback((fileId: string, progress: number, status?: UploadProgress['status']) => {
    setUploadProgress(prev => 
      prev.map(p => 
        p.fileId === fileId 
          ? { ...p, progress, status: status || p.status }
          : p
      )
    );
  }, []);

  const uploadFile = async (file: File, category: DocumentCategory): Promise<StorageFile> => {
    const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setUploadProgress(prev => [...prev, {
      fileId,
      progress: 0,
      status: 'pending'
    }]);

    setIsUploading(true);

    try {
      updateProgress(fileId, 0, 'uploading');

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress(fileId, i);
      }

      updateProgress(fileId, 100, 'completed');

      const uploadedFile: StorageFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        cid: `Qm${Math.random().toString(36).substr(2, 44)}`, // Mock CID
        uploadedAt: new Date(),
        uploadedBy: 'current-user-id',
        encrypted: true,
        category,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          checksum: `sha256-${Math.random().toString(36)}`
        }
      };

      return uploadedFile;
    } catch (error) {
      updateProgress(fileId, 0, 'failed');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultipleFiles = async (files: File[], category: DocumentCategory): Promise<StorageFile[]> => {
    const uploadPromises = files.map(file => uploadFile(file, category));
    return Promise.all(uploadPromises);
  };

  const cancelUpload = (fileId: string) => {
    setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
  };

  const clearProgress = () => {
    setUploadProgress([]);
  };

  return {
    uploadProgress,
    isUploading,
    uploadFile,
    uploadMultipleFiles,
    cancelUpload,
    clearProgress
  };
};