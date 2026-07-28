// ============================================
// Maate Web — Health Timeline Page
// Longitudinal patient history hub
// ============================================

"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Download, 
  Plus, 
  History,
  FileText,
  Share2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineEventCard, TimelineEvent, EventType } from "@/components/dashboard/timeline-event-card";
import { HealthCard } from "@/components/ui/health-card";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";
import { useRouter } from "next/navigation";

// Map backend TimelineEventType to frontend EventType
const mapBackendTypeToFrontend = (type: string): EventType => {
  switch (type) {
    case "DOCUMENT_UPLOADED":
    case "LAB_RESULT":
    case "AI_INSIGHT":
    case "VITAL_RECORDED":
      return "report";
    case "PRESCRIPTION_ADDED":
    case "MEDICATION_STARTED":
    case "MEDICATION_STOPPED":
      return "medication";
    case "SYMPTOM_REPORTED":
    case "CONDITION_DIAGNOSED":
    case "CONDITION_RESOLVED":
      return "diagnosis";
    case "APPOINTMENT":
    case "DOCTOR_VISIT":
    case "HOSPITALIZATION":
    case "VACCINATION":
      return "visit";
    case "SURGERY":
      return "surgery";
    case "MILESTONE":
    default:
      return "reminder";
  }
};

const getSubtitle = (event: any) => {
  if (event.metadata) {
    try {
      const meta = typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata;
      return meta.providerName || meta.doctorName || meta.labName || meta.dosage || event.refResourceType || "Health Record";
    } catch (e) {
      // ignore
    }
  }
  return event.refResourceType || "Health Record";
};

const formatSeverity = (sev: string) => {
  if (!sev) return "";
  return sev.charAt(0) + sev.slice(1).toLowerCase();
};

export default function HealthTimelinePage() {
  const router = useRouter();
  const selectedProfileId = useAuthStore((state) => state.selectedProfileId);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/timeline", {
        params: { limit: 100 }
      });
      
      const backendEvents = res.data?.data || [];
      const mappedEvents: TimelineEvent[] = backendEvents.map((be: any) => {
        const type = mapBackendTypeToFrontend(be.eventType);
        
        // Format occurredAt to match frontend date format: e.g. "MAY 05, 2026"
        const dateObj = new Date(be.occurredAt);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }).toUpperCase();

        const attachments = [];
        if (be.document) {
          attachments.push({
            name: be.document.title || "Attached Document",
            url: be.document.fileUrl,
          });
        }

        return {
          id: be.id,
          type,
          title: be.title,
          subtitle: getSubtitle(be),
          date: formattedDate,
          description: be.description || undefined,
          status: be.severity ? formatSeverity(be.severity) : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          isPinned: be.isPinned || false,
          occurredAt: be.occurredAt,
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      console.error("Failed to fetch health timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProfileId) {
      fetchTimeline();
    }
  }, [selectedProfileId]);

  const handlePinToggle = async (id: string, isPinned: boolean) => {
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPinned } : e))
    );

    try {
      await apiClient.patch(`/timeline/${id}/pin`, { isPinned });
    } catch (error) {
      console.error("Failed to toggle pin state:", error);
      // Revert if error
      fetchTimeline();
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesFilter = activeFilter === "all" || event.type === activeFilter;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group events by year dynamically
  const eventsByYear: Record<string, TimelineEvent[]> = {};
  filteredEvents.forEach(event => {
    const year = new Date((event as any).occurredAt || event.date).getFullYear().toString();
    if (!eventsByYear[year]) {
      eventsByYear[year] = [];
    }
    eventsByYear[year].push(event);
  });

  // Sorted years in descending order
  const sortedYears = Object.keys(eventsByYear).sort((a, b) => Number(b) - Number(a));

  // Stats calculation
  const totalReports = events.filter(e => e.type === "report").length;
  const totalVisits = events.filter(e => e.type === "visit").length;
  
  const getPatientSince = () => {
    if (events.length === 0) return "Jan 2026";
    const oldestEvent = events[events.length - 1];
    const dateObj = new Date((oldestEvent as any).occurredAt || oldestEvent.date);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* ─── Header & Actions ─────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Health Records</h1>
          <p className="text-muted-foreground mt-1">Your longitudinal clinical history, securely stored.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold text-muted-foreground gap-2">
            <Download size={18} />
            Export Vault
          </Button>
          <Button 
            onClick={() => router.push("/reports/upload")}
            className="rounded-[20px] h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold shadow-health-md"
          >
            <Plus size={18} className="mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* ─── Search & Filters ─────────────────── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input 
            type="text"
            placeholder="Search by report name, doctor, or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 bg-card/50 border rounded-[24px] pl-12 pr-6 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-[20px] border">
           {["all", "report", "medication", "visit"].map((f) => (
             <button
               key={f}
               onClick={() => setActiveFilter(f)}
               className={cn(
                 "px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                 activeFilter === f ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
               )}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      {/* ─── Timeline ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <HealthCard padding="md" className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-health-sky/10 text-health-sky flex items-center justify-center">
                   <History size={20} />
                </div>
                <h4 className="font-bold text-sm">Patient Since</h4>
             </div>
             <p className="text-2xl font-bold font-outfit">{getPatientSince()}</p>
             <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                   <span>Reports</span>
                   <span className="text-foreground">{totalReports}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                   <span>Visits</span>
                   <span className="text-foreground">{totalVisits}</span>
                </div>
             </div>
          </HealthCard>

          <HealthCard variant="glass" className="bg-primary/5 border-primary/10">
             <div className="flex items-start gap-3">
               <Share2 className="text-primary mt-1" size={18} />
               <div>
                 <h4 className="text-sm font-bold">Share Records</h4>
                 <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                   Generate a secure, time-limited link to share specific reports with your doctor.
                 </p>
                 <Button variant="link" className="p-0 h-auto text-primary text-[11px] font-bold mt-2">Manage Access</Button>
               </div>
             </div>
          </HealthCard>
        </div>

        {/* Timeline Events */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-primary" size={36} />
              <p className="text-sm font-bold text-muted-foreground">Loading patient health timeline...</p>
            </div>
          ) : sortedYears.length > 0 ? (
            <div className="space-y-12">
              {sortedYears.map((year) => (
                <div key={year} className="space-y-6 relative">
                  <div className="absolute left-[23px] top-10 bottom-0 w-0.5 bg-muted/40" />
                  
                  <div className="flex items-center gap-3 px-1">
                     <div className="w-12 h-12 rounded-full border-2 border-muted flex items-center justify-center bg-background z-10">
                        <span className="text-xs font-bold">{year}</span>
                     </div>
                     <div className="h-[2px] flex-1 bg-muted/30" />
                  </div>

                  <div className="pl-4 space-y-4">
                     {eventsByYear[year].map((event) => (
                        <div key={event.id} className="relative pl-10">
                           <div className="absolute left-[-23px] top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 bg-primary" />
                           <TimelineEventCard event={event} onPinToggle={handlePinToggle} />
                        </div>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
                 <Search size={32} />
              </div>
              <p className="text-sm font-bold text-muted-foreground">No records found matching your query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
