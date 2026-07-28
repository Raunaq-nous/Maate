// ============================================
// MAATE WEB — Dashboard Home
// Central health overview & quick actions
// ============================================

"use client";

import React from "react";
import { Activity, Droplet, Moon, CheckCircle2, ArrowUpRight } from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically imported widgets for code splitting
const QuickActions = dynamic(() => import("@/components/dashboard/quick-actions").then((mod) => mod.QuickActions), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full rounded-2xl" />
});

const HydrationWidget = dynamic(() => import("@/components/dashboard/hydration-widget").then((mod) => mod.HydrationWidget), {
  loading: () => <Skeleton className="h-48 w-full rounded-2xl" />
});

const MedicationWidget = dynamic(() => import("@/components/dashboard/medication-widget").then((mod) => mod.MedicationWidget), {
  loading: () => <Skeleton className="h-64 w-full rounded-2xl" />
});

const AIInsightsWidget = dynamic(() => import("@/components/dashboard/ai-insights-widget").then((mod) => mod.AIInsightsWidget), {
  loading: () => <Skeleton className="h-48 w-full rounded-2xl" />
});


export default function DashboardHome() {
  const { user } = useAuthStore();
  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "User";

  return (
    <div className="space-y-10">
      {/* ─── Page Header ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Good morning, {firstName}</h1>
          <p className="text-muted-foreground mt-1">Your health score is stable at 84. You're doing great!</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-2xl">
          <Activity size={16} className="text-health-normal" />
          Syncing with Apple Health
        </div>
      </div>

      {/* ─── Top Level Quick Actions ───────────── */}
      <QuickActions />

      {/* ─── Main Dashboard Grid ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Insights & Metrics (Col Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
             <MetricCard 
              title="Health Score" 
              value="84" 
              unit="/100" 
              trend="+2" 
              status="normal"
              icon={<Activity className="text-primary" size={20} />}
            />
            <MetricCard 
              title="Sleep" 
              value="7.5" 
              unit="hrs" 
              trend="-0.5" 
              status="normal"
              icon={<Moon className="text-health-violet" size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HydrationWidget />
            <HealthCard padding="md" hoverEffect className="flex flex-col justify-between">
               <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-health-normal/10 flex items-center justify-center text-health-normal">
                  <CheckCircle2 size={20} />
                </div>
                <VitalBadge status="normal" size="sm">+5%</VitalBadge>
              </div>
              <div className="mt-4">
                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Weekly Adherence</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-outfit">95</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </HealthCard>
          </div>

          {/* AI Insights & Reports Section */}
          <div className="space-y-6">
            <AIInsightsWidget />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-bold font-outfit">Recent Reports</h3>
                <Button variant="ghost" size="sm" className="text-primary font-bold">See All Reports</Button>
              </div>
              <div className="grid gap-3">
                {[1, 2].map((i) => (
                  <HealthCard key={i} padding="sm" hoverEffect className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">Full Blood Count</h4>
                      <p className="text-[12px] text-muted-foreground mt-0.5">Max Healthcare • May {10 - i}, 2026</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <VitalBadge status={i === 1 ? "normal" : "warning"}>
                        {i === 1 ? "Normal" : "2 Flags"}
                      </VitalBadge>
                      <Button variant="ghost" size="icon" className="text-muted-foreground rounded-xl">
                        <ArrowUpRight size={18} />
                      </Button>
                    </div>
                  </HealthCard>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Medications & Reminders */}
        <div className="space-y-8">
          <MedicationWidget />
          
          <HealthCard variant="muted" className="border-dashed flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="text-muted-foreground" size={20} />
            </div>
            <h4 className="font-bold text-sm">Upcoming Appointments</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">No appointments scheduled for this week.</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl text-xs font-bold px-6">Book Visit</Button>
          </HealthCard>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, trend, status, icon }: any) {
  return (
    <HealthCard padding="md" hoverEffect>
      <div className="flex justify-between items-start">
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
          {icon}
        </div>
        <VitalBadge status={status as any} size="sm">{trend}</VitalBadge>
      </div>
      <div className="mt-4">
        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold font-outfit">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
    </HealthCard>
  );
}

// Re-importing Lucide missing icons
import { Calendar, FileText as FileTextOriginal } from "lucide-react";

// Dummy for FileText which was not imported
function FileText({ size, className }: any) {
  return <FileTextOriginal size={size} className={className} />;
}

