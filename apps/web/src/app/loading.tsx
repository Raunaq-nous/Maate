// ============================================
// Global Loading State
// Premium Skeleton & Spinner patterns
// ============================================

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute h-full w-full rounded-full border-4 border-muted"></div>
          <div className="absolute h-full w-full animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
        <p className="animate-pulse text-sm font-medium text-muted-foreground tracking-wide">
          Securing your health session...
        </p>
      </div>
    </div>
  );
}
