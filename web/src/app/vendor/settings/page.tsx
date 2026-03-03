"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Globe, DollarSign, Bell, Zap, Shield, Trash2,
  LogOut, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code: "ht", label: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

const CURRENCIES = [
  { code: "HTG", label: "Gourde (HTG)", symbol: "G" },
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
];

export default function VendorSettingsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const logout = useAppStore((s) => s.logout);

  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
    toast.success(t("loggedOut") || "Logged out");
  };

  const handleClearCache = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("grolotto-app-storage");
    }
    toast.success(t("cacheCleared") || "Cache cleared");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t("settings") || "Settings"}</h1>
      </div>

      {/* Language */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">{t("language") || "Language"}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  language === lang.code
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Currency (Display) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">{t("currency") || "Display Currency"}</h3>
          </div>
          <div className="flex gap-2">
            {CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                onClick={() => setCurrency(cur.code as any)}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors text-center ${
                  currency === cur.code
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <p className="text-lg font-bold">{cur.symbol}</p>
                <p className="text-xs text-gray-500">{cur.label}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Display currency can be changed anytime. Your operating currency is locked at registration.
          </p>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">{t("preferences") || "Preferences"}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{t("pushNotifications") || "Push Notifications"}</p>
                  <p className="text-xs text-gray-400">{t("pushDesc") || "Receive alerts for new bets and results"}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-10 h-6 rounded-full transition-colors ${notifications ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${notifications ? "translate-x-4" : ""}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{t("autoAcceptBets") || "Auto-Accept Bets"}</p>
                  <p className="text-xs text-gray-400">{t("autoAcceptDesc") || "Automatically accept incoming bets"}</p>
                </div>
              </div>
              <button
                onClick={() => setAutoAccept(!autoAccept)}
                className={`w-10 h-6 rounded-full transition-colors ${autoAccept ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${autoAccept ? "translate-x-4" : ""}`} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardContent className="p-4 space-y-1">
          {[
            { label: t("vendorProfile") || "Vendor Profile", href: "/profile" },
            { label: t("payoutSettings") || "Payout Settings", href: "/payouts" },
          ].map((link) => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-100">
        <CardContent className="p-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start text-amber-600 border-amber-200 hover:bg-amber-50"
            onClick={handleClearCache}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("clearCache") || "Clear Cache"}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("logout") || "Log Out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
