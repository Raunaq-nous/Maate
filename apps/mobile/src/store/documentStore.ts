// ============================================
// Mobile — Document Store (Zustand)
// Enhanced with OCR Review & Confirmation
// ============================================

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../services/api';
import type { 
  GetUploadUrlRequest, 
  UploadUrlResponse, 
  ConfirmUploadRequest,
  DocumentProfile,
  PrescriptionExtraction
} from '@maate/shared-types';

interface UploadProgress {
  [key: string]: number;
}

interface DocumentState {
  isUploading: boolean;
  uploadProgress: UploadProgress;
  documents: DocumentProfile[];
  currentOcr: PrescriptionExtraction | null;
  
  // Actions
  fetchDocuments: () => Promise<void>;
  uploadDocument: (fileUri: string, fileName: string, contentType: string, documentType: string) => Promise<string>;
  getOcrResult: (documentId: string) => Promise<PrescriptionExtraction>;
  confirmPrescription: (documentId: string, data: PrescriptionExtraction) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  isUploading: false,
  uploadProgress: {},
  documents: [],
  currentOcr: null,

  fetchDocuments: async () => {
    try {
      const { data } = await apiClient.get('/documents');
      set({ documents: data.data });
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  },

  uploadDocument: async (fileUri, fileName, contentType, documentType) => {
    set({ isUploading: true });
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) throw new Error('File does not exist');
      
      const fileSizeBytes = fileInfo.size;

      const { data: uploadInfo } = await apiClient.post<UploadUrlResponse>('/documents/upload-url', {
        fileName,
        contentType,
        fileSizeBytes,
        documentType,
      } as GetUploadUrlRequest);

      const { uploadUrl, fileKey } = uploadInfo;

      const uploadTask = FileSystem.createUploadTask(
        uploadUrl,
        fileUri,
        {
          httpMethod: 'PUT',
          headers: { 'Content-Type': contentType },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        },
        (progress) => {
          const p = progress.totalBytesSent / progress.totalBytesExpectedToSend;
          set((state) => ({
            uploadProgress: { ...state.uploadProgress, [fileKey]: p },
          }));
        }
      );

      await uploadTask.uploadAsync();

      const { data: confirmData } = await apiClient.post('/documents/confirm-upload', {
        fileKey,
        documentType,
        title: fileName.split('.').shift(),
      } as ConfirmUploadRequest);

      await get().fetchDocuments();
      
      set((state) => {
        const newProgress = { ...state.uploadProgress };
        delete newProgress[fileKey];
        return { uploadProgress: newProgress, isUploading: false };
      });

      return confirmData.documentId;

    } catch (error) {
      set({ isUploading: false });
      console.error('Upload failed', error);
      throw error;
    }
  },

  getOcrResult: async (documentId: string) => {
    try {
      // Poll until status is COMPLETED or timeout
      let attempts = 0;
      while (attempts < 10) {
        const { data } = await apiClient.get(`/documents/${documentId}`);
        if (data.data.ocrStatus === 'COMPLETED') {
          const { data: ocrData } = await apiClient.get(`/documents/${documentId}/ocr`);
          const structuredData = ocrData.data.structuredData as PrescriptionExtraction;
          set({ currentOcr: structuredData });
          return structuredData;
        }
        if (data.data.ocrStatus === 'FAILED') {
          throw new Error('OCR processing failed');
        }
        // Wait 2 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
      throw new Error('OCR processing timed out');
    } catch (error) {
      console.error('Failed to get OCR result', error);
      throw error;
    }
  },

  confirmPrescription: async (documentId, data) => {
    try {
      // Create medications and reminders in the backend based on reviewed data
      await apiClient.post(`/documents/${documentId}/confirm-prescription`, data);
      await get().fetchDocuments();
      set({ currentOcr: null });
    } catch (error) {
      console.error('Failed to confirm prescription', error);
      throw error;
    }
  },

  archiveDocument: async (id) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (error) {
      console.error('Failed to archive document', error);
    }
  },
}));
