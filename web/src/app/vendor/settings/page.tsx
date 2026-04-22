"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Globe, DollarSign, Bell, Zap, Shield, Trash2,
  LogOut, ChevronRight, Trophy, Save, Loader2
} from "lucide-react";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code: "ht", label: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export default function VendorSettingsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const logout = useAppStore((s) => s.logout);

  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  // Payout multiplier state
  const [payoutRates, setPayoutRates] = useState<Record<string, number>>({
    senp_1st: 60, senp_2nd: 20, senp_3rd: 10, maryaj: 800, loto3: 700, loto4: 4000, loto5: 30000,
  });
  const [loadingRates, setLoadingRates] = useState(true);
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    vendorAPI.getPayoutMultipliers()
      .then((r) => setPayoutRates(r))
      .catch(() => { })
      .finally(() => setLoadingRates(false));
  }, []);

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      const saved = await vendorAPI.updatePayoutMultipliers(payoutRates);
      setPayoutRates(saved);
      toast.success(t("payoutRatesSaved") || "Payout rates saved!");
    } catch {
      toast.error(t("failedToSave") || "Failed to save payout rates");
    } finally {
      setSavingRates(false);
    }
  };

  const updateRate = (key: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setPayoutRates((prev) => ({ ...prev, [key]: num }));
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
    toast.success(t("loggedOut") || "Logged out");
  };

  const handleClearCache = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("grolotto-app-storage");
    }
    toast.success(t("Cache cleared") || "Cache cleared");
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
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${language === lang.code
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

      {/* Preferences */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">{t("Preferences") || "Preferences"}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{t("Push Notifications") || "Push Notifications"}</p>
                  <p className="text-xs text-gray-400">{t("Receive alerts for new bets and results") || "Receive alerts for new bets and results"}</p>
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
                  <p className="text-sm font-medium">{t("Auto-Accept Bets") || "Auto-Accept Bets"}</p>
                  <p className="text-xs text-gray-400">{t("Automatically accept incoming bets") || "Automatically accept incoming bets"}</p>
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

      {/* Payout Rates */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold">{t("Payout Rates") || "Payout Rates"}</h3>
            </div>
            <Button
              size="sm"
              onClick={handleSaveRates}
              disabled={savingRates || loadingRates}
              className="gap-1"
            >
              {savingRates ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {t("save") || "Save"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {t("Payout Rates ") || "Set how much a player wins per $1 bet for each game type."}
          </p>

          {loadingRates ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Senp tiers */}
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800 mb-2">Senp</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "senp_1st", label: "1st" },
                    { key: "senp_2nd", label: "2nd" },
                    { key: "senp_3rd", label: "3rd" },
                  ].map((tier) => (
                    <div key={tier.key}>
                      <label className="text-xs text-gray-600 mb-0.5 block">{tier.label} Prize</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$1 =</span>
                        <Input
                          type="number"
                          min={1}
                          value={payoutRates[tier.key] ?? ""}
                          onChange={(e) => updateRate(tier.key, e.target.value)}
                          className="pl-10 text-sm h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other games */}
              {[
                { key: "maryaj", label: "Maryaj" },
                { key: "loto3", label: "Lotto 3" },
                { key: "loto4", label: "Lotto 4" },
                { key: "loto5", label: "Lotto 5" },
              ].map((game) => (
                <div key={game.key} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{game.label}</span>
                  <div className="relative w-36">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$1 =</span>
                    <Input
                      type="number"
                      min={1}
                      value={payoutRates[game.key] ?? ""}
                      onChange={(e) => updateRate(game.key, e.target.value)}
                      className="pl-10 text-sm h-9"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links */}
      {/* <Card>
        <CardContent className="p-4 space-y-1">
          {[
            { label: t("Vendor Profile") || "Vendor Profile", href: "/profile" },
            { label: t("Payout Settings") || "Payout Settings", href: "/payouts" },
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
      </Card> */}

      {/* Danger zone */}
      <Card className="border-red-100">
        <CardContent className="p-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start text-amber-600 border-amber-200 hover:bg-amber-50"
            onClick={handleClearCache}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("Clear Cache") || "Clear Cache"}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("Log Out") || "Log Out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
