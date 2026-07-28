// ============================================
// Maate Dashboard — QuickActions
// High-priority healthcare shortcuts
// ============================================

"use client";

import React from "react";
import { Plus, MessageSquare, Calendar, PhoneCall, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const actions = [
  { id: 'upload', label: "Upload Report", icon: UploadCloud, color: "bg-primary text-white" },
  { id: 'ai', label: "Chat with AI", icon: MessageSquare, color: "bg-health-violet text-white" },
  { id: 'schedule', label: "Schedule", icon: Calendar, color: "bg-health-sky text-white" },
  { id: 'emergency', label: "Emergency", icon: PhoneCall, color: "bg-health-critical text-white" },
];

export function QuickActions() {
  const router = useRouter();

  const handleAction = (id: string) => {
    if (id === 'upload') {
      router.push('/reports/upload');
    } else if (id === 'schedule') {
      router.push('/reminders');
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Button 
          key={action.id}
          variant="outline"
          onClick={() => handleAction(action.id)}
          className="h-24 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-muted/50 hover:border-primary/20 hover:bg-primary/5 transition-all group"
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${action.color}`}>
            <action.icon size={20} />
          </div>
          <span className="text-[12px] font-bold tracking-tight">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
