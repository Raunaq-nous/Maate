// ============================================
// Maate Web — NotificationCenter
// Unified health communication hub
// ============================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bell, 
  CheckCheck, 
  Settings2, 
  Inbox,
  Loader2
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { NotificationCard, Notification, NotificationType } from "./notification-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recent";
  }
}

function mapDbTypeToUiType(type: string): NotificationType {
  const t = (type || "").toUpperCase();
  if (t === "REMINDER") return "reminder";
  if (t === "ALERT" || t === "ESCALATION") return "alert";
  if (t === "SYSTEM") return "system";
  if (t === "INFO") return "info";
  return "info";
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any[]>("/notifications/history");
      const mapped: Notification[] = (res.data || []).map((n) => ({
        id: n.id,
        type: mapDbTypeToUiType(n.type),
        title: n.title,
        description: n.body,
        time: formatRelativeTime(n.createdAt),
        isUnread: !n.readAt && n.status !== "READ",
        priority: n.type === "ALERT" || n.type === "ESCALATION" ? "high" : "medium",
      }));
      setNotifications(mapped);
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const markAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
      await apiClient.post("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const markRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
      );
      await apiClient.post(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "ai") return n.type === "ai" || n.title.toLowerCase().includes("ai");
    if (filter === "updates") return n.type === "alert" || n.type === "info" || n.type === "system";
    return true;
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-muted group">
          <Bell size={20} className="group-hover:rotate-12 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full border-2 border-background flex items-center justify-center animate-in zoom-in duration-300">
              {unreadCount > 9 ? "9+" : unreadCount}
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
                disabled={unreadCount === 0}
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
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="divide-y divide-border/30">
              {filteredNotifications.map((n) => (
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
          <Button 
            variant="ghost" 
            className="w-full text-xs font-bold text-primary hover:bg-primary/5 rounded-xl h-10"
            onClick={fetchNotifications}
          >
            Refresh Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

