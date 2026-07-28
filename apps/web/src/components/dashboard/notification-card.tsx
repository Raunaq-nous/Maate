// ============================================
// Maate Web — NotificationCard
// High-fidelity clinical alerts
// ============================================

"use client";

import React from "react";
import { 
  Bell, 
  Sparkles, 
  Clock, 
  UploadCloud, 
  AlertCircle,
  CheckCircle2,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType = "reminder" | "ai" | "upload" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  priority?: "low" | "medium" | "high";
}

const typeConfig: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  reminder: { icon: Clock, color: "text-health-sky", bg: "bg-health-sky/10" },
  ai: { icon: Sparkles, color: "text-health-violet", bg: "bg-health-violet/10" },
  upload: { icon: UploadCloud, color: "text-primary", bg: "bg-primary/10" },
  system: { icon: AlertCircle, color: "text-health-critical", bg: "bg-health-critical/10" },
};

export function NotificationCard({ notification, onClick }: { 
  notification: Notification; 
  onClick?: () => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex gap-4 p-4 rounded-[20px] transition-all duration-300 cursor-pointer border border-transparent",
        notification.isUnread ? "bg-primary/[0.03] border-primary/5 shadow-sm" : "hover:bg-muted/50",
        "hover:border-primary/10"
      )}
    >
      {notification.isUnread && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
      )}
      
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
        config.bg, config.color
      )}>
        <Icon size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className={cn(
            "text-sm font-bold truncate pr-4",
            notification.isUnread ? "text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
          </h4>
          <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap uppercase tracking-widest">
            {notification.time}
          </span>
        </div>
        <p className={cn(
          "text-xs leading-relaxed line-clamp-2",
          notification.isUnread ? "text-muted-foreground font-medium" : "text-muted-foreground/70"
        )}>
          {notification.description}
        </p>
      </div>

      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground">
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
