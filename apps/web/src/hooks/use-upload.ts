// ============================================
// Logic for multi-file upload & OCR polling
// ============================================

"use client";

import { useState } from "react";
import axios from "axios";
import apiClient from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { DocumentTypeEnum } from "@maate/shared-types";

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  error?: string;
  reportId?: string;
}

function getDocumentType(file: File): DocumentTypeEnum {
  const name = file.name.toLowerCase();
  if (name.includes("prescription") || name.includes("rx") || name.includes("medication")) {
    return "PRESCRIPTION";
  }
  if (name.includes("scan") || name.includes("mri") || name.includes("xray") || name.includes("x-ray") || name.includes("ultrasound") || name.includes("imaging")) {
    return "IMAGING";
  }
  if (name.includes("discharge") || name.includes("summary") || name.includes("hospital")) {
    return "DISCHARGE_SUMMARY";
  }
  if (name.includes("vaccin") || name.includes("immuniz")) {
    return "VACCINATION";
  }
  if (name.includes("insurance") || name.includes("claim") || name.includes("policy")) {
    return "INSURANCE";
  }
  if (name.includes("referral") || name.includes("letter")) {
    return "REFERRAL";
  }
  if (name.includes("consent")) {
    return "CONSENT_FORM";
  }
  if (name.includes("note") || name.includes("doctor")) {
    return "DOCTOR_NOTE";
  }
  if (name.includes("lab") || name.includes("blood") || name.includes("report") || name.includes("test") || name.includes("panel")) {
    return "LAB_REPORT";
  }
  return "OTHER";
}

export function useUpload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();

  const uploadFile = async (uploadFile: UploadFile) => {
    updateFile(uploadFile.id, { status: "uploading", progress: 0 });

    try {
      const documentType = getDocumentType(uploadFile.file);

      // 1. Get signed S3 URL from backend
      const urlResponse = await apiClient.post("/documents/upload-url", {
        fileName: uploadFile.file.name,
        contentType: uploadFile.file.type || "application/octet-stream",
        fileSizeBytes: uploadFile.file.size,
        documentType: documentType
      });

      const { uploadUrl, fileKey } = urlResponse.data;

      // 2. Put file binary directly to S3 via pure axios (bypassing authorization header)
      await axios.put(uploadUrl, uploadFile.file, {
        headers: { 
          "Content-Type": uploadFile.file.type || "application/octet-stream"
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          updateFile(uploadFile.id, { progress });
        },
      });

      updateFile(uploadFile.id, { status: "processing", progress: 100 });

      // 3. Confirm file upload and start processing pipeline
      const confirmResponse = await apiClient.post("/documents/confirm-upload", {
        fileKey,
        documentType,
        title: uploadFile.file.name.replace(/\.[^/.]+$/, "") // Strip extension for title
      });

      const documentId = confirmResponse.data.documentId;
      updateFile(uploadFile.id, { reportId: documentId });

      // 4. Poll for OCR status
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds max
      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          const checkResponse = await apiClient.get(`/documents/${documentId}`);
          const doc = checkResponse.data.data;

          if (doc.ocrStatus === "COMPLETED") {
            clearInterval(pollInterval);
            updateFile(uploadFile.id, { status: "completed" });
            toast({
              title: "Report Processed",
              description: `${uploadFile.file.name} is ready for analysis.`,
            });
          } else if (doc.ocrStatus === "FAILED") {
            clearInterval(pollInterval);
            updateFile(uploadFile.id, { 
              status: "error", 
              error: "Data extraction failed." 
            });
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            updateFile(uploadFile.id, { 
              status: "error", 
              error: "Data extraction timeout." 
            });
          }
        } catch (pollErr) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            updateFile(uploadFile.id, { 
              status: "error", 
              error: "Failed to poll extraction status." 
            });
          }
        }
      }, 2000);

    } catch (err: any) {
      updateFile(uploadFile.id, { 
        status: "error", 
        error: err.response?.data?.message || err.message || "Upload failed. Please retry." 
      });
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "idle"
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
    uploadFiles.forEach(uploadFile);
  };

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const retry = (id: string) => {
    const fileToRetry = files.find(f => f.id === id);
    if (fileToRetry) uploadFile(fileToRetry);
  };

  const remove = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return {
    files,
    addFiles,
    retry,
    remove,
    isUploading: files.some(f => f.status === "uploading" || f.status === "processing")
  };
}

