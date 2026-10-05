// ============================================
// Maate Web — User Profile Management
// View & Edit Clinical Personal Data
// ============================================

"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Heart, 
  Activity, 
  ShieldAlert, 
  ShieldCheck,
  Sparkles,
  Database,
  Save, 
  Edit2, 
  X, 
  CheckCircle2, 
  Info,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { MedicalInput } from "@/components/ui/medical-input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/use-auth-store";
import apiClient from "@/lib/api";

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // DPDP Consent preferences state
  const [consents, setConsents] = useState<Record<string, boolean>>({
    AI_SUMMARIZATION: false,
    DATA_PROCESSING: false,
  });
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);

  // Profile fields state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "PREFER_NOT_TO_SAY",
    bloodGroup: "",
    heightCm: "",
    weightKg: "",
    emergencyContact: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const [userRes, consentRes] = await Promise.allSettled([
          apiClient.get("/users/me"),
          apiClient.get("/consents"),
        ]);

        if (userRes.status === "fulfilled") {
          const profile = userRes.value.data.data;
          if (profile) {
            setFormData({
              fullName: profile.fullName || "",
              email: profile.email || "",
              phone: profile.phone || "",
              dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
              gender: profile.gender || "PREFER_NOT_TO_SAY",
              bloodGroup: profile.bloodGroup || "",
              heightCm: profile.heightCm !== null ? String(profile.heightCm) : "",
              weightKg: profile.weightKg !== null ? String(profile.weightKg) : "",
              emergencyContact: profile.emergencyContact || "",
            });
          }
        }

        if (consentRes.status === "fulfilled") {
          const consentList = consentRes.value.data?.data || [];
          const consentMap: Record<string, boolean> = {
            AI_SUMMARIZATION: false,
            DATA_PROCESSING: false,
          };
          consentList.forEach((c: any) => {
            consentMap[c.purpose] = c.granted && !c.revokedAt;
          });
          setConsents(consentMap);
        }
      } catch (error) {
        console.error("Failed to fetch user profile data:", error);
        toast({
          title: "Error fetching profile",
          description: "Could not load your profile details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  const toggleConsent = async (purpose: string) => {
    const currentlyGranted = !!consents[purpose];
    setUpdatingConsent(purpose);
    try {
      if (currentlyGranted) {
        await apiClient.post("/consents/revoke", { purpose });
        setConsents((prev) => ({ ...prev, [purpose]: false }));
        toast({
          title: "Consent Revoked",
          description: `You have withdrawn consent for ${
            purpose === "AI_SUMMARIZATION" ? "AI Document Summarization" : "Core Health Data Processing"
          }.`,
        });
      } else {
        await apiClient.post("/consents", { purpose, granted: true });
        setConsents((prev) => ({ ...prev, [purpose]: true }));
        toast({
          title: "Consent Granted",
          description: `You have granted consent for ${
            purpose === "AI_SUMMARIZATION" ? "AI Document Summarization" : "Core Health Data Processing"
          }.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Consent Update Failed",
        description: err?.response?.data?.message || "Could not update consent preference.",
        variant: "destructive",
      });
    } finally {
      setUpdatingConsent(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare payload with clean numbers
      const payload = {
        ...formData,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
      };

      const res = await apiClient.patch("/users/me", payload);
      const updatedProfile = res.data.data;

      // Update auth store session state so headers/sidebars sync
      const currentAuth = useAuthStore.getState();
      if (currentAuth.user && currentAuth.token) {
        currentAuth.setAuth(
          {
            ...currentAuth.user,
            fullName: updatedProfile.fullName || currentAuth.user.fullName,
            email: updatedProfile.email || currentAuth.user.email,
          },
          currentAuth.token
        );
      }

      toast({
        title: "Profile Saved",
        description: "Your health profile details have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save user profile:", error);
      toast({
        title: "Error saving profile",
        description: "Could not update your profile. Please check your inputs.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse p-4">
        <div className="h-12 bg-muted/60 w-1/3 rounded-xl" />
        <div className="h-64 bg-muted/30 rounded-[28px]" />
        <div className="h-40 bg-muted/30 rounded-[28px]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4">
      {/* ─── Header ───────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Your Health Profile</h1>
          <p className="text-muted-foreground mt-1">Manage and update your personal clinical records.</p>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            className="rounded-2xl h-11 px-6 bg-primary hover:bg-primary/95 text-white font-bold shadow-health-md gap-2"
          >
            <Edit2 size={16} />
            Edit Profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsEditing(false)}
              variant="outline"
              disabled={isSaving}
              className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-2xl h-11 px-6 bg-primary hover:bg-primary/95 text-white font-bold shadow-health-md gap-2"
            >
              {isSaving ? "Saving..." : "Save Profile"}
              <Save size={16} />
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ─── General Information Card ─────────── */}
        <HealthCard className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4 border-border/40">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <h3 className="text-lg font-bold font-outfit">Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MedicalInput
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. Priya Sharma"
              required
            />
            <MedicalInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditing || !!user?.email} // Lock primary email if authenticated via email
              placeholder="e.g. priya@maate.health"
            />
            <MedicalInput
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. +91 98765 43210"
            />
            <MedicalInput
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              disabled={!isEditing}
            />

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={!isEditing}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
          </div>
        </HealthCard>

        {/* ─── Vitals & Clinical Stats Card ─────── */}
        <HealthCard className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4 border-border/40">
            <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-bold font-outfit">Medical Indicators</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">Blood Group</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                disabled={!isEditing}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <MedicalInput
              label="Height (cm)"
              name="heightCm"
              type="number"
              step="0.1"
              value={formData.heightCm}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. 165"
            />

            <MedicalInput
              label="Weight (kg)"
              name="weightKg"
              type="number"
              step="0.1"
              value={formData.weightKg}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. 62"
            />
          </div>
        </HealthCard>

        {/* ─── Emergency & Security Info Card ───── */}
        <HealthCard className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4 border-border/40">
            <div className="w-10 h-10 rounded-xl bg-health-critical/10 flex items-center justify-center text-health-critical">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-lg font-bold font-outfit">Emergency Protocol</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MedicalInput
              label="Emergency Contact Phone"
              name="emergencyContact"
              type="tel"
              value={formData.emergencyContact}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. +91 99999 88888"
            />
          </div>
        </HealthCard>

        {/* ─── DPDP Privacy & Consent Preferences ─ */}
        <HealthCard className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold font-outfit">DPDP Privacy & Consent Preferences</h3>
                <p className="text-xs text-muted-foreground">Digital Personal Data Protection Act (DPDP) consent controls</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
              India DPDP 2023 Compliant
            </span>
          </div>

          <div className="space-y-4">
            {/* AI_SUMMARIZATION Consent */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/40 hover:border-border/80 transition-all">
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold font-outfit text-foreground flex items-center gap-2">
                    AI Document & Clinical Summarization
                    {consents['AI_SUMMARIZATION'] ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Active</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Withdrawn</span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Authorizes processing your lab reports and medical records using secure AI models for automatic metric extraction, health summarization, and clinical RAG chat. If revoked, AI processing will halt with WITHHELD_NO_CONSENT.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={consents['AI_SUMMARIZATION'] ? "destructive" : "default"}
                size="sm"
                disabled={updatingConsent === 'AI_SUMMARIZATION'}
                onClick={() => toggleConsent('AI_SUMMARIZATION')}
                className="rounded-xl px-4 text-xs font-bold"
              >
                {updatingConsent === 'AI_SUMMARIZATION' ? 'Updating...' : consents['AI_SUMMARIZATION'] ? 'Revoke Consent' : 'Grant Consent'}
              </Button>
            </div>

            {/* DATA_PROCESSING Consent */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/40 hover:border-border/80 transition-all">
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-9 h-9 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal mt-0.5">
                  <Database size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold font-outfit text-foreground flex items-center gap-2">
                    Core Health Data Processing
                    {consents['DATA_PROCESSING'] ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Active</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Withdrawn</span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Authorizes storing, categorizing, and aggregating your personal clinical markers, medications, and timeline history. Required for the unified health timeline.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={consents['DATA_PROCESSING'] ? "destructive" : "default"}
                size="sm"
                disabled={updatingConsent === 'DATA_PROCESSING'}
                onClick={() => toggleConsent('DATA_PROCESSING')}
                className="rounded-xl px-4 text-xs font-bold"
              >
                {updatingConsent === 'DATA_PROCESSING' ? 'Updating...' : consents['DATA_PROCESSING'] ? 'Revoke Consent' : 'Grant Consent'}
              </Button>
            </div>
          </div>
        </HealthCard>
      </form>
    </div>
  );
}
