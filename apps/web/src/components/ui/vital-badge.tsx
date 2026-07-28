// ============================================
// Maate Design System — VitalBadge
// Semantic status indicators for health data
// ============================================

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const vitalBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        normal: "bg-health-normal/10 text-health-normal",
        warning: "bg-health-warning/10 text-health-warning",
        critical: "bg-health-critical/10 text-health-critical",
        info: "bg-health-sky/10 text-health-sky",
        neutral: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "md",
    },
  }
);

export interface VitalBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof vitalBadgeVariants> {}

function VitalBadge({ className, status, size, ...props }: VitalBadgeProps) {
  return (
    <div className={cn(vitalBadgeVariants({ status, size }), className)} {...props} />
  );
}

export { VitalBadge, vitalBadgeVariants };
