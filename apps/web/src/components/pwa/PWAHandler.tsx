// ============================================
// Maate Web — PWAHandler
// Registration & Install Experience
// ============================================

"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function PWAHandler() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBar, setShowInstallBar] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.log("SW registration failed:", err));
      });
    }

    // Handle Install Prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show install prompt after 5 seconds of first session
      const hasSeenPrompt = localStorage.getItem("maate_install_prompt");
      if (!hasSeenPrompt) {
        setTimeout(() => setShowInstallBar(true), 5000);
      }
    });

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setShowInstallBar(false);
      toast({
        title: "App Installed!",
        description: "Maate is now available on your home screen.",
      });
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBar(false);
    }
    localStorage.setItem("maate_install_prompt", "true");
  };

  if (!showInstallBar) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-primary/95 backdrop-blur-xl border border-white/20 rounded-[28px] p-5 shadow-health-lg flex flex-col gap-4 text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setShowInstallBar(false)}>
           <X size={18} />
        </div>
        
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Smartphone size={24} />
           </div>
           <div className="flex-1">
              <h4 className="font-bold font-outfit text-lg flex items-center gap-2">
                 Install Maate App
                 <Sparkles size={14} className="text-yellow-300" />
              </h4>
              <p className="text-[11px] font-medium text-white/80 leading-relaxed">
                 Install for a faster, offline-ready experience and instant health alerts.
              </p>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
            onClick={handleInstall}
            className="flex-1 rounded-xl h-11 bg-white text-primary hover:bg-white/90 font-bold gap-2"
           >
              <Download size={18} />
              Add to Home Screen
           </Button>
           <Button 
            variant="ghost" 
            onClick={() => {
              setShowInstallBar(false);
              localStorage.setItem("maate_install_prompt", "true");
            }}
            className="rounded-xl h-11 px-4 text-white hover:bg-white/10 font-bold"
           >
              Later
           </Button>
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
