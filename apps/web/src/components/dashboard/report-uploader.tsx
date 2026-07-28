// ============================================
// Maate Web — ReportUploader
// High-fidelity clinical document ingestion
// ============================================

"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  UploadCloud, 
  FileText, 
  X, 
  RefreshCcw, 
  CheckCircle2, 
  Loader2, 
  FileWarning,
  Camera
} from "lucide-react";
import { useUpload, UploadFile } from "@/hooks/use-upload";
import { HealthCard } from "@/components/ui/health-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReportUploader() {
  const { files, addFiles, retry, remove } = useUpload();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div className="space-y-6">
      {/* ─── Dropzone ──────────────────────────── */}
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-[32px] p-10 transition-all duration-300 bg-muted/20",
          isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-health-md flex items-center justify-center text-primary transition-transform group-hover:scale-110 duration-300">
            <UploadCloud size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-outfit tracking-tight">
              {isDragActive ? "Drop reports here" : "Upload Medical Reports"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              Drag & drop PDFs or lab images here. We'll automatically extract the vitals.
            </p>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Button variant="secondary" className="rounded-xl h-10 px-6 gap-2">
              <FileText size={18} /> Browse Files
            </Button>
            <Button variant="ghost" className="rounded-xl h-10 px-6 gap-2 text-muted-foreground lg:hidden">
              <Camera size={18} /> Take Photo
            </Button>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 pt-4">
            Max size 10MB • Secure & HIPAA Compliant
          </p>
        </div>
      </div>

      {/* ─── Upload Queue ─────────────────────── */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Upload Queue</h4>
          <div className="grid gap-3">
            {files.map((file) => (
              <UploadItem key={file.id} file={file} onRetry={() => retry(file.id)} onRemove={() => remove(file.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadItem({ file, onRetry, onRemove }: { file: UploadFile; onRetry: () => void; onRemove: () => void }) {
  const isError = file.status === "error";
  const isProcessing = file.status === "processing";
  const isCompleted = file.status === "completed";

  return (
    <HealthCard padding="sm" className={cn(
      "flex items-center gap-4 transition-all duration-300",
      isError && "border-health-critical/20 bg-health-critical/[0.02]"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        isCompleted ? "bg-health-normal/10 text-health-normal" : "bg-muted text-muted-foreground"
      )}>
        {isCompleted ? <CheckCircle2 size={24} /> : <FileText size={24} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold truncate pr-4">{file.file.name}</h4>
          <span className="text-[10px] font-bold text-muted-foreground">
            {(file.file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
        
        {/* Progress / Status Bar */}
        <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              isError ? "bg-health-critical" : 
              isProcessing ? "bg-health-violet animate-pulse" : 
              isCompleted ? "bg-health-normal" : "bg-primary"
            )}
            style={{ width: `${file.progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-tight",
            isError ? "text-health-critical" : 
            isProcessing ? "text-health-violet" : 
            isCompleted ? "text-health-normal" : "text-muted-foreground"
          )}>
            {isError ? file.error : isProcessing ? "AI Extracting Data..." : isCompleted ? "Successfully Processed" : "Uploading..."}
          </span>
          {isProcessing && <Loader2 size={12} className="animate-spin text-health-violet" />}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isError && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-health-warning" onClick={onRetry}>
            <RefreshCcw size={16} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-health-critical" onClick={onRemove}>
          <X size={16} />
        </Button>
      </div>
    </HealthCard>
  );
}
