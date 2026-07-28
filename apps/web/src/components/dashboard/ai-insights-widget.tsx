// ============================================
// Maate Dashboard — AIInsightsWidget
// Intelligent clinical summaries
// ============================================

"use client";

import React from "react";
import { Sparkles, ArrowRight, TrendingUp, Info } from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { Button } from "@/components/ui/button";
import { VitalBadge } from "@/components/ui/vital-badge";

const insights = [
  {
    id: 1,
    title: "Hemoglobin Trend",
    content: "Your iron levels are recovering well. Up 1.2 g/dL since March.",
    type: "positive",
    badge: "Recovery"
  },
  {
    id: 2,
    title: "Activity Note",
    content: "Your steps have dropped by 15%. Try a 10min morning walk.",
    type: "neutral",
    badge: "Lifestyle"
  }
];

export function AIInsightsWidget() {
  return (
    <HealthCard variant="glass" className="bg-gradient-to-br from-primary/[0.03] to-accent-violet/[0.03] border-primary/10 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles size={18} />
          </div>
          <h3 className="font-bold font-outfit text-lg">AI Insights</h3>
        </div>
        <VitalBadge status="info">Updated 1h ago</VitalBadge>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="group relative p-4 rounded-2xl bg-white/40 border border-white/50 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-bold flex items-center gap-2">
                {insight.type === 'positive' && <TrendingUp size={14} className="text-health-normal" />}
                {insight.title}
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{insight.badge}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insight.content}
            </p>
            <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={14} className="text-primary" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-primary/5">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 leading-tight italic">
          <Info size={10} /> Insights are based on your recent lab reports and activity data. Consult your doctor for medical advice.
        </p>
      </div>
    </HealthCard>
  );
}
