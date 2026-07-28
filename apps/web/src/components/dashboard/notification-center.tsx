// ============================================
// Maate Web — NotificationCenter
// Unified health communication hub
// ============================================

"use client";

import React, { useState } from "react";
import { 
  Bell, 
  CheckCheck, 
  Settings2, 
  Search,
  Filter,
  Inbox
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { NotificationCard, Notification } from "./notification-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialNotifications: Notification[] = [
  { 
    id: "1", 
    type: "ai", 
    title: "AI Insight: Hemoglobin Trend", 
    description: "Your hemoglobin levels have improved by 12% since the last report. Keep up the high-protein diet.", 
    time: "2m ago", 
    isUnread: true 
  },
  { 
    id: "2", 
    type: "upload", 
    title: "Report Processed", 
    description: "Lab_Report_May.pdf has been successfully analyzed and added to your health vault.", 
    time: "1h ago", 
    isUnread: true 
  },
  { 
    id: "3", 
    type: "reminder", 
    title: "Medication: Metformin", 
    description: "It's time for your 500mg dose. Take it with water after your meal.", 
    time: "3h ago", 
    isUnread: false 
  },
  { 
    id: "4", 
    type: "system", 
    title: "Action Required: Sync Failed", 
    description: "Apple Health sync was interrupted. Please re-authenticate your account.", 
    time: "1d ago", 
    isUnread: false 
  }
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<string>("all");
  const unreadCount = notifications.filter(n => n.isUnread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-muted group">
          <Bell size={20} className="group-hover:rotate-12 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full border-2 border-background flex items-center justify-center animate-in zoom-in duration-300">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        {/* Header */}
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold font-outfit text-lg">Notifications</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {unreadCount} Unread Alerts
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={markAllRead}
                title="Mark all as read"
              >
                <CheckCheck size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Settings2 size={18} />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
            {["all", "ai", "updates"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  filter === f ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[450px] overflow-y-auto scrollbar-hide py-2">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/30">
              {notifications.map((n) => (
                <NotificationCard 
                  key={n.id} 
                  notification={n} 
                  onClick={() => markRead(n.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-4">
                <Inbox size={32} />
              </div>
              <h4 className="font-bold text-sm">All caught up!</h4>
              <p className="text-xs text-muted-foreground mt-1">No new clinical alerts at the moment.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/10">
          <Button variant="ghost" className="w-full text-xs font-bold text-primary hover:bg-primary/5 rounded-xl h-10">
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
