// ============================================
// Maate Web — TimelineEventCard
// Chronological health history entry
// ============================================

"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Pill, 
  Stethoscope, 
  Activity, 
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Scissors,
  Pin
} from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type EventType = "report" | "medication" | "diagnosis" | "visit" | "surgery" | "reminder";

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  subtitle: string;
  date: string;
  description?: string;
  status?: string;
  attachments?: (string | { name: string; url: string })[];
  isPinned?: boolean;
}

const eventConfig: Record<EventType, { icon: any; color: string; bg: string }> = {
  report: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  medication: { icon: Pill, color: "text-health-sky", bg: "bg-health-sky/10" },
  diagnosis: { icon: Activity, color: "text-health-violet", bg: "bg-health-violet/10" },
  visit: { icon: Stethoscope, color: "text-health-warning", bg: "bg-health-warning/10" },
  surgery: { icon: Scissors, color: "text-health-critical", bg: "bg-health-critical/10" },
  reminder: { icon: Calendar, color: "text-muted-foreground", bg: "bg-muted" },
};

export function TimelineEventCard({ 
  event,
  onPinToggle 
}: { 
  event: TimelineEvent;
  onPinToggle?: (id: string, isPinned: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = eventConfig[event.type] || eventConfig.reminder;
  const Icon = config.icon;

  return (
    <HealthCard 
      padding="none" 
      className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded ? "ring-2 ring-primary/10 shadow-lg" : "hover:shadow-health-md"
      )}
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center gap-4 cursor-pointer group"
      >
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
          config.bg, config.color
        )}>
          <Icon size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-bold text-sm truncate">{event.title}</h4>
            {event.status && (
              <VitalBadge status="normal" size="sm">{event.status}</VitalBadge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-bold uppercase tracking-widest opacity-60">{event.type}</span>
            <span className="opacity-30">•</span>
            <span>{event.subtitle}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 px-2">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            {event.date}
          </span>
          <div className="flex items-center gap-2">
            {onPinToggle && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onPinToggle(event.id, !event.isPinned);
                }}
                className={cn(
                  "p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground/60 hover:text-primary",
                  event.isPinned && "text-primary"
                )}
                title={event.isPinned ? "Unpin Event" : "Pin Event"}
              >
                <Pin size={14} className={cn(event.isPinned && "fill-primary")} />
              </button>
            )}
            {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-muted/50 bg-muted/5 animate-in slide-in-from-top-2 duration-300">
          <div className="pl-16 space-y-4">
            {event.description && (
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                {event.description}
              </p>
            )}
            
            {event.attachments && (
              <div className="flex flex-wrap gap-2">
                {event.attachments.map((at, i) => {
                  const name = typeof at === "string" ? at : at.name;
                  const url = typeof at === "string" ? undefined : at.url;

                  const content = (
                    <>
                      <FileText size={14} className="text-primary" />
                      {name}
                      <ExternalLink size={12} className="text-muted-foreground/40" />
                    </>
                  );

                  if (url) {
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 rounded-xl text-[10px] font-bold gap-2 bg-white px-3 border border-input hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Button 
                      key={i}
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-xl text-[10px] font-bold gap-2 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {content}
                    </Button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" className="h-8 rounded-xl text-[10px] font-bold">Edit Details</Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-bold text-muted-foreground">Share with Doctor</Button>
            </div>
          </div>
        </div>
      )}
    </HealthCard>
  );
}
