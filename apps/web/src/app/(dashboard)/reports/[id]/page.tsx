// ============================================
// Maate Web — Report Summary Page
// Comprehensive lab analysis & AI insights
// ============================================

"use client";

import React from "react";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Calendar,
  History,
  TrendingUp,
  FileText
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AISummaryCard } from "@/components/dashboard/ai-summary-card";
import { LabResultTable } from "@/components/dashboard/lab-result-table";
import { HealthCard } from "@/components/ui/health-card";
import apiClient from "@/lib/api";

const mockMarkers = [
  { 
    id: "1", 
    name: "Hemoglobin", 
    value: "13.2", 
    unit: "g/dL", 
    range: "12.0 - 15.5", 
    status: "normal" as const,
    aiExplanation: "Oxygen carrier in blood. Your levels are stable."
  },
  { 
    id: "2", 
    name: "Vitamin D (Total)", 
    value: "18.5", 
    unit: "ng/mL", 
    range: "30.0 - 100.0", 
    status: "low" as const,
    aiExplanation: "Low levels can cause fatigue. Sun exposure or supplements advised."
  },
  { 
    id: "3", 
    name: "HbA1c", 
    value: "7.4", 
    unit: "%", 
    range: "4.0 - 5.6", 
    status: "high" as const,
    aiExplanation: "Average 3-month blood sugar. Elevated; indicates diabetes."
  }
];

export default function ReportSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [docData, setDocData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || id === "1" || id === "demo") return;
    const fetchReport = async () => {
      try {
        setLoading(true);
        const [docRes, sumRes] = await Promise.allSettled([
          apiClient.get(`/documents/${id}`),
          apiClient.get(`/documents/${id}/summary`),
        ]);
        if (docRes.status === "fulfilled" && docRes.value.data?.data) {
          setDocData(docRes.value.data.data);
        }
        if (sumRes.status === "fulfilled" && sumRes.value.data?.data) {
          setSummaryData(sumRes.value.data.data);
        }
      } catch (err) {
        console.error("Failed to load report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const activeSummary =
    summaryData?.summaryText ||
    summaryData?.laypersonSummary ||
    "This report indicates a significant improvement in your iron metabolism. However, your glucose levels (HbA1c) remain above the target range, suggesting a need for tighter dietary control or medication adjustment.";

  const activeKeyFindings = summaryData?.keyFindings
    ? summaryData.keyFindings.map((f: any) =>
        typeof f === "string"
          ? f
          : `${f.parameter}: ${f.value} ${f.unit || ""} — ${f.note || f.status || ""}`
      )
    : [
        "Vitamin D deficiency (18.5 ng/mL) remains the primary concern.",
        "HbA1c is at 7.4%, which is stable but above target.",
        "Hemoglobin has recovered to 13.2 g/dL."
      ];

  const activeRecommendations = summaryData?.recommendations || [
    "Consult Dr. Sharma for Vitamin D supplementation.",
    "Increase leafy green intake to sustain hemoglobin.",
    "Reduce refined sugar to manage HbA1c trend."
  ];

  const dynamicMarkers = docData?.ocrResult?.structuredData?.tests
    ? docData.ocrResult.structuredData.tests.map((t: any, idx: number) => ({
        id: String(idx + 1),
        name: t.parameter || "Test Parameter",
        value: String(t.value || ""),
        unit: t.unit || "",
        range: "Standard",
        status: (t.status || "normal").toLowerCase(),
        aiExplanation: `Extracted from ${docData.title || "clinical document"}.`,
      }))
    : mockMarkers;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* ─── Header ───────────────────────────── */}
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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-lg">
                {docData?.documentType ? docData.documentType.replace('_', ' ') : "Lab Report"}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {docData?.providerName || "Maate Clinical Diagnostics"} • Ref #{id ? id.slice(0, 8) : "92831"}
              </span>
            </div>
            <h1 className="text-3xl font-bold font-outfit tracking-tight">
              {docData?.title || "Full Health Screen"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold text-muted-foreground gap-2">
            <Download size={18} />
            PDF
          </Button>
          <Button className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold gap-2">
            <Share2 size={18} />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: AI Summary & Table */}
        <div className="lg:col-span-2 space-y-8">
          <AISummaryCard 
            summary={activeSummary}
            keyFindings={activeKeyFindings}
            recommendations={activeRecommendations}
            confidence={docData?.ocrResult?.confidenceScore || 0.92}
          />

          <LabResultTable markers={dynamicMarkers} />
        </div>

        {/* Right: Trends & Source */}
        <div className="space-y-6">
          <HealthCard padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
               <h4 className="font-bold font-outfit text-sm">Longitudinal Trends</h4>
               <TrendingUp size={16} className="text-primary" />
            </div>
            
            {/* Simple Trend Chart Placeholder */}
            <div className="space-y-6">
               {[
                 { label: "Hemoglobin", trend: "up", values: [11.2, 11.8, 12.5, 13.2] },
                 { label: "HbA1c", trend: "stable", values: [7.2, 7.5, 7.3, 7.4] },
               ].map((item) => (
                 <div key={item.label} className="space-y-2">
                   <div className="flex items-center justify-between text-[11px] font-bold">
                     <span className="text-muted-foreground">{item.label}</span>
                     <span className={item.trend === "up" ? "text-health-normal" : "text-muted-foreground"}>
                       {item.trend === "up" ? "Improving" : "Stable"}
                     </span>
                   </div>
                   <div className="flex items-end gap-1 h-12 pt-2">
                     {item.values.map((v, i) => (
                       <div 
                        key={i} 
                        className={cn(
                          "flex-1 rounded-t-sm transition-all duration-500",
                          i === 3 ? "bg-primary" : "bg-primary/20"
                        )} 
                        style={{ height: `${(v / Math.max(...item.values)) * 100}%` }}
                       />
                     ))}
                   </div>
                 </div>
               ))}
            </div>
            <Button variant="outline" className="w-full rounded-xl text-xs font-bold gap-2">
               <History size={14} /> Full Trend View
            </Button>
          </HealthCard>

          <HealthCard variant="muted" className="bg-muted/30 border-dashed border-2">
             <div className="flex flex-col items-center text-center p-4">
                <FileText className="text-muted-foreground/30 mb-3" size={40} />
                <h4 className="text-sm font-bold">Original Source</h4>
                <p className="text-[10px] text-muted-foreground mt-1">Verified OCR processed on May 09, 2026</p>
                <Button variant="link" className="text-primary text-xs font-bold mt-2">View Scanned Image</Button>
             </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
}
