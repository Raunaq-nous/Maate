// ============================================
// Maate Web — LabResultTable
// Detailed biomarker analysis with AI insights
// ============================================

"use client";

import React from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  Info, 
  Sparkles,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";

interface LabMarker {
  id: string;
  name: string;
  value: string;
  unit: string;
  range: string;
  status: "normal" | "low" | "high";
  aiExplanation: string;
}

export function LabResultTable({ markers }: { markers: LabMarker[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold font-outfit text-lg">Detailed Bio-Markers</h3>
        <div className="relative">
           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
           <input className="bg-muted/40 border-none rounded-xl h-8 pl-8 pr-4 text-[11px] focus:ring-1 ring-primary outline-none" placeholder="Filter markers..." />
        </div>
      </div>

      <div className="grid gap-3">
        {markers.map((marker) => (
          <HealthCard key={marker.id} padding="none" className="overflow-hidden border-border/50 group">
            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              {/* Marker Name & Value */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{marker.name}</span>
                  <VitalBadge status={marker.status === "normal" ? "normal" : "warning"} size="sm">
                    {marker.status === "low" && <ArrowDown size={10} className="mr-1" />}
                    {marker.status === "high" && <ArrowUp size={10} className="mr-1" />}
                    {marker.status.toUpperCase()}
                  </VitalBadge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-xl font-bold font-outfit",
                    marker.status !== "normal" && "text-health-critical"
                  )}>{marker.value}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{marker.unit}</span>
                </div>
              </div>

              {/* Range & AI Insight */}
              <div className="flex-[1.5] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Reference Range</span>
                  <span className="text-foreground">{marker.range} {marker.unit}</span>
                </div>
                <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                   <div 
                    className={cn(
                      "absolute top-0 h-full w-2 shadow-sm rounded-full",
                      marker.status === "normal" ? "bg-health-normal left-[50%]" : 
                      marker.status === "low" ? "bg-health-warning left-[10%]" : "bg-health-critical left-[90%]"
                    )}
                   />
                </div>
              </div>

              {/* AI Translation Button (Mobile focus or Tooltip) */}
              <div className="hidden lg:flex items-center gap-2 max-w-[200px] text-[11px] text-muted-foreground italic leading-relaxed">
                 <Sparkles size={12} className="text-health-violet shrink-0" />
                 {marker.aiExplanation}
              </div>
            </div>
            
            {/* Mobile Insight Drawer (Simplified) */}
            <div className="lg:hidden bg-health-violet/[0.03] border-t border-health-violet/10 px-4 py-2 flex items-center gap-2 text-[10px] text-health-violet font-medium">
               <Sparkles size={10} />
               {marker.aiExplanation}
            </div>
          </HealthCard>
        ))}
      </div>
    </div>
  );
}
