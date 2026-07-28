// ============================================
// Maate Design System — EmptyState
// Consistent pattern for missing data
// ============================================

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-card/30 border-2 border-dashed border-border rounded-3xl">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold font-outfit tracking-tight">{title}</h3>
      <p className="text-muted-foreground max-w-[280px] mt-2 text-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="mt-8 rounded-xl px-8 h-11">
          {action.label}
        </Button>
      )}
    </div>
  );
}
