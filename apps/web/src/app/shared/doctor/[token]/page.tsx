// ============================================
// Maate Clinician Portal — Doctor Share View
// Dedicated public consultation view
// ============================================

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Activity,
  Pill,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  Eye,
  RefreshCw,
} from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import axios from "axios";
import { format, parseISO } from "date-fns";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";

export default function DoctorPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchSharedRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_BASE}/share/doctor/view/${token}`);
        setData(res.data?.data);
      } catch (err: any) {
        console.error("Failed to load doctor share", err);
        const msg =
          err.response?.data?.message ||
          "This medical share link is invalid, expired, or has been revoked by the patient.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedRecords();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw size={36} className="animate-spin text-primary mb-4" />
        <h2 className="text-xl font-bold font-outfit">Loading Patient Records...</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Decrypting clinical records and verifying share token
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
          <Lock size={30} />
        </div>
        <h2 className="text-2xl font-bold font-outfit">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{error}</p>
        <div className="mt-6 p-4 rounded-xl bg-muted/60 text-xs text-muted-foreground border border-border">
          <p className="font-semibold text-foreground">HIPAA / DPDP Privacy Notice</p>
          <p className="mt-1">
            Access to this health record is governed by patient consent. Share links expire
            automatically or can be revoked by the patient at any time.
          </p>
        </div>
      </div>
    );
  }

  const { patient, shareInfo, documents, vitals, medications, timeline } = data;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ─── Top Clinician Bar ─────────────────── */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-base">
              M
            </div>
            <div>
              <span className="font-bold font-outfit text-base tracking-tight">Maate</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                Clinician Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Secure Read-Only Access</span>
            {shareInfo.doctorName && (
              <span className="hidden sm:inline font-medium text-foreground">
                • {shareInfo.doctorName}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* Patient Demographics Banner */}
        <HealthCard className="p-6 bg-gradient-to-r from-primary/5 via-card to-card border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl font-outfit">
                {patient.fullName?.[0] || "P"}
              </div>
              <div>
                <h1 className="text-2xl font-bold font-outfit">{patient.fullName}</h1>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {patient.gender && (
                    <span className="capitalize">Gender: {patient.gender.toLowerCase()}</span>
                  )}
                  {patient.dateOfBirth && (
                    <span>• DOB: {format(parseISO(patient.dateOfBirth), "MMM d, yyyy")}</span>
                  )}
                  {patient.bloodGroup && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-bold">
                      Blood Group: {patient.bloodGroup}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right space-y-1 text-xs text-muted-foreground border-t md:border-t-0 pt-4 md:pt-0">
              <p>
                Access Expires:{" "}
                <strong className="text-foreground">
                  {format(parseISO(shareInfo.expiresAt), "MMM d, yyyy h:mm a")}
                </strong>
              </p>
              <p>
                Resources Shared:{" "}
                <span className="text-primary font-medium">
                  {shareInfo.sharedResources?.join(", ")}
                </span>
              </p>
            </div>
          </div>
        </HealthCard>

        {/* Clinical Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Documents & AI Summaries */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-outfit flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Medical Documents & Diagnostic Reports
              </h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {documents?.length || 0} Records
              </span>
            </div>

            {!documents || documents.length === 0 ? (
              <HealthCard className="p-8 text-center text-muted-foreground text-sm">
                No diagnostic documents shared in this consultation.
              </HealthCard>
            ) : (
              documents.map((doc: any) => (
                <HealthCard key={doc.id} className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-foreground font-outfit">
                          {doc.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                          {doc.documentType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Report Date: {format(parseISO(doc.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>

                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Eye size={18} />
                      </a>
                    )}
                  </div>

                  {/* AI Clinical Summary */}
                  {doc.aiSummary && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <Activity size={14} />
                        <span>AI Clinical Synthesis</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {doc.aiSummary.summaryText}
                      </p>
                      {doc.aiSummary.recommendations && (
                        <div className="pt-1 text-[11px] text-muted-foreground">
                          <strong>Key Recommendations: </strong>
                          {Array.isArray(doc.aiSummary.recommendations)
                            ? doc.aiSummary.recommendations.join("; ")
                            : JSON.stringify(doc.aiSummary.recommendations)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* OCR Structured Parameters */}
                  {doc.ocrResult?.structuredData?.tests && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="py-2 pr-4 font-semibold">Test / Biomarker</th>
                            <th className="py-2 px-4 font-semibold">Value</th>
                            <th className="py-2 px-4 font-semibold">Reference Range</th>
                            <th className="py-2 pl-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {doc.ocrResult.structuredData.tests.map((t: any, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="py-2 pr-4 font-medium text-foreground">
                                {t.test_name || t.name}
                              </td>
                              <td className="py-2 px-4 font-semibold">
                                {t.value} {t.unit || ""}
                              </td>
                              <td className="py-2 px-4 text-muted-foreground">
                                {t.reference_range || "--"}
                              </td>
                              <td className="py-2 pl-4">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                    t.status === "HIGH" || t.status === "CRITICAL"
                                      ? "bg-rose-500/15 text-rose-500"
                                      : t.status === "LOW"
                                      ? "bg-amber-500/15 text-amber-500"
                                      : "bg-emerald-500/15 text-emerald-500"
                                  )}
                                >
                                  {t.status || "NORMAL"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </HealthCard>
              ))
            )}
          </div>

          {/* Right Column: Vitals & Medications */}
          <div className="space-y-6">
            {/* Active Medications */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold font-outfit flex items-center gap-2">
                <Pill size={18} className="text-emerald-500" />
                Active Medications
              </h2>

              {!medications || medications.length === 0 ? (
                <HealthCard className="p-4 text-center text-xs text-muted-foreground">
                  No active medication regimens shared.
                </HealthCard>
              ) : (
                <div className="space-y-2">
                  {medications.map((m: any) => (
                    <HealthCard key={m.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">
                          {m.medicineName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 uppercase">
                          {m.frequency}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.dosage || "Standard dose"} • {m.mealRelation || "Any"}
                      </p>
                      {m.timesOfDay && (
                        <p className="text-[11px] text-muted-foreground">
                          Schedule: {m.timesOfDay.join(", ")}
                        </p>
                      )}
                    </HealthCard>
                  ))}
                </div>
              )}
            </div>

            {/* Vitals Summary */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold font-outfit flex items-center gap-2">
                <Activity size={18} className="text-rose-500" />
                Recent Vital Signs
              </h2>

              {!vitals || vitals.length === 0 ? (
                <HealthCard className="p-4 text-center text-xs text-muted-foreground">
                  No vital signs recorded.
                </HealthCard>
              ) : (
                <div className="space-y-2">
                  {vitals.slice(0, 8).map((v: any) => (
                    <HealthCard key={v.id} className="p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {v.type?.replace(/_/g, " ")}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(v.measuredAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold font-outfit text-foreground">
                          {v.value}
                          {v.valueSecondary ? `/${v.valueSecondary}` : ""} {v.unit}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">
                          {v.status}
                        </p>
                      </div>
                    </HealthCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
