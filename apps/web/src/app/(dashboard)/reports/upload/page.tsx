// ============================================
// Maate Web — Report Upload Page
// Focused clinical document ingestion
// ============================================

"use client";

import React from "react";
import { ArrowLeft, ShieldCheck, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReportUploader } from "@/components/dashboard/report-uploader";
import { HealthCard } from "@/components/ui/health-card";

export default function ReportUploadPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* ─── Header ───────────────────────────── */}
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
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Add Medical Record</h1>
          <p className="text-muted-foreground">Upload and securely process your clinical reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Upload Zone */}
        <div className="lg:col-span-2 space-y-6">
          <ReportUploader />
        </div>

        {/* Info & Security Side Panel */}
        <div className="space-y-6">
          <HealthCard variant="muted" className="bg-primary/[0.02] border-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-1">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Clinical Privacy</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your reports are encrypted end-to-end. We use HIPAA-compliant processing to extract medical data.
                </p>
              </div>
            </div>
          </HealthCard>

          <HealthCard variant="glass" className="bg-amber-50/30 border-amber-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 mt-1">
                <Info size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Filing Tips</h4>
                <ul className="text-[11px] text-muted-foreground mt-2 space-y-2 list-disc pl-4">
                  <li>Ensure all four corners of the report are visible in photos.</li>
                  <li>Avoid shadows and glares on glossy paper.</li>
                  <li>PDFs generate the most accurate AI insights.</li>
                </ul>
              </div>
            </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
}
