// ============================================
// Maate Web — Family Dashboard
// Centralized health management for loved ones
// ============================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Heart,
  Activity,
  ShieldAlert,
  UserPlus,
  ChevronRight,
  Clock,
  Settings,
  Bell,
  Trash2,
  Share2,
  Lock,
  RefreshCw,
  Plus,
  Stethoscope,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { VitalBadge } from "@/components/ui/vital-badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  accessLevel?: string;
}

interface DoctorShare {
  id: string;
  shareToken: string;
  doctorName?: string;
  doctorEmail?: string;
  expiresAt: string;
  isRevoked: boolean;
  isExpired: boolean;
  accessedCount: number;
  shareUrl: string;
}

export default function FamilyDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const [ownedMembers, setOwnedMembers] = useState<FamilyMember[]>([]);
  const [sharedProfiles, setSharedProfiles] = useState<FamilyMember[]>([]);
  const [doctorShares, setDoctorShares] = useState<DoctorShare[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRelationship, setNewRelationship] = useState("PARENT");
  const [newDob, setNewDob] = useState("");
  const [newGender, setNewGender] = useState("FEMALE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [shareDays, setShareDays] = useState(7);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchFamilyData = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, sharesRes] = await Promise.all([
        apiClient.get("/family/profiles"),
        apiClient.get("/share/doctor"),
      ]);

      setOwnedMembers(profilesRes.data?.data?.owned || []);
      setSharedProfiles(profilesRes.data?.data?.shared || []);
      setDoctorShares(sharesRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load family data", err);
      toast({
        title: "Error loading family profiles",
        description: "Could not retrieve managed family members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFamilyData();
  }, [fetchFamilyData]);

  const handleCreateMember = async () => {
    if (!newFullName) return;
    try {
      setIsSubmitting(true);
      await apiClient.post("/family/members", {
        fullName: newFullName,
        relationship: newRelationship,
        dateOfBirth: newDob ? new Date(newDob) : undefined,
        gender: newGender,
      });
      toast({
        title: "Family Member Added",
        description: `${newFullName} has been added to your care circle.`,
      });
      setIsAddModalOpen(false);
      setNewFullName("");
      fetchFamilyData();
    } catch (err) {
      console.error("Failed to add member", err);
      toast({
        title: "Error adding member",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}'s profile?`)) return;
    try {
      await apiClient.delete(`/family/members/${id}`);
      toast({
        title: "Profile Removed",
        description: `${name}'s profile was removed.`,
      });
      fetchFamilyData();
    } catch (err) {
      console.error("Failed to delete member", err);
      toast({
        title: "Error",
        description: "Could not remove member profile.",
        variant: "destructive",
      });
    }
  };

  const handleCreateDoctorShare = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.post("/share/doctor", {
        doctorName: doctorName || undefined,
        doctorEmail: doctorEmail || undefined,
        expiresInDays: shareDays,
        sharedResources: ["lab_reports", "prescriptions", "vitals", "timeline"],
      });
      const shareUrl = `${window.location.origin}${res.data?.data?.shareUrl}`;
      setCreatedShareUrl(shareUrl);
      toast({
        title: "Share Link Generated",
        description: "Secure, time-limited consultation link created.",
      });
      fetchFamilyData();
    } catch (err) {
      console.error("Failed to create share link", err);
      toast({
        title: "Error generating share link",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to Clipboard", description: "Share URL ready to send to doctor." });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* ─── Header ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Family Health Vault</h1>
          <p className="text-muted-foreground mt-1">
            Manage healthcare for your parents and children in one unified care circle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/family/permissions")}
            className="rounded-xl h-11 px-6 font-bold text-muted-foreground gap-2"
          >
            <Settings size={18} />
            Permissions
          </Button>
          <Button
            onClick={() => {
              setCreatedShareUrl(null);
              setIsShareModalOpen(true);
            }}
            variant="outline"
            className="rounded-xl h-11 px-5 border-primary/30 text-primary font-bold gap-2 hover:bg-primary/5"
          >
            <Stethoscope size={18} />
            Doctor Share
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold shadow-health-md"
          >
            <UserPlus size={18} className="mr-2" />
            Add Profile
          </Button>
        </div>
      </div>

      {/* ─── Managed Profiles Section ─────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold font-outfit text-lg flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Profiles You Manage
          </h2>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {ownedMembers.length} active
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={28} className="animate-spin text-primary" />
          </div>
        ) : ownedMembers.length === 0 ? (
          <HealthCard className="p-8 text-center text-muted-foreground">
            <Users size={36} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No Family Members Added Yet</p>
            <p className="text-xs mt-1">
              Add your parents, children, or dependents to manage their prescriptions and reports.
            </p>
          </HealthCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedMembers.map((member) => (
              <HealthCard
                key={member.id}
                padding="none"
                className="overflow-hidden group hover:ring-2 ring-primary/20 transition-all"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg font-outfit">
                        {member.fullName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold font-outfit text-base text-foreground">
                          {member.fullName}
                        </h3>
                        <span className="text-xs text-muted-foreground capitalize">
                          {member.relationship.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMember(member.id, member.fullName)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                      title="Remove profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">
                      {member.gender ? `Gender: ${member.gender.toLowerCase()}` : "Active Profile"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/family/permissions")}
                      className="text-primary hover:text-primary text-xs h-7 px-2"
                    >
                      Caregivers <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </HealthCard>
            ))}
          </div>
        )}
      </div>

      {/* ─── Shared With You Section ───────────── */}
      {sharedProfiles.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold font-outfit text-lg flex items-center gap-2">
              <ShieldAlert size={20} className="text-teal-500" />
              Profiles Shared With You (Caregiver Access)
            </h2>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {sharedProfiles.length} access granted
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedProfiles.map((member) => (
              <HealthCard key={member.id} className="p-5 space-y-3 border-teal-500/20 bg-teal-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-600 font-bold font-outfit text-base">
                    {member.fullName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold font-outfit text-base text-foreground">
                      {member.fullName}
                    </h3>
                    <span className="text-xs text-muted-foreground capitalize">
                      {member.relationship?.toLowerCase() || "Caregiver Proxy"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <span>Access Level:</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 font-bold text-[10px] uppercase">
                    {member.accessLevel || "VIEW"}
                  </span>
                </div>
              </HealthCard>
            ))}
          </div>
        </div>
      )}

      {/* ─── Add Family Member Dialog ─────────── */}
      <Drawer open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle className="font-outfit text-xl">Add Family Member</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Kamla Devi"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Relationship
                </label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                >
                  <option value="PARENT">Parent</option>
                  <option value="SPOUSE">Spouse</option>
                  <option value="CHILD">Child</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="GRANDPARENT">Grandparent</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Gender
                </label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMember} disabled={!newFullName || isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ─── Doctor Share Dialog ───────────────── */}
      <Drawer open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DrawerContent className="sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle className="font-outfit text-xl flex items-center gap-2">
              <Stethoscope size={20} className="text-primary" />
              Generate Doctor Share Link
            </DrawerTitle>
          </DrawerHeader>

          {createdShareUrl ? (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Consultation Link Ready
                </p>
                <p className="mt-1 text-muted-foreground">
                  The doctor can view diagnostic reports, vitals, and medication regimens securely
                  without creating an account.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdShareUrl}
                  className="flex-1 bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs font-mono select-all"
                />
                <Button size="sm" onClick={() => copyToClipboard(createdShareUrl)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Doctor / Clinic Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Arvind Mehra"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Doctor Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="doctor@clinic.com"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Access Duration
                  </label>
                  <select
                    value={shareDays}
                    onChange={(e) => setShareDays(Number(e.target.value))}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                  >
                    <option value={1}>24 Hours</option>
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground border border-border">
                <strong>Shared Resources:</strong> Lab Reports, Prescriptions, Vital Signs, and
                Health Timeline. You can revoke access at any time from Permissions.
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>
              Close
            </Button>
            {!createdShareUrl && (
              <Button onClick={handleCreateDoctorShare} disabled={isSubmitting}>
                {isSubmitting ? "Generating..." : "Generate Link"}
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
