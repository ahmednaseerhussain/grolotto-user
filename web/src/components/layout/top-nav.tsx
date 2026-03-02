"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { authAPI } from "@/lib/api/auth";
import { clearTokens } from "@/lib/api-client";
import {
  Globe,
  DollarSign,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Language, Currency } from "@/types";

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "ht", label: "Kreyòl", flag: "🇭🇹" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];

export function TopNav() {
  const router = useRouter();
  const t = useTranslation();
  const language = useAppStore((s) => s.language);
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const logout = useAppStore((s) => s.logout);
  
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangMenu(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0];

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    clearTokens();
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-bold text-gray-900">GroLotto</span>
        </div>

        <div className="hidden lg:block" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <button
            onClick={() => setCurrency(currency === "USD" ? "HTG" : "USD")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            {currency}
          </button>

          {/* Language switcher */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
              <span className="sm:hidden">{currentLang.flag}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value);
                      setShowLangMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50",
                      language === lang.value ? "font-medium text-amber-600" : "text-gray-700"
                    )}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{user?.name || user?.email}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
