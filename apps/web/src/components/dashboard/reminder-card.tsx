// ============================================
// Maate Web — ReminderCard
// Multi-type health notifications
// ============================================

"use client";

import React from "react";
import { 
  Pill, 
  Droplet, 
  Utensils, 
  Moon, 
  Check, 
  Clock, 
  MoreVertical,
  BellRing
} from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReminderType = "medication" | "water" | "meal" | "sleep";

interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string;
  time: string;
  status: "pending" | "completed" | "snoozed";
}

const typeStyles: Record<ReminderType, { icon: any; color: string; bg: string }> = {
  medication: { icon: Pill, color: "text-primary", bg: "bg-primary/10" },
  water: { icon: Droplet, color: "text-health-sky", bg: "bg-health-sky/10" },
  meal: { icon: Utensils, color: "text-health-warning", bg: "bg-health-warning/10" },
  sleep: { icon: Moon, color: "text-health-violet", bg: "bg-health-violet/10" },
};

export function ReminderCard({ reminder, onComplete, onSnooze }: { 
  reminder: Reminder; 
  onComplete: () => void;
  onSnooze: () => void;
}) {
  const style = typeStyles[reminder.type];
  const Icon = style.icon;
  const isCompleted = reminder.status === "completed";

  return (
    <HealthCard 
      padding="sm" 
      className={cn(
        "flex items-center gap-4 transition-all duration-500",
        isCompleted && "opacity-60 grayscale-[0.5] scale-[0.98]"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0",
        isCompleted ? "bg-health-normal/10 text-health-normal" : style.bg + " " + style.color
      )}>
        {isCompleted ? <Check size={24} className="animate-in zoom-in duration-300" /> : <Icon size={24} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-bold text-sm truncate", isCompleted && "line-through text-muted-foreground")}>
            {reminder.title}
          </h4>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
            {reminder.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
          <Clock size={12} />
          {reminder.time}
          <span className="mx-1">•</span>
          {reminder.subtitle}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isCompleted ? (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex rounded-xl text-muted-foreground font-bold text-[11px]"
              onClick={onSnooze}
            >
              Snooze
            </Button>
            <Button 
              size="sm" 
              className="rounded-xl h-9 px-4 bg-primary hover:bg-primary/90 text-white font-bold shadow-md shadow-primary/10"
              onClick={onComplete}
            >
              Done
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreVertical size={16} />
          </Button>
        )}
      </div>
    </HealthCard>
  );
}
