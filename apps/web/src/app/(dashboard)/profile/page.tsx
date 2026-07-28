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
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get("/users/me");
        const profile = res.data.data;
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
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast({
          title: "Error fetching profile",
          description: "Could not load your profile details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [toast]);

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
      </form>
    </div>
  );
}
