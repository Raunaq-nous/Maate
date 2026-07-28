// ============================================
// Maate Design System — HealthCard
// Premium container for medical data
// ============================================

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const healthCardVariants = cva(
  "relative overflow-hidden transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground shadow-health-md border border-border/50",
        glass: "bg-background/40 backdrop-blur-md border border-white/20 shadow-glass",
        outline: "border-2 border-border bg-transparent hover:border-primary/30",
        elevated: "bg-card shadow-health-lg",
        muted: "bg-muted/30 border-dashed border-2 border-muted-foreground/20",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-5",
        lg: "p-8",
        xl: "p-12",
      },
      radius: {
        default: "rounded-3xl",
        lg: "rounded-3xl",
        md: "rounded-2xl",
        sm: "rounded-xl",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      radius: "default",
    },
  }
);

export interface HealthCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof healthCardVariants> {
  hoverEffect?: boolean;
}

const HealthCard = React.forwardRef<HTMLDivElement, HealthCardProps>(
  ({ className, variant, padding, radius, hoverEffect = false, ...props }, ref) => {
    const Component = props["aria-label"] ? "section" : "div";
    return (
      <Component
        ref={ref}
        className={cn(
          healthCardVariants({ variant, padding, radius, className }),
          hoverEffect && "hover:shadow-health-lg hover:-translate-y-1"
        )}
        {...props}
      />
    );
  }
);
HealthCard.displayName = "HealthCard";

export { HealthCard, healthCardVariants };
