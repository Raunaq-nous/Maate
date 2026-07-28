// ============================================
// Maate Design System — HealthSkeleton
// Fluid loading patterns
// ============================================

import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  );
}

export function HealthCardSkeleton() {
  return (
    <div className="p-5 rounded-3xl border border-border/50 shadow-health-md space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  );
}

export { Skeleton };
