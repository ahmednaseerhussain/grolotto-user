"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import {
  LayoutDashboard,
  History,
  User,
  Gamepad2,
  DollarSign,
  Hash,
  Banknote,
  Users,
  FileText,
  Settings,
} from "lucide-react";

const navSections = [
  {
    title: null,
    items: [
      { href: "/vendor/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
      { href: "/vendor/history", icon: History, labelKey: "history" },
      { href: "/vendor/profile", icon: User, labelKey: "profile" },
    ],
  },
  {
    titleKey: "management",
    items: [
      { href: "/vendor/draws", icon: Gamepad2, labelKey: "drawManagement" },
      { href: "/vendor/draws", icon: DollarSign, labelKey: "pricingLimits" },
      { href: "/vendor/number-limits", icon: Hash, labelKey: "numberLimits" },
      { href: "/vendor/payouts", icon: Banknote, labelKey: "payouts" },
    ],
  },
  {
    titleKey: "reports",
    items: [
      { href: "/vendor/today", icon: Users, labelKey: "todayPlayersWinners" },
      { href: "/vendor/results", icon: FileText, labelKey: "resultPublishing" },
      { href: "/vendor/settings", icon: Settings, labelKey: "settings" },
    ],
  },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">GroLotto</h1>
          <p className="text-xs text-gray-500">{t("vendor")}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-6" : ""}>
            {section.titleKey && (
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t(section.titleKey)}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-emerald-600" : "text-gray-400")} />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

// Bottom nav for mobile
export function VendorBottomNav() {
  const pathname = usePathname();
  const t = useTranslation();

  const bottomItems = [
    { href: "/vendor/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
    { href: "/vendor/history", icon: History, labelKey: "history" },
    { href: "/vendor/profile", icon: User, labelKey: "profile" },
    { href: "/vendor/settings", icon: Settings, labelKey: "settings" },
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
                isActive ? "text-emerald-600" : "text-gray-400"
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
