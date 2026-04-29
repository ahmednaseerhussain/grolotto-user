"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import {
  Home,
  History,
  Bell,
  HelpCircle,
  Settings,
  Ticket,
  Gift,
  CreditCard,
  Wallet,
  BookOpen,
  Banknote,
  Dice5,
} from "lucide-react";

const navItems = [
  { href: "/player/dashboard", icon: Home, labelKey: "home" },
  { href: "/player/play", icon: Ticket, labelKey: "ticket" },
  { href: "/player/history", icon: History, labelKey: "history" },
  { href: "/player/results", icon: BookOpen, labelKey: "results" },
  { href: "/player/tchala", icon: BookOpen, labelKey: "tchala" },
  { href: "/player/transactions", icon: Wallet, labelKey: "transactions" },
  { href: "/player/payment", icon: CreditCard, labelKey: "deposit" },
  { href: "/player/withdraw", icon: Banknote, labelKey: "withdrawal" },
  { href: "/player/notifications", icon: Bell, labelKey: "notifications" },
  { href: "/player/settings", icon: Settings, labelKey: "settings" },
];

export function PlayerSidebar() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <img src="/grolotto-logo.png" alt="GroLotto" className="w-10 h-10 rounded-xl object-contain" />
        <div>
          <h1 className="font-bold text-gray-900 text-lg">GroLotto</h1>
          <p className="text-xs text-gray-500">{t("player")}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-50 text-amber-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-amber-600" : "text-gray-400")} />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

// Bottom nav for mobile
export function PlayerBottomNav() {
  const pathname = usePathname();
  const t = useTranslation();

  const leftItems = [
    { href: "/player/dashboard", icon: Home, labelKey: "home" },
    { href: "/player/notifications", icon: Bell, labelKey: "notifications" },
  ];
  const rightItems = [
    { href: "/player/help", icon: HelpCircle, labelKey: "help" },
    { href: "/player/settings", icon: Settings, labelKey: "settings" },
  ];

  const renderItem = (item: { href: string; icon: any; labelKey: string }) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
          isActive ? "text-amber-600" : "text-gray-400"
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-semibold">{t(item.labelKey)}</span>
      </Link>
    );
  };

  const isBetActive = pathname === "/player/play" || pathname?.startsWith("/player/play/");

  return (
    <nav
      className="lg:hidden fixed left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50"
      style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-end justify-between px-4 pb-2 pt-1 max-w-md mx-auto">
        {leftItems.map(renderItem)}
        {/* Center Bet Button */}
        <Link
          href="/player/play"
          className="flex flex-col items-center -mt-5"
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-white",
            isBetActive ? "bg-amber-600" : "bg-green-600"
          )}>
            <Dice5 className="h-6 w-6 text-white" />
          </div>
          <span className={cn(
            "text-[10px] font-bold mt-0.5",
            isBetActive ? "text-amber-600" : "text-green-600"
          )}>{t("bet")}</span>
        </Link>
        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
