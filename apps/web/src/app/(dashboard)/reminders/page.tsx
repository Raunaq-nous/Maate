// ============================================
// Maate Web — Reminders Page
// Central health schedule & adherence
// ============================================

"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Bell,
  Settings2,
  ChevronRight,
  Pill,
  Droplet,
  Utensils,
  Moon,
  Loader2,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { ReminderCard, ReminderType } from "@/components/dashboard/reminder-card";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";

import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger,
  DrawerClose,
  DrawerFooter
} from "@/components/ui/drawer";

interface UIReminder {
  id: string;
  dbId: string;
  type: ReminderType;
  title: string;
  subtitle: string;
  time: string;
  status: "pending" | "completed" | "snoozed";
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<UIReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"medication" | "water" | "meal">("medication");
  const { toast } = useToast();

  // Form states
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medTime, setMedTime] = useState("08:00");
  const [medMealRelation, setMedMealRelation] = useState("ANY");
  const [medInstructions, setMedInstructions] = useState("");

  const [mealType, setMealType] = useState("BREAKFAST");
  const [mealTime, setMealTime] = useState("08:30");
  const [mealNotes, setMealNotes] = useState("");

  const [waterGoal, setWaterGoal] = useState("2000");
  const [waterInterval, setWaterInterval] = useState("90");
  const [waterStart, setWaterStart] = useState("07:00");
  const [waterEnd, setWaterEnd] = useState("21:00");
  const [waterGlass, setWaterGlass] = useState("250");

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/reminders/active");
      const { meds, water, meals, logs } = res.data.data;
      
      const list: UIReminder[] = [];

      if (meds) {
        meds.forEach((med: any) => {
          const log = logs?.find((l: any) => l.reminderId === med.id);
          list.push({
            id: `med_${med.id}`,
            dbId: med.id,
            type: "medication",
            title: med.medicineName,
            subtitle: `${med.dosage || ""} • ${med.mealRelation || "ANY"}${med.instructions ? " • " + med.instructions : ""}`,
            time: med.timesOfDay?.join(", ") || "",
            status: log?.response === "TAKEN" ? "completed" : log?.response === "SNOOZED" ? "snoozed" : "pending",
          });
        });
      }

      if (water && water.isActive) {
        const log = logs?.find((l: any) => l.reminderId === water.id);
        list.push({
          id: `water_${water.id}`,
          dbId: water.id,
          type: "water",
          title: "Hydration Goal",
          subtitle: `Goal: ${water.dailyGoalMl}ml • Glass: ${water.glassSizeMl}ml`,
          time: `${water.activeStart} - ${water.activeEnd}`,
          status: log?.response === "TAKEN" ? "completed" : log?.response === "SNOOZED" ? "snoozed" : "pending",
        });
      }

      if (meals) {
        meals.forEach((meal: any) => {
          const log = logs?.find((l: any) => l.reminderId === meal.id);
          list.push({
            id: `meal_${meal.id}`,
            dbId: meal.id,
            type: "meal",
            title: `${meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()} Reminder`,
            subtitle: meal.dietaryNotes || "Meal time",
            time: meal.scheduledTime,
            status: log?.response === "TAKEN" ? "completed" : log?.response === "SNOOZED" ? "snoozed" : "pending",
          });
        });
      }

      setReminders(list);
    } catch (err: any) {
      toast({
        title: "Error fetching reminders",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleComplete = async (reminder: UIReminder) => {
    const isCompleted = reminder.status === "completed";
    const nextStatus = isCompleted ? "SKIPPED" : "TAKEN";

    try {
      // Optmistically update UI
      setReminders(prev => prev.map(r => 
        r.id === reminder.id ? { ...r, status: nextStatus === "TAKEN" ? "completed" : "pending" } : r
      ));

      await apiClient.post(`/reminders/${reminder.type}/${reminder.dbId}/log`, {
        response: nextStatus,
      });

      toast({
        title: nextStatus === "TAKEN" ? "Completed!" : "Reverted!",
        description: `${reminder.title} marked.`,
      });
    } catch (err: any) {
      // Revert UI on error
      fetchReminders();
      toast({
        title: "Adherence update failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const handleSnooze = async (reminder: UIReminder) => {
    try {
      setReminders(prev => prev.map(r => 
        r.id === reminder.id ? { ...r, status: "snoozed" } : r
      ));

      await apiClient.post(`/reminders/${reminder.type}/${reminder.dbId}/log`, {
        response: "SNOOZED",
      });

      toast({
        title: "Snoozed",
        description: `${reminder.title} snoozed for 15 minutes.`,
      });
    } catch (err: any) {
      fetchReminders();
      toast({
        title: "Snooze failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reminder: UIReminder) => {
    try {
      await apiClient.delete(`/reminders/${reminder.dbId}`);
      toast({
        title: "Deleted",
        description: "Reminder removed successfully.",
      });
      fetchReminders();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveReminder = async () => {
    try {
      if (selectedCategory === "medication") {
        if (!medName) return toast({ title: "Name is required", variant: "destructive" });
        await apiClient.post("/reminders", {
          medicineName: medName,
          dosage: medDosage,
          frequency: "ONCE_DAILY",
          timesOfDay: [medTime],
          mealRelation: medMealRelation,
          instructions: medInstructions,
        });
      } else if (selectedCategory === "meal") {
        await apiClient.post("/reminders/meal", {
          mealType: mealType,
          scheduledTime: mealTime,
          dietaryNotes: mealNotes,
        });
      } else if (selectedCategory === "water") {
        await apiClient.post("/reminders/water", {
          dailyGoalMl: parseInt(waterGoal),
          intervalMinutes: parseInt(waterInterval),
          activeStart: waterStart,
          activeEnd: waterEnd,
          glassSizeMl: parseInt(waterGlass),
          isActive: true,
        });
      }

      toast({
        title: "Success",
        description: "Reminder created successfully.",
      });
      setIsDrawerOpen(false);
      fetchReminders();

      // Reset forms
      setMedName("");
      setMedDosage("");
      setMedInstructions("");
      setMealNotes("");
    } catch (err: any) {
      toast({
        title: "Create reminder failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const completedCount = reminders.filter(r => r.status === "completed").length;
  const progress = reminders.length > 0 ? (completedCount / reminders.length) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* ─── Header ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-outfit tracking-tight">Your Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage your medications, meals, and health goals.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 text-muted-foreground">
            <Settings2 size={20} />
          </Button>
          
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button className="rounded-[20px] h-11 px-6 shadow-health-md bg-primary hover:bg-primary/90 text-white font-bold">
                <Plus size={18} className="mr-2" />
                Add Reminder
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-w-2xl mx-auto">
              <DrawerHeader>
                <DrawerTitle>Create New Reminder</DrawerTitle>
                <p className="text-sm text-muted-foreground">Select a category to stay on track with your health.</p>
              </DrawerHeader>
              
              <div className="p-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Medication", key: "medication" as const, icon: Pill, color: "bg-primary" },
                  { label: "Water Goal", key: "water" as const, icon: Droplet, color: "bg-health-sky" },
                  { label: "Meal Time", key: "meal" as const, icon: Utensils, color: "bg-health-warning" },
                ].map((cat) => (
                  <button 
                    key={cat.label} 
                    onClick={() => setSelectedCategory(cat.key)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-[24px] border-2 transition-all group",
                      selectedCategory === cat.key ? "border-primary bg-primary/5" : "border-muted hover:border-primary/20"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform", cat.color)}>
                      <cat.icon size={22} />
                    </div>
                    <span className="text-xs font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="px-6 pb-6 space-y-4 max-h-[40vh] overflow-y-auto">
                {selectedCategory === "medication" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Medicine Name</label>
                      <input 
                        value={medName} 
                        onChange={(e) => setMedName(e.target.value)}
                        className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        placeholder="e.g. Metformin 500mg" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dosage (e.g., 1 tablet)</label>
                        <input 
                          value={medDosage} 
                          onChange={(e) => setMedDosage(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                          placeholder="e.g. 1 tablet" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meal Relation</label>
                        <select 
                          value={medMealRelation} 
                          onChange={(e) => setMedMealRelation(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold"
                        >
                          <option value="ANY">Any Time</option>
                          <option value="BEFORE_MEAL">Before Meal</option>
                          <option value="AFTER_MEAL">After Meal</option>
                          <option value="WITH_MEAL">With Meal</option>
                          <option value="EMPTY_STOMACH">Empty Stomach</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheduled Time</label>
                        <input 
                          type="time" 
                          value={medTime}
                          onChange={(e) => setMedTime(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Special Instructions</label>
                        <input 
                          value={medInstructions} 
                          onChange={(e) => setMedInstructions(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                          placeholder="e.g. Take with water" 
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedCategory === "meal" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meal Type</label>
                        <select 
                          value={mealType} 
                          onChange={(e) => setMealType(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold"
                        >
                          <option value="BREAKFAST">Breakfast</option>
                          <option value="LUNCH">Lunch</option>
                          <option value="SNACK">Snack</option>
                          <option value="DINNER">Dinner</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheduled Time</label>
                        <input 
                          type="time" 
                          value={mealTime}
                          onChange={(e) => setMealTime(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dietary Notes</label>
                      <input 
                        value={mealNotes} 
                        onChange={(e) => setMealNotes(e.target.value)}
                        className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        placeholder="e.g. Low sodium, high protein" 
                      />
                    </div>
                  </>
                )}

                {selectedCategory === "water" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Goal (ml)</label>
                        <input 
                          type="number"
                          value={waterGoal} 
                          onChange={(e) => setWaterGoal(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Interval (minutes)</label>
                        <input 
                          type="number"
                          value={waterInterval} 
                          onChange={(e) => setWaterInterval(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Start Time</label>
                        <input 
                          type="time"
                          value={waterStart} 
                          onChange={(e) => setWaterStart(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">End Time</label>
                        <input 
                          type="time"
                          value={waterEnd} 
                          onChange={(e) => setWaterEnd(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Glass Size (ml)</label>
                        <input 
                          type="number"
                          value={waterGlass} 
                          onChange={(e) => setWaterGlass(e.target.value)}
                          className="w-full h-12 rounded-xl bg-muted/50 px-4 focus:ring-2 ring-primary outline-none font-bold" 
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DrawerFooter className="flex-row gap-4">
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold">Cancel</Button>
                </DrawerClose>
                <Button onClick={handleSaveReminder} className="flex-[2] rounded-xl h-12 bg-primary hover:bg-primary/90 text-white font-bold">Save Reminder</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Left: Timeline & Adherence ───────── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Adherence Overview */}
          <HealthCard variant="glass" className="bg-gradient-to-br from-primary/5 to-health-sky/5 border-primary/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3 className="font-bold font-outfit">Today's Adherence</h3>
                  <p className="text-xs text-muted-foreground">You've completed {completedCount} of {reminders.length} tasks</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-outfit text-primary">{Math.round(progress)}%</span>
              </div>
            </div>
            
            <div className="h-3 w-full bg-white/50 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {["M", "T", "W", "T"].map((day, i) => (
                <div key={day + i} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">{day}</span>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                    i < 3 ? "bg-health-normal/10 border-health-normal/30 text-health-normal" : "bg-muted/30 border-muted"
                  )}>
                    {i < 3 ? <CheckCircle2 size={16} /> : <div className="w-1 h-1 bg-muted rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
          </HealthCard>

          {/* Timeline View */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold font-outfit text-lg flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Daily Timeline
              </h3>
              <div className="flex gap-2">
                 <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">Today</Button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading schedule...</p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-[32px] bg-muted/10 space-y-3">
                <p className="text-sm font-bold text-muted-foreground">No active reminders for today.</p>
                <p className="text-xs text-muted-foreground/60">Click "Add Reminder" above to get started.</p>
              </div>
            ) : (
              <div className="relative pl-4 space-y-4">
                <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-muted/40" />
                
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="relative group">
                    <div className={cn(
                      "absolute left-[-23px] top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10",
                      reminder.status === "completed" ? "bg-health-normal" : "bg-muted"
                    )} />
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <ReminderCard 
                          reminder={reminder} 
                          onComplete={() => handleComplete(reminder)}
                          onSnooze={() => handleSnooze(reminder)} 
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-health-critical h-9 w-9 shrink-0 transition-opacity"
                        onClick={() => handleDelete(reminder)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Side Panel ────────────────── */}
        <div className="space-y-6">
          <HealthCard padding="md" className="space-y-4">
            <h4 className="font-bold font-outfit text-sm">Smart Notifications</h4>
            <div className="space-y-3">
              {[
                { label: "Quiet Mode", desc: "No alerts between 10PM - 7AM", icon: Moon },
                { label: "Critical Alerts", desc: "Breakthrough for medications", icon: Bell },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/50 group cursor-pointer hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className="text-muted-foreground group-hover:text-primary" />
                    <div>
                      <p className="text-[11px] font-bold">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                </div>
              ))}
            </div>
          </HealthCard>

          <HealthCard variant="muted" className="bg-health-violet/[0.03] border-health-violet/10">
             <div className="flex items-start gap-3">
               <Bell className="text-health-violet mt-1" size={18} />
               <div>
                 <h4 className="font-bold text-sm">Sync with Calendar</h4>
                 <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                   Automatically add your medication schedule to Apple Calendar or Google Calendar.
                 </p>
                 <Button variant="link" className="p-0 h-auto text-health-violet text-[11px] font-bold mt-2">Enable Sync</Button>
               </div>
             </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
}

