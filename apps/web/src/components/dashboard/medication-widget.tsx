// ============================================
// Maate Dashboard — MedicationWidget
// Detailed adherence tracking
// ============================================

"use client";

import React from "react";
import { Pill, Check, Clock, AlertCircle } from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const meds = [
  { id: 1, name: "Metformin", dose: "500mg", time: "08:00 AM", taken: true, status: "taken" },
  { id: 2, name: "Atorvastatin", dose: "20mg", time: "09:00 PM", taken: false, status: "upcoming" },
  { id: 3, name: "Lisinopril", dose: "10mg", time: "08:00 AM", taken: false, status: "missed" },
];

export function MedicationWidget() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold font-outfit">Daily Medications</h3>
        <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">2 Remaining</span>
      </div>

      <div className="grid gap-3">
        {meds.map((med) => (
          <HealthCard 
            key={med.id} 
            padding="sm" 
            className={cn(
              "flex items-center gap-4 transition-all",
              med.status === "missed" && "border-health-critical/20 bg-health-critical/[0.02]"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
              med.status === "taken" ? "bg-health-normal/10 text-health-normal" : 
              med.status === "missed" ? "bg-health-critical/10 text-health-critical" : 
              "bg-primary/10 text-primary"
            )}>
              <Pill size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm truncate">{med.name}</h4>
                <span className="text-[10px] font-bold text-muted-foreground">{med.dose}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                <Clock size={12} />
                {med.time}
                {med.status === "missed" && (
                  <span className="flex items-center gap-1 text-health-critical ml-2 font-bold uppercase tracking-tighter">
                    <AlertCircle size={10} /> Missed
                  </span>
                )}
              </div>
            </div>

            <Button 
              size="sm" 
              variant={med.status === "taken" ? "ghost" : "outline"}
              className={cn(
                "rounded-xl font-bold h-9 px-4 transition-all",
                med.status === "taken" && "bg-health-normal/10 text-health-normal hover:bg-health-normal/20",
                med.status === "upcoming" && "border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
              )}
            >
              {med.status === "taken" ? (
                <Check size={16} />
              ) : (
                "Mark Taken"
              )}
            </Button>
          </HealthCard>
        ))}
      </div>

      <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground hover:text-primary rounded-xl">
        Manage Prescriptions
      </Button>
    </div>
  );
}
