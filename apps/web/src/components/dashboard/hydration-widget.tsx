// ============================================
// Maate Dashboard — HydrationWidget
// Interactive water tracking
// ============================================

"use client";

import React, { useState } from "react";
import { Droplet, Plus, Minus } from "lucide-react";
import { HealthCard } from "@/components/ui/health-card";
import { Button } from "@/components/ui/button";

export function HydrationWidget() {
  const [glasses, setGlasses] = useState(4);
  const goal = 8;
  const percentage = (glasses / goal) * 100;

  return (
    <HealthCard padding="md" hoverEffect className="relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-health-sky/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="flex justify-between items-start mb-6">
        <div className="w-10 h-10 rounded-xl bg-health-sky/10 flex items-center justify-center text-health-sky">
          <Droplet size={20} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hydration</p>
          <p className="text-xl font-bold font-outfit">{glasses * 250} <span className="text-xs text-muted-foreground">ml</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end text-xs font-bold">
          <span className="text-muted-foreground">{glasses} of {goal} glasses</span>
          <span className="text-health-sky">{Math.round(percentage)}%</span>
        </div>
        
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-health-sky transition-all duration-700 ease-out" 
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="flex-1 h-10 rounded-xl border-health-sky/20 text-health-sky hover:bg-health-sky/5"
            onClick={() => setGlasses(prev => Math.max(0, prev - 1))}
          >
            <Minus size={16} />
          </Button>
          <Button 
            className="flex-[2] h-10 rounded-xl bg-health-sky hover:bg-health-sky/90 text-white shadow-lg shadow-health-sky/20"
            onClick={() => setGlasses(prev => Math.min(goal, prev + 1))}
          >
            <Plus size={16} className="mr-2" />
            Add Glass
          </Button>
        </div>
      </div>
    </HealthCard>
  );
}
