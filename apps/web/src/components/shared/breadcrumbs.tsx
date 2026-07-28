// ============================================
// Maate Design System — Breadcrumbs
// Dynamic path tracking for clinical navigation
// ============================================

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null; // Don't show on home

  return (
    <nav className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground mb-4">
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={href}>
            {index > 0 && <ChevronRight size={14} className="text-muted-foreground/40" />}
            {isLast ? (
              <span className="text-foreground font-bold">{label}</span>
            ) : (
              <Link href={href} className="hover:text-primary transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
