// ============================================
// Maate Web — Family Dashboard
// Centralized health management for loved ones
// ============================================

"use client";

import React from "react";
import { 
  Users, 
  Heart, 
  Activity, 
  ShieldAlert, 
  UserPlus, 
  ChevronRight,
  Clock,
  Settings,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";
import { cn } from "@/lib/utils";

const familyMembers = [
  { 
    id: "1", 
    name: "Rajesh Singh", 
    role: "Father", 
    age: 68, 
    healthScore: 72, 
    lastCheck: "2h ago", 
    status: "Normal",
    alerts: 0 
  },
  { 
    id: "2", 
    name: "Sunita Devi", 
    role: "Mother", 
    age: 64, 
    healthScore: 78, 
    lastCheck: "1d ago", 
    status: "Follow-up",
    alerts: 1 
  },
  { 
    id: "3", 
    name: "Aryan Singh", 
    role: "Child", 
    age: 12, 
    healthScore: 94, 
    lastCheck: "4h ago", 
    status: "Healthy",
    alerts: 0 
  }
];

export default function FamilyDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* ─── Header ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Family Health Vault</h1>
          <p className="text-muted-foreground mt-1">Manage healthcare for your parents and children in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold text-muted-foreground gap-2">
            <Settings size={18} />
            Permissions
          </Button>
          <Button className="rounded-[20px] h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold shadow-health-md">
            <UserPlus size={18} className="mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed: Member Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
             <h3 className="font-bold font-outfit text-lg flex items-center gap-2">
               <Users size={20} className="text-primary" />
               Managed Profiles
             </h3>
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{familyMembers.length} active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {familyMembers.map((member) => (
               <HealthCard key={member.id} padding="none" className="overflow-hidden group hover:ring-2 ring-primary/20 transition-all duration-300">
                  <div className="p-6 space-y-6">
                     <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shadow-sm">
                              {member.name.charAt(0)}
                           </div>
                           <div>
                              <h4 className="font-bold font-outfit text-lg">{member.name}</h4>
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{member.role} • {member.age} yrs</p>
                           </div>
                        </div>
                        <VitalBadge status={member.alerts > 0 ? "warning" : "normal"}>
                           {member.status}
                        </VitalBadge>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Health Score</p>
                           <p className="text-xl font-bold font-outfit text-primary">{member.healthScore}%</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Last Activity</p>
                           <p className="text-xl font-bold font-outfit">{member.lastCheck}</p>
                        </div>
                     </div>

                     <Button className="w-full h-11 rounded-xl bg-muted group-hover:bg-primary group-hover:text-white transition-all font-bold gap-2">
                        View Full Dashboard
                        <ChevronRight size={16} />
                     </Button>
                  </div>

                  {member.alerts > 0 && (
                    <div className="bg-health-warning/10 border-t border-health-warning/20 px-6 py-3 flex items-center justify-between">
                       <div className="flex items-center gap-2 text-health-warning">
                          <Bell size={14} className="animate-bounce" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Action Required</span>
                       </div>
                       <span className="text-[10px] font-medium text-health-warning">Lisinopril dosage missed</span>
                    </div>
                  )}
               </HealthCard>
             ))}
          </div>
        </div>

        {/* Sidebar: Global Actions */}
        <div className="space-y-6">
          <HealthCard variant="glass" className="bg-health-critical/[0.03] border-health-critical/10 p-6 space-y-4">
             <div className="flex items-center gap-3 text-health-critical">
                <ShieldAlert size={24} />
                <h4 className="font-bold font-outfit">Emergency Access</h4>
             </div>
             <p className="text-xs text-muted-foreground leading-relaxed">
               Grant temporary full-access to health records for EMTs or Emergency Department staff during a crisis.
             </p>
             <Button variant="outline" className="w-full border-health-critical/20 text-health-critical hover:bg-health-critical/5 rounded-xl font-bold">
                Configure Emergency Protocol
             </Button>
          </HealthCard>

          <HealthCard padding="md" className="space-y-4">
             <h4 className="font-bold font-outfit text-sm">Recent Activity</h4>
             <div className="space-y-4">
                {[
                  { name: "Sunita Devi", action: "Uploaded Lab Report", time: "2h ago", icon: Activity },
                  { name: "Rajesh Singh", action: "Logged Vitals", time: "5h ago", icon: Heart },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                     <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <item.icon size={16} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.action}</p>
                     </div>
                     <span className="text-[10px] font-bold text-muted-foreground/40">{item.time}</span>
                  </div>
                ))}
             </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
}
