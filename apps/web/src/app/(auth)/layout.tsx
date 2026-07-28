// ============================================
// MAATE WEB — Auth Layout
// Minimal, centered layout for Login/Signup
// ============================================

import React from "react";
import Link from "next/link";
import { HealthCard } from "@/components/ui/health-card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* ─── Left Panel: Brand & Visual ─────────── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-violet/10 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4" />
        
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-health-md">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <span className="font-outfit text-3xl font-bold tracking-tight">Maate</span>
        </Link>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-5xl font-bold font-outfit leading-[1.1] tracking-tight">
            Your clinical history, <br/>
            <span className="text-primary underline decoration-primary/20">reimagined.</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Secure, AI-powered health management for patients and families. All your reports, trends, and reminders in one place.
          </p>
        </div>

        <div className="relative z-10 text-sm text-muted-foreground">
          © 2026 Maate Health. HIPAA & DPDP Compliant.
        </div>
      </div>

      {/* ─── Right Panel: Form Content ──────────── */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </div>
    </div>
  );
}
