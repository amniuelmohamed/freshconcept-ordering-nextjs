"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Loader2, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Heart,
  UserCircle,
  Settings,
  Boxes,
  ShieldCheck,
  UserCog,
  FolderTree,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { GlobalSearch } from "@/components/shared/global-search";

type NavItem = {
  label: string;
  href: string;
};

type DashboardShellProps = {
  navItems: NavItem[];
  user: {
    email?: string | null;
    name?: string | null;
  };
  locale: string;
  signOutLabel: string;
  appName: string;
  availableLocales: string[];
  children: ReactNode;
};

// Map navigation labels to icons
const getIconForLabel = (label: string, href: string) => {
  const lowerLabel = label.toLowerCase();
  const lowerHref = href.toLowerCase();
  
  if (lowerLabel.includes('dashboard') || lowerHref.includes('dashboard')) 
    return LayoutDashboard;
  if (lowerLabel.includes('order') || lowerHref.includes('order')) 
    return ShoppingCart;
  if (lowerLabel.includes('product') || lowerHref.includes('product')) 
    return Package;
  if (lowerLabel.includes('client') || lowerHref.includes('client')) 
    return Users;
  if (lowerLabel.includes('favorite') || lowerHref.includes('favorite')) 
    return Heart;
  if (lowerLabel.includes('profile') || lowerHref.includes('profile')) 
    return UserCircle;
  if (lowerLabel.includes('setting') || lowerHref.includes('setting')) 
    return Settings;
  if (lowerLabel.includes('categor') || lowerHref.includes('categor')) 
    return FolderTree;
  if (lowerLabel.includes('role') && lowerHref.includes('client')) 
    return ShieldCheck;
  if (lowerLabel.includes('role') && lowerHref.includes('employee')) 
    return UserCog;
  if (lowerLabel.includes('employee') || lowerHref.includes('employee')) 
    return Users;
  if (lowerLabel.includes('quick') || lowerHref.includes('quick')) 
    return Boxes;
  
  return Package; // Default icon
};

export function DashboardShell({
  navItems,
  user,
  locale,
  signOutLabel,
  appName,
  availableLocales,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const initials =
    user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";
  const signOut = signOutAction.bind(null, locale);
  const brandHref = navItems[0]?.href ?? "/";

  // Only render DropdownMenu after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavClick = (href: string) => {
    // Only track if it's a different route
    if (href !== pathname) {
      setPendingHref(href);
    }
  };

  // Clear pending state when pathname changes (navigation completed)
  // Use the same logic as isActive to determine when navigation is complete
  useEffect(() => {
    if (pendingHref) {
      const isNavigationComplete =
        pathname === pendingHref || pathname.startsWith(pendingHref + "/");
      
      if (isNavigationComplete) {
        // Add a small delay to ensure the page has fully rendered and the active state is applied
        const timeoutId = setTimeout(() => {
          setPendingHref(null);
        }, 150);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [pathname, pendingHref]);

  return (
    <div className="flex min-h-dvh flex-col bg-background print-container">
      <header className="border-b bg-gradient-to-r from-primary to-primary/90 shadow-md print-hide">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href={brandHref}
            className="flex items-center gap-2 text-xl font-bold text-white transition hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <span className="hidden sm:inline">{appName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <GlobalSearch 
                locale={locale} 
                userType={pathname.includes('/employee') ? 'employee' : 'client'} 
              />
            </div>
            <LanguageSwitcher currentLocale={locale} availableLocales={availableLocales} />
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 p-2 text-white hover:bg-white/10 hover:text-white">
                    <Avatar className="size-8 ring-2 ring-white/30">
                      <AvatarImage alt={user?.name ?? user?.email ?? "User"} />
                      <AvatarFallback className="bg-white/20 text-white font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium md:inline">
                      {user?.name ?? user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {user?.name ?? user?.email ?? "User"}
                      </span>
                      {user?.email ? (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      ) : null}
                    </div>
                  </DropdownMenuLabel>
                  <Separator className="my-1" />
                  <DropdownMenuItem asChild>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between text-left text-sm"
                      >
                        {signOutLabel}
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="gap-2 p-2 text-white hover:bg-white/10 hover:text-white">
                <Avatar className="size-8 ring-2 ring-white/30">
                  <AvatarImage alt={user?.name ?? user?.email ?? "User"} />
                  <AvatarFallback className="bg-white/20 text-white font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">
                  {user?.name ?? user?.email}
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-0 md:flex-row">
        <aside className="w-full bg-gradient-to-br from-primary via-primary/95 to-primary/90 shadow-xl md:w-72 print-hide">
          <nav className="flex flex-row gap-2 overflow-x-auto p-4 md:flex-col md:gap-2 md:p-6">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const isLoading = pendingHref === item.href;
              const Icon = getIconForLabel(item.label, item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "group inline-flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white text-primary shadow-lg scale-[1.02]"
                      : "text-white/90 hover:bg-white/15 hover:text-white hover:scale-[1.01]",
                    isLoading && "opacity-70",
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="size-5 animate-spin shrink-0" />
                  ) : (
                    <Icon className={cn(
                      "size-5 shrink-0 transition-transform duration-200",
                      isActive ? "text-primary" : "text-white/80 group-hover:text-white"
                    )} />
                  )}
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 bg-gradient-to-br from-muted/20 via-background to-muted/10 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

