// ============================================
// Maate Web — OfflineIndicator
// Real-time connectivity feedback
// ============================================

"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, Wifi, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={cn(
        "px-6 py-3 rounded-full shadow-health-lg flex items-center gap-3 backdrop-blur-md border border-white/20 transition-colors duration-500",
        isOffline ? "bg-health-critical text-white" : "bg-health-normal text-white"
      )}>
        {isOffline ? (
          <>
            <WifiOff size={18} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">You are offline • Offline Mode Active</span>
          </>
        ) : (
          <>
            <Wifi size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Back Online • Syncing Data...</span>
          </>
        )}
      </div>
    </div>
  );
}
