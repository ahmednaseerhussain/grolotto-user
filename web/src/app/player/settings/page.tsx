"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { authAPI } from "@/lib/api/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, User, Globe, DollarSign, Bell, Shield, Fingerprint,
  CreditCard, Clock, Trash2, Info, LogOut, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import { type Language } from "@/lib/translations";

const LANGUAGES = [
  { code: "ht" as Language, name: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "en" as Language, name: "English", flag: "🇺🇸" },
  { code: "fr" as Language, name: "Français", flag: "🇫🇷" },
  { code: "es" as Language, name: "Español", flag: "🇪🇸" },
];

const CURRENCIES = [
  { code: "HTG" as const, name: "Haitian Gourde", symbol: "G", flag: "🇭🇹" },
  { code: "USD" as const, name: "US Dollar", symbol: "$", flag: "🇺🇸" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const currency = useAppStore((s) => s.currency);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const logout = useAppStore((s) => s.logout);

  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const handleLogout = async () => {
    if (!confirm(t("areYouSureSignOut") || "Are you sure you want to sign out?")) return;
    try {
      await authAPI.logout();
    } catch {} finally {
      logout();
      router.replace("/login");
    }
  };

  const handleClearCache = () => {
    if (!confirm("Clear all cached data?")) return;
    localStorage.clear();
    toast.success("Cache cleared");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-emerald-700">GROLOTTO</h1>
          <p className="text-sm text-gray-500">{t("settings") || "Settings"}</p>
        </div>
      </div>

      {/* User Info */}
      <Card
        className="cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => router.push("/player/profile")}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-full">
            <User className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500">{user?.role}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold">Language</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  toast.success(t("languageUpdated") || "Language updated");
                }}
                className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  language === lang.code
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold">{t("currency") || "Currency"}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                onClick={() => {
                  setCurrency(cur.code);
                  toast.success(t("currencyUpdated") || "Currency updated");
                }}
                className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  currency === cur.code
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-lg">{cur.flag}</span>
                <div>
                  <span className="text-sm font-medium">{cur.code}</span>
                  <p className="text-xs text-gray-500">{cur.name}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-500" /> Preferences
          </h3>
          {[
            { label: "Push Notifications", icon: Bell, value: notifications, onChange: setNotifications },
            { label: "Auto-play Results", icon: Clock, value: autoPlay, onChange: setAutoPlay },
            { label: "Biometric Auth", icon: Fingerprint, value: biometric, onChange: setBiometric },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <pref.icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{pref.label}</span>
              </div>
              <button
                onClick={() => pref.onChange(!pref.value)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  pref.value ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    pref.value ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Financial */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold mb-2">Financial Settings</h3>
          <button
            onClick={() => router.push("/player/payment-methods")}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Payment Methods</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => router.push("/player/transactions")}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Transaction History</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </CardContent>
      </Card>

      {/* App Management */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold mb-2">App Management</h3>
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Clear Cache</span>
            </div>
          </button>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-400" />
              <span className="text-sm">About GROLOTTO</span>
            </div>
            <span className="text-xs text-gray-400">v1.0.0</span>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" /> {t("signOut") || "Sign Out"}
      </Button>
    </div>
  );
}
