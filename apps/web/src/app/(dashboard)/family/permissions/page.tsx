// ============================================
// Maate Web — Caregiver Permissions & Shares
// Manage authorized proxies and doctor links
// ============================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Eye,
  Edit3,
  Trash2,
  UserPlus,
  History,
  Lock,
  Search,
  Stethoscope,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

export default function CaregiverPermissionsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [doctorShares, setDoctorShares] = useState<any[]>([]);
  const [ownedMembers, setOwnedMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Caregiver Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState("VIEW");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const [sharesRes, profilesRes] = await Promise.all([
        apiClient.get("/share/doctor"),
        apiClient.get("/family/profiles"),
      ]);

      setDoctorShares(sharesRes.data?.data || []);
      setOwnedMembers(profilesRes.data?.data?.owned || []);
      if (profilesRes.data?.data?.owned?.length > 0 && !selectedMemberId) {
        setSelectedMemberId(profilesRes.data.data.owned[0].id);
      }
    } catch (err) {
      console.error("Failed to load permissions", err);
      toast({
        title: "Error loading permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMemberId, toast]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleRevokeShare = async (id: string) => {
    try {
      await apiClient.patch(`/share/doctor/${id}/revoke`);
      toast({
        title: "Doctor Share Revoked",
        description: "The share token has been invalidated immediately.",
      });
      fetchPermissions();
    } catch (err) {
      console.error("Failed to revoke share", err);
      toast({ title: "Error revoking share", variant: "destructive" });
    }
  };

  const handleInviteCaregiver = async () => {
    if (!selectedMemberId || !caregiverEmail) return;
    try {
      setIsSubmitting(true);
      await apiClient.post(`/family/members/${selectedMemberId}/share`, {
        granteeEmail: caregiverEmail,
        level: accessLevel,
      });
      toast({
        title: "Caregiver Access Granted",
        description: `Access shared with ${caregiverEmail}.`,
      });
      setIsInviteOpen(false);
      setCaregiverEmail("");
      fetchPermissions();
    } catch (err: any) {
      console.error("Failed to share access", err);
      toast({
        title: "Error granting access",
        description: err.response?.data?.message || "User not found or invalid email.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* ─── Header ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-10 w-10 text-muted-foreground"
            onClick={() => router.push("/family")}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Access & Sharing Management
              </span>
            </div>
            <h1 className="text-3xl font-bold font-outfit tracking-tight">
              Caregiver & Doctor Permissions
            </h1>
          </div>
        </div>
        <Button
          onClick={() => setIsInviteOpen(true)}
          className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold gap-2"
        >
          <UserPlus size={18} />
          Delegate Caregiver
        </Button>
      </div>

      {/* ─── Doctor Share Links Table ─────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-outfit flex items-center gap-2">
            <Stethoscope size={20} className="text-primary" />
            Active Doctor Consultation Links
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {doctorShares.length} links generated
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-primary" />
          </div>
        ) : doctorShares.length === 0 ? (
          <HealthCard className="p-6 text-center text-sm text-muted-foreground">
            No active doctor consultation links generated.
          </HealthCard>
        ) : (
          <div className="space-y-3">
            {doctorShares.map((s) => (
              <HealthCard
                key={s.id}
                className={cn(
                  "p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all",
                  s.isRevoked && "opacity-60 bg-muted/40",
                  !s.isRevoked && s.isExpired && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground font-outfit">
                      {s.doctorName || "Consulting Physician"}
                    </span>
                    {s.isRevoked ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-500">
                        Revoked
                      </span>
                    ) : s.isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-500">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-500">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires: {format(parseISO(s.expiresAt), "MMM d, yyyy h:mm a")} • Viewed:{" "}
                    <strong>{s.accessedCount} times</strong>
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    URL: {s.shareUrl}
                  </p>
                </div>

                {!s.isRevoked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeShare(s.id)}
                    className="text-rose-500 border-rose-500/20 hover:bg-rose-500/10 text-xs shrink-0"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Revoke Link
                  </Button>
                )}
              </HealthCard>
            ))}
          </div>
        )}
      </div>

      {/* ─── Delegate Caregiver Dialog ────────── */}
      <Drawer open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle className="font-outfit text-xl">Delegate Caregiver Access</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Select Family Profile
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
              >
                {ownedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.relationship})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Caregiver Email (Must be a registered Maate user)
              </label>
              <input
                type="email"
                placeholder="caregiver@example.com"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Access Level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
              >
                <option value="VIEW">VIEW (Read-only reports & vitals)</option>
                <option value="EDIT">EDIT (Log vitals & reminders)</option>
                <option value="FULL">FULL (Full administrative access)</option>
                <option value="EMERGENCY">EMERGENCY (Critical alerts only)</option>
              </select>
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteCaregiver}
              disabled={!selectedMemberId || !caregiverEmail || isSubmitting}
            >
              {isSubmitting ? "Granting..." : "Grant Access"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
