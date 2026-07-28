// ============================================
// Maate Web — OCRReviewCard
// Editable extraction verification
// ============================================

"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Pill, 
  Edit3,
  Trash2,
  Undo2
} from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OCRMedication {
  id: string;
  name: string;
  originalName: string;
  dosage: string;
  timing: string;
  confidence: number; // 0 to 1
}

export function OCRReviewCard({ 
  medication, 
  onUpdate, 
  onDelete 
}: { 
  medication: OCRMedication; 
  onUpdate: (updates: Partial<OCRMedication>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isLowConfidence = medication.confidence < 0.8;
  const isCorrected = medication.name !== medication.originalName;

  return (
    <HealthCard 
      padding="none" 
      className={cn(
        "overflow-hidden transition-all duration-300",
        isLowConfidence && !isEditing ? "border-amber-200 bg-amber-50/10" : "border-border"
      )}
    >
      <div className="p-5 flex flex-col md:flex-row gap-6">
        {/* Medicine Identity */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-xl",
                  isLowConfidence ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                )}>
                  <Pill size={18} />
                </div>
                <h4 className="text-lg font-bold font-outfit">
                  {isEditing ? (
                    <input 
                      type="text"
                      className="bg-muted px-2 py-1 rounded-lg w-full focus:ring-2 ring-primary outline-none"
                      value={medication.name}
                      onChange={(e) => onUpdate({ name: e.target.value })}
                    />
                  ) : medication.name}
                </h4>
              </div>
              {isCorrected && !isEditing && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 ml-10">
                  <Undo2 size={10} /> Original: <span className="line-through">{medication.originalName}</span>
                </p>
              )}
            </div>
            
            <VitalBadge status={isLowConfidence ? "warning" : "normal"} size="sm">
              {Math.round(medication.confidence * 100)}% Confidence
            </VitalBadge>
          </div>

          <div className="grid grid-cols-2 gap-4 ml-10">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Dosage</label>
              <div className="flex items-center gap-2 text-sm font-bold">
                {isEditing ? (
                  <input 
                    className="bg-muted px-2 py-1 rounded-lg w-full outline-none"
                    value={medication.dosage}
                    onChange={(e) => onUpdate({ dosage: e.target.value })}
                  />
                ) : (
                  <><span>{medication.dosage}</span></>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Timing</label>
              <div className="flex items-center gap-2 text-sm font-bold text-health-violet">
                <Clock size={14} />
                {isEditing ? (
                  <input 
                    className="bg-muted px-2 py-1 rounded-lg w-full outline-none"
                    value={medication.timing}
                    onChange={(e) => onUpdate({ timing: e.target.value })}
                  />
                ) : (
                  <span>{medication.timing}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-border p-4 md:p-5 bg-muted/20 md:bg-transparent">
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm" 
            className="rounded-xl font-bold gap-2 flex-1 md:flex-initial"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <CheckCircle2 size={16} /> : <Edit3 size={16} />}
            {isEditing ? "Save" : "Correct"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl text-muted-foreground hover:text-health-critical flex-1 md:flex-initial"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {isLowConfidence && !isEditing && (
        <div className="bg-amber-100/50 border-t border-amber-100 px-5 py-2 flex items-center gap-2 text-[11px] font-bold text-amber-700">
          <AlertTriangle size={12} /> AI was unsure about this extraction. Please verify dosages carefully.
        </div>
      )}
    </HealthCard>
  );
}
