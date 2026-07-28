// ============================================
// Maate Design System — BottomDrawer
// Mobile-first app-like interaction pattern
// ============================================

"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomDrawerProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function BottomDrawer({
  children,
  trigger,
  title,
  description,
  className,
}: BottomDrawerProps) {
  return (
    <Drawer.Root shouldScaleBackground>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content className={cn(
          "bg-background flex flex-col rounded-t-[32px] h-[96%] mt-24 fixed bottom-0 left-0 right-0 z-50",
          className
        )}>
          <div className="p-4 bg-background rounded-t-[32px] flex-1">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-8" />
            <div className="max-w-md mx-auto">
              {(title || description) && (
                <div className="mb-6">
                  {title && <Drawer.Title className="text-2xl font-bold tracking-tight">{title}</Drawer.Title>}
                  {description && <Drawer.Description className="text-muted-foreground mt-1">{description}</Drawer.Description>}
                </div>
              )}
              {children}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
