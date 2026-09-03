// ============================================
// MAATE WEB — Dashboard Layout
// Responsive Shell: Sidebar (Desktop) & Bottom Nav (Mobile)
// ============================================

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileText, 
  MessageSquare, 
  Calendar, 
  User, 
  Bell, 
  Search,
  Plus,
  Users,
  LogOut,
  Clock
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "@/components/dashboard/profile-switcher";

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Records", href: "/records", icon: FileText },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Reminders", href: "/reminders", icon: Calendar },
  { name: "Family", href: "/family", icon: Users },
  { name: "Profile", href: "/profile", icon: User },
];

import { UserNav } from "@/components/layouts/user-nav";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageTransition } from "@/components/shared/page-transition";
import { NotificationCenter } from "@/components/dashboard/notification-center";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Accessibility: Skip to Content ─── */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[1000] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-xl focus:font-bold focus:shadow-health-lg"
      >
        Skip to main content
      </a>

      {/* ─── Desktop Sidebar ───────────────────── */}
      <aside 
        aria-label="Sidebar Navigation"
        className="hidden lg:flex w-64 flex-col border-r bg-card/30 backdrop-blur-sm sticky top-0 h-screen"
      >
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Maate Home">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-health-sm" aria-hidden="true">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="font-outfit text-2xl font-bold tracking-tight">Maate</span>
          </Link>
        </div>

        <div className="px-4 mb-4">
          <ProfileSwitcher />
        </div>

        <nav className="flex-1 px-4 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group",
                  isActive 
                    ? "bg-primary text-white shadow-health-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon size={22} className={cn(isActive && "animate-in zoom-in-75 duration-300")} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full justify-start gap-3 rounded-xl font-bold text-muted-foreground hover:text-health-critical hover:bg-health-critical/5"
          >
             <LogOut size={20} aria-hidden="true" />
             Log Out
          </Button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header 
          className="h-16 border-b bg-background/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 lg:px-8"
          role="banner"
        >
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} aria-hidden="true" />
              <input 
                type="search"
                placeholder="Search reports, meds, doctors..."
                aria-label="Search site content"
                className="w-full bg-muted/50 border-none rounded-xl h-10 pl-10 pr-4 text-sm focus:ring-2 ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 ml-4">
            <NotificationCenter />
            <UserNav />
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 lg:p-8 outline-none" tabIndex={-1}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* ─── Mobile Nav ───────────────────────── */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-t flex items-center justify-around px-2 pb-safe z-50"
      >
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon size={24} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
