// ============================================
// Maate Web — ProfileSwitcher
// Seamless patient context switching
// ============================================

"use client";

import React from "react";
import { 
  ChevronDown, 
  UserPlus
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth-store";
import Link from "next/link";

export function ProfileSwitcher() {
  const { profiles, selectedProfileId, setSelectedProfileId, fetchProfiles } = useAuthStore();

  React.useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0] || {
    id: "",
    fullName: "Select Profile",
    relationship: "SELF"
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-14 px-4 w-full justify-between gap-3 rounded-[20px] hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
              {activeProfile.fullName.charAt(0)}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold truncate max-w-[100px]">{activeProfile.fullName}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{activeProfile.relationship}</p>
            </div>
          </div>
          <ChevronDown size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[240px] rounded-[24px] p-2 shadow-xl border-border/50">
        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Switch Profile
        </DropdownMenuLabel>
        
        {profiles.map((profile) => (
          <DropdownMenuItem 
            key={profile.id}
            onClick={() => setSelectedProfileId(profile.id)}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-primary/5 focus:bg-primary/5 group"
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              selectedProfileId === profile.id ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
              {profile.fullName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{profile.fullName}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{profile.relationship}</span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-2" />
        
        <DropdownMenuItem asChild className="p-3 rounded-xl cursor-pointer hover:bg-health-sky/5 focus:bg-health-sky/5 text-health-sky gap-3">
          <Link href="/family" className="flex items-center w-full">
            <div className="w-8 h-8 rounded-full bg-health-sky/10 flex items-center justify-center mr-2">
              <UserPlus size={16} />
            </div>
            <span className="text-sm font-bold">Manage Family Members</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
