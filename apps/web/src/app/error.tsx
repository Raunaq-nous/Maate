// ============================================
// Maate Web — Global Error Boundary
// HIPAA-ready · Graceful degradation · Sentry integrated
// ============================================

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Standardized logging to console and Sentry
    logger.error("Global boundary caught exception", error, { 
      digest: error.digest,
      url: window.location.href 
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 rounded-3xl bg-health-critical/10 p-6 text-health-critical shadow-health-sm">
        <AlertCircle size={48} strokeWidth={1.5} />
      </div>
      
      <h2 className="text-3xl font-bold font-outfit tracking-tight">System Interruption</h2>
      <p className="mt-3 text-muted-foreground max-w-[400px] leading-relaxed">
        We encountered a technical error. Our clinical monitoring system has been notified and our team is investigating.
      </p>

      {error.digest && (
        <code className="mt-4 px-3 py-1 bg-muted rounded-lg text-[10px] font-mono text-muted-foreground tracking-tighter">
          REF: {error.digest}
        </code>
      )}

      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => reset()} 
          className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-health-md"
        >
          <RotateCcw size={18} />
          Reload Component
        </Button>
        <Button 
          onClick={() => (window.location.href = "/dashboard")} 
          variant="outline" 
          className="h-12 px-8 rounded-2xl font-bold gap-2"
        >
          <Home size={18} />
          Dashboard
        </Button>
      </div>
      
      <p className="mt-12 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/40">
        Secured by Maate Health Shield
      </p>
    </div>
  );
}
