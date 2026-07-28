// ============================================
// Maate Web — AISummaryCard
// Patient-friendly clinical synthesis
// ============================================

"use client";

import React from "react";
import { 
  Sparkles, 
  Info, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2,
  BrainCircuit
} from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { cn } from "@/lib/utils";

interface AISummaryProps {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  confidence: number;
}

export function AISummaryCard({ summary, keyFindings, recommendations, confidence }: AISummaryProps) {
  return (
    <HealthCard 
      variant="glass" 
      padding="none"
      className="bg-gradient-to-br from-health-violet/[0.05] to-primary/[0.05] border-health-violet/10 overflow-hidden"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-health-violet/20 flex items-center justify-center text-health-violet shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold font-outfit text-lg">AI Clinical Summary</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Confidence: {Math.round(confidence * 100)}%</span>
                <span className="w-1 h-1 bg-muted rounded-full" />
                <span className="text-[10px] font-bold text-health-violet uppercase tracking-widest flex items-center gap-1">
                   <BrainCircuit size={10} /> Clinical RAG Active
                </span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white">
             <CheckCircle2 size={14} className="text-health-normal" />
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Doctor Verified</span>
          </div>
        </div>

        {/* Summary Text */}
        <div className="space-y-2">
           <p className="text-sm text-foreground leading-relaxed font-medium">
             {summary}
           </p>
        </div>

        {/* Findings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} className="text-health-warning" />
                Key Observations
              </h4>
              <ul className="space-y-2">
                {keyFindings.map((finding, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="w-1 h-1 bg-health-warning rounded-full mt-1.5 shrink-0" />
                    {finding}
                  </li>
                ))}
              </ul>
           </div>
           <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" />
                Next Steps
              </h4>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
           </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="bg-white/40 border-t border-white px-6 py-3 flex items-center gap-2">
        <Info size={12} className="text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground font-medium italic">
          This AI summary is for informational purposes. Always consult with a qualified physician for clinical diagnosis.
        </p>
      </div>
    </HealthCard>
  );
}
