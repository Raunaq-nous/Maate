// ============================================
// Maate Web — Global Root Error Boundary
// Handles errors in the root layout (HTML, Body)
// ============================================

"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center antialiased">
        <div className="mb-6 rounded-full bg-health-critical/10 p-6 text-health-critical">
          <AlertCircle size={48} />
        </div>
        
        <h1 className="text-4xl font-bold font-outfit tracking-tighter mb-2">Critical System Failure</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          A core system component failed to initialize. We are automatically logging this incident for our engineering team.
        </p>

        <Button 
          onClick={() => reset()} 
          className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-3 shadow-health-lg transition-transform active:scale-95"
        >
          <RefreshCcw size={20} />
          Restart Maate
        </Button>

        <p className="fixed bottom-10 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-black opacity-20">
          Maate Health Platform · Production Environment
        </p>
      </body>
    </html>
  );
}
