// ============================================
// Maate Web — Caregiver Permissions
// Secure healthcare access management
// ============================================

"use client";

import React from "react";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Eye, 
  Edit3, 
  Trash2, 
  UserPlus, 
  History,
  Lock,
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";
import { cn } from "@/lib/utils";

const permissions = [
  { 
    id: "1", 
    name: "Dr. Arvind Sharma", 
    role: "Physician", 
    access: "Full Access", 
    expiry: "Never", 
    status: "active" 
  },
  { 
    id: "2", 
    name: "Priya Singh", 
    role: "Family Member", 
    access: "View Only", 
    expiry: "May 2027", 
    status: "active" 
  },
  { 
    id: "3", 
    name: "Max Healthcare", 
    role: "Medical Institution", 
    access: "Limited (Reports)", 
    expiry: "30 Days Left", 
    status: "expiring" 
  }
];

export default function CaregiverPermissionsPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* ─── Header ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-10 w-10 text-muted-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Management</span>
            </div>
            <h1 className="text-3xl font-bold font-outfit tracking-tight">Caregiver Permissions</h1>
          </div>
        </div>
        <Button className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold gap-2">
          <UserPlus size={18} />
          Invite Caregiver
        </Button>
      </div>

      {/* ─── Search & Stats ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HealthCard padding="md" className="flex items-center gap-4 bg-primary/5 border-primary/10">
           <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck size={20} />
           </div>
           <div>
              <p className="text-2xl font-bold font-outfit">8</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Proxies</p>
           </div>
        </HealthCard>
        <HealthCard padding="md" className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-health-violet/10 flex items-center justify-center text-health-violet">
              <Eye size={20} />
           </div>
           <div>
              <p className="text-2xl font-bold font-outfit">12</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Profile Views</p>
           </div>
        </HealthCard>
        <HealthCard padding="md" className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-health-sky/10 flex items-center justify-center text-health-sky">
              <Lock size={20} />
           </div>
           <div>
              <p className="text-2xl font-bold font-outfit">HIPAA</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Security Level</p>
           </div>
        </HealthCard>
      </div>

      {/* ─── Permissions List ─────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h3 className="font-bold font-outfit text-lg">Authorized Access</h3>
           <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="bg-muted/40 border-none rounded-xl h-8 pl-8 pr-4 text-[11px] outline-none" placeholder="Search people..." />
           </div>
        </div>

        <div className="space-y-3">
          {permissions.map((p) => (
            <HealthCard key={p.id} padding="none" className="overflow-hidden border-border/50 group">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-lg font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{p.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{p.role}</p>
                  </div>
                </div>

                <div className="flex flex-1 items-center justify-center gap-8">
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Access Level</p>
                      <VitalBadge status="info" size="sm">{p.access}</VitalBadge>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Expires On</p>
                      <p className="text-xs font-bold">{p.expiry}</p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground">
                      <Edit3 size={16} />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-health-critical/5 text-muted-foreground hover:text-health-critical">
                      <Trash2 size={16} />
                   </Button>
                </div>
              </div>
            </HealthCard>
          ))}
        </div>
      </div>

      {/* ─── Audit Log ────────────────────────── */}
      <HealthCard padding="none" className="overflow-hidden border-dashed">
         <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <History size={16} className="text-muted-foreground" />
               <h4 className="font-bold font-outfit text-sm">Access Audit Log</h4>
            </div>
            <Button variant="link" className="h-auto p-0 text-[11px] font-bold text-primary">View Full History</Button>
         </div>
         <div className="p-4 space-y-3">
            {[
              { text: "Dr. Arvind Sharma accessed MRI Spine Report", time: "2h ago" },
              { text: "Priya Singh logged in to view Dashboard", time: "5h ago" },
              { text: "Access level updated for Max Healthcare", time: "1d ago" },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                 <span className="text-muted-foreground">{log.text}</span>
                 <span className="text-muted-foreground/40 font-medium">{log.time}</span>
              </div>
            ))}
         </div>
      </HealthCard>
    </div>
  );
}
