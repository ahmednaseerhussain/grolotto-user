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
  Gamepad2,
  Gift,
  CreditCard,
  Wallet,
  BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/player/dashboard", icon: Home, labelKey: "home" },
  { href: "/player/play", icon: Gamepad2, labelKey: "play" },
  { href: "/player/history", icon: History, labelKey: "history" },
  { href: "/player/results", icon: BookOpen, labelKey: "results" },
  { href: "/player/tchala", icon: BookOpen, labelKey: "tchala" },
  { href: "/player/rewards", icon: Gift, labelKey: "rewards" },
  { href: "/player/transactions", icon: Wallet, labelKey: "transactions" },
  { href: "/player/payment", icon: CreditCard, labelKey: "deposit" },
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
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">G</span>
        </div>
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
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-gray-400")} />
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

  const bottomItems = [
    { href: "/player/dashboard", icon: Home, labelKey: "home" },
    { href: "/player/history", icon: History, labelKey: "history" },
    { href: "/player/play", icon: Gamepad2, labelKey: "play" },
    { href: "/player/notifications", icon: Bell, labelKey: "notifications" },
    { href: "/player/settings", icon: Settings, labelKey: "settings" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around py-2">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors",
                isActive ? "text-blue-600" : "text-gray-400"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
