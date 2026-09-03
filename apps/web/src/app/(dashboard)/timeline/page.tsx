// ============================================
// MAATE WEB — Health Timeline Page
// Longitudinal Unified Health Journey & Highlights
// ============================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Activity,
  Pill,
  AlertTriangle,
  Stethoscope,
  Pin,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { format, parseISO } from "date-fns";

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  metadata?: any;
  severity?: "MILD" | "MODERATE" | "SEVERE" | "CRITICAL" | null;
  occurredAt: string;
  isPinned: boolean;
  refResourceType?: string | null;
  refResourceId?: string | null;
  document?: {
    id: string;
    title: string;
    documentType: string;
    previewUrl?: string;
  } | null;
}

interface TimelineSummary {
  total: number;
  recentEvents: number;
  criticalFlags: number;
  lastUpdate: string | null;
  byType: Record<string, number>;
}

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: any; color: string; bg: string; label: string }
> = {
  DOCUMENT_UPLOADED: {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Document",
  },
  LAB_RESULT: {
    icon: Activity,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    label: "Lab Report",
  },
  VITAL_RECORDED: {
    icon: Activity,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    label: "Vital Sign",
  },
  MEDICATION_STARTED: {
    icon: Pill,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Medication",
  },
  MEDICATION_STOPPED: {
    icon: Pill,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Med Skipped",
  },
  SYMPTOM_REPORTED: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Symptom",
  },
  CONDITION_DIAGNOSED: {
    icon: Stethoscope,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Diagnosis",
  },
  CONDITION_RESOLVED: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Resolved",
  },
  DOCTOR_VISIT: {
    icon: Stethoscope,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    label: "Doctor Note",
  },
  MILESTONE: {
    icon: CheckCircle2,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    label: "Routine",
  },
};

const filterTabs = [
  { id: "ALL", label: "All Events" },
  { id: "DOCUMENT_UPLOADED", label: "Documents" },
  { id: "VITAL_RECORDED", label: "Vitals" },
  { id: "MEDICATION_STARTED", label: "Medications" },
  { id: "SYMPTOM_REPORTED", label: "Symptoms" },
  { id: "CONDITION_DIAGNOSED", label: "Conditions" },
  { id: "DOCTOR_VISIT", label: "Doctor Notes" },
];

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (selectedFilter !== "ALL") {
        params.type = selectedFilter;
      }

      const [timelineRes, summaryRes] = await Promise.all([
        apiClient.get("/timeline", { params }),
        apiClient.get("/timeline/summary"),
      ]);

      setEvents(timelineRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      console.error("Failed to load timeline", err);
      toast({
        title: "Error loading timeline",
        description: "Could not retrieve medical timeline events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, toast]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      await apiClient.patch(`/timeline/${id}/pin`, { isPinned: !currentPin });
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, isPinned: !currentPin } : ev))
      );
      toast({
        title: !currentPin ? "Event Pinned" : "Event Unpinned",
        description: !currentPin
          ? "Event pinned to top of timeline."
          : "Event unpinned.",
      });
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  // Group events by date
  const filteredEvents = events.filter((ev) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      (ev.description && ev.description.toLowerCase().includes(q))
    );
  });

  const groupedEvents: { date: string; items: TimelineEvent[] }[] = [];
  filteredEvents.forEach((ev) => {
    const d = ev.occurredAt
      ? format(parseISO(ev.occurredAt), "MMMM d, yyyy")
      : "Recent";
    const group = groupedEvents.find((g) => g.date === d);
    if (group) {
      group.items.push(ev);
    } else {
      groupedEvents.push({ date: d, items: [ev] });
    }
  });

  return (
    <div className="space-y-8">
      {/* ─── Page Header ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">
            Health Timeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Longitudinal medical journey aggregating documents, vitals,
            symptoms, doctor notes, and adherence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTimeline}
            className="gap-2"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Highlights & Metric Cards ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Records
            </span>
            <Clock size={16} className="text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-outfit">
            {summary?.total ?? "--"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Logged across all medical categories
          </p>
        </HealthCard>

        <HealthCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent (30 Days)
            </span>
            <TrendingUp size={16} className="text-teal-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-outfit">
            {summary?.recentEvents ?? "--"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Active health events this month
          </p>
        </HealthCard>

        <HealthCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Attention Items
            </span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-outfit text-rose-500">
            {summary?.criticalFlags ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Critical or severe flagged events
          </p>
        </HealthCard>

        <HealthCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Last Updated
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-base font-semibold font-outfit truncate">
            {summary?.lastUpdate
              ? format(parseISO(summary.lastUpdate), "MMM d, h:mm a")
              : "No records"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Synced with clinical datastore
          </p>
        </HealthCard>
      </div>

      {/* ─── Search & Category Filters ─────────── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                selectedFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* ─── Timeline Feed ─────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-primary" />
        </div>
      ) : groupedEvents.length === 0 ? (
        <HealthCard className="py-16 text-center">
          <Clock size={40} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold font-outfit">
            No Timeline Events Found
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Health events, uploaded documents, recorded vitals, and reminder
            adherence will appear here chronologically.
          </p>
        </HealthCard>
      ) : (
        <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-border/60">
          {groupedEvents.map((group) => (
            <div key={group.date} className="relative space-y-4">
              {/* Date Header Node */}
              <div className="flex items-center gap-4 pl-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm font-bold font-outfit text-foreground tracking-wide">
                  {group.date}
                </span>
              </div>

              {/* Event Cards */}
              <div className="space-y-3 pl-10">
                {group.items.map((ev) => {
                  const cfg =
                    EVENT_TYPE_CONFIG[ev.eventType] ||
                    EVENT_TYPE_CONFIG.DOCUMENT_UPLOADED;
                  const Icon = cfg.icon;

                  return (
                    <HealthCard
                      key={ev.id}
                      className={cn(
                        "p-4 transition-all hover:border-primary/40",
                        ev.isPinned && "border-primary/50 bg-primary/5",
                        ev.severity === "CRITICAL" && "border-rose-500/40 bg-rose-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                              cfg.bg
                            )}
                          >
                            <Icon size={20} className={cfg.color} />
                          </div>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">
                                {ev.title}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase",
                                  cfg.bg,
                                  cfg.color
                                )}
                              >
                                {cfg.label}
                              </span>
                              {ev.severity && ev.severity !== "MILD" && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase",
                                    ev.severity === "CRITICAL"
                                      ? "bg-rose-500/20 text-rose-500"
                                      : "bg-amber-500/20 text-amber-500"
                                  )}
                                >
                                  {ev.severity}
                                </span>
                              )}
                            </div>

                            {ev.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {ev.description}
                              </p>
                            )}

                            {/* Metadata Pills */}
                            {ev.metadata && (
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {ev.metadata.value !== undefined && (
                                  <span className="text-[11px] font-medium bg-muted/80 px-2 py-0.5 rounded-md text-foreground">
                                    Reading: {ev.metadata.value}
                                    {ev.metadata.valueSecondary
                                      ? `/${ev.metadata.valueSecondary}`
                                      : ""}{" "}
                                    {ev.metadata.unit || ""}
                                  </span>
                                )}
                                {ev.metadata.medicineName && (
                                  <span className="text-[11px] font-medium bg-muted/80 px-2 py-0.5 rounded-md text-foreground">
                                    Rx: {ev.metadata.medicineName}
                                  </span>
                                )}
                              </div>
                            )}

                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                              <Clock size={11} />
                              {ev.occurredAt
                                ? format(parseISO(ev.occurredAt), "h:mm a")
                                : ""}
                            </span>
                          </div>
                        </div>

                        {/* Action Tools */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleTogglePin(ev.id, ev.isPinned)}
                            title={ev.isPinned ? "Unpin event" : "Pin event"}
                            className={cn(
                              "p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground",
                              ev.isPinned && "text-primary bg-primary/10"
                            )}
                          >
                            <Pin size={14} className={cn(ev.isPinned && "fill-primary")} />
                          </button>
                        </div>
                      </div>
                    </HealthCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
