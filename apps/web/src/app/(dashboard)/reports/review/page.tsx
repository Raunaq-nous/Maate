// ============================================
// Maate Web — OCR Review Page
// Final validation workflow
// ============================================

"use client";

import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OCRReviewCard } from "@/components/dashboard/ocr-review-card";
import { HealthCard } from "@/components/ui/health-card";

const initialMeds = [
  { 
    id: "1", 
    name: "Metformin", 
    originalName: "Metform-500", 
    dosage: "500mg", 
    timing: "Twice daily after meals", 
    confidence: 0.95 
  },
  { 
    id: "2", 
    name: "Atorvastatin", 
    originalName: "Atorvas 20", 
    dosage: "20mg", 
    timing: "Once daily at night", 
    confidence: 0.72 
  },
  { 
    id: "3", 
    name: "Lisinopril", 
    originalName: "Lisin 10mg", 
    dosage: "10mg", 
    timing: "Once daily morning", 
    confidence: 0.88 
  }
];

export default function OCRReviewPage() {
  const router = useRouter();
  const [meds, setMeds] = useState(initialMeds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = (id: string, updates: any) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDelete = (id: string) => {
    setMeds(prev => prev.filter(m => m.id !== id));
  };

  const handleApprove = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* ─── Header & Progress ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-10 w-10 text-muted-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-outfit tracking-tight">Review Extraction</h1>
            <p className="text-muted-foreground">Verify the medicines extracted from your report.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-health-normal/5 text-health-normal px-4 py-2 rounded-2xl border border-health-normal/10">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">Extraction Complete</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Review List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold font-outfit text-lg">Detected Medications ({meds.length})</h3>
              <Button variant="ghost" size="sm" className="text-primary font-bold">+ Add Missing</Button>
            </div>
            
            <div className="grid gap-4">
              {meds.map((med) => (
                <OCRReviewCard 
                  key={med.id} 
                  medication={med} 
                  onUpdate={(updates) => handleUpdate(med.id, updates)}
                  onDelete={() => handleDelete(med.id)}
                />
              ))}
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col md:flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-[20px] h-14 font-bold text-base border-2"
              onClick={() => router.back()}
            >
              Cancel & Discard
            </Button>
            <Button 
              className="flex-[2] rounded-[20px] h-14 font-bold text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving to Health Vault..." : "Approve & Update Schedule"}
            </Button>
          </div>
        </div>

        {/* Right: Side Info */}
        <div className="space-y-6">
          <HealthCard variant="muted" className="border-dashed bg-muted/30">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center border-2 border-primary/20 mb-4 overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                 <FileText className="text-primary/40" size={32} />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Source Document</p>
              <h4 className="text-sm font-bold truncate max-w-[150px]">Lab_Report_May_2026.pdf</h4>
              <Button variant="link" className="text-primary text-xs font-bold mt-2 h-auto p-0">View Original</Button>
            </div>
          </HealthCard>

          <HealthCard variant="glass" className="bg-primary/5 border-primary/10">
            <div className="flex items-start gap-3">
               <ShieldCheck className="text-primary shrink-0" size={20} />
               <div className="space-y-1">
                 <h4 className="text-sm font-bold">Automatic Scheduling</h4>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">
                   Approved medicines will be added to your daily schedule and medication adherence tracker automatically.
                 </p>
               </div>
            </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
}
