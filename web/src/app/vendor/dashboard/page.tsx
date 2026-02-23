"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { authAPI } from "@/lib/api/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/components/common/stat-card";
import {
  Users, Ticket, TrendingUp, DollarSign, Gamepad2, Wallet, Settings, Clock,
  ArrowUpRight, BarChart3, Shield, History, LogOut, Banknote, ChevronRight,
  Calendar, Layers,Loader2
} from "lucide-react";
import { formatCurrency, GAME_LABELS } from "@/lib/utils";
import type { VendorStats } from "@/types";
import toast from "react-hot-toast";

export default function VendorDashboard() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const vendorProfile = useAppStore((s) => s.vendorProfile);
  const vendorStats = useAppStore((s) => s.vendorStats);
  const setVendorProfile = useAppStore((s) => s.setVendorProfile);
  const setVendorStats = useAppStore((s) => s.setVendorStats);
  const logout = useAppStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileRes, statsRes] = await Promise.allSettled([
        vendorAPI.getMyProfile(),
        vendorAPI.getMyStats(),
      ]);
      if (profileRes.status === "fulfilled") setVendorProfile(profileRes.value || null);
      if (statsRes.status === "fulfilled") setVendorStats(statsRes.value || null);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }, [setVendorProfile, setVendorStats]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleLogout = async () => {
    if (!confirm(t("areYouSureLogout") || "Are you sure you want to logout?")) return;
    try { await authAPI.logout(); } catch {} finally {
      logout();
      router.replace("/login");
    }
  };

  const stats = vendorStats || {} as Partial<VendorStats>;
  const balance = currency === "HTG"
    ? (((stats as any).balance || stats.availableBalance || 0) * 150)
    : ((stats as any).balance || stats.availableBalance || 0);

  const quickActions = [
    { label: t("pricesAndStates") || "Prices & States", icon: Settings, href: "/vendor/draws", color: "bg-blue-50 text-blue-600" },
    { label: t("viewRounds") || "View Rounds", icon: Layers, href: "/vendor/results", color: "bg-purple-50 text-purple-600" },
    { label: t("numberLimits") || "Number Limits", icon: Shield, href: "/vendor/number-limits", color: "bg-amber-50 text-amber-600" },
    { label: t("history") || "History", icon: History, href: "/vendor/history", color: "bg-emerald-50 text-emerald-600" },
    { label: t("withdrawal") || "Withdrawal", icon: Banknote, href: "/vendor/payouts", color: "bg-red-50 text-red-600" },
    { label: t("myProfile") || "My Profile", icon: Users, href: "/vendor/profile", color: "bg-indigo-50 text-indigo-600" },
    { label: t("todaysPlayers") || "Today's Players", icon: Calendar, href: "/vendor/today", color: "bg-pink-50 text-pink-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("hello") || "Hello"}, {user?.firstName || user?.name?.split(" ")[0]}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={vendorProfile?.status === "approved" ? "success" : "warning"}>
              {t(vendorProfile?.status || "pending") || vendorProfile?.status}
            </Badge>
            <span className="text-sm text-gray-500">{t("dashboard") || "Dashboard"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrency(currency === "HTG" ? "USD" : "HTG")}
          >
            {currency}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => router.push("/vendor/profile")}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-full">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">{vendorProfile?.businessName || user?.firstName || user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.phone && <p className="text-xs text-gray-400">{user?.phone}</p>}
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          title={t("activePlayers") || "Active Players"}
          value={stats.activePlayers || stats.activePlayersCount || 0}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          onClick={() => setActiveModal("players")}
        />
        <StatCard
          title={t("ticketsToday") || "Tickets Today"}
          value={stats.ticketsToday || 0}
          icon={<Ticket className="h-5 w-5 text-emerald-600" />}
          onClick={() => setActiveModal("tickets")}
        />
        <StatCard
          title={t("thisWeek") || "This Week"}
          value={formatCurrency(Number(stats.weeklyEarnings || 0), currency)}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          onClick={() => setActiveModal("weekly")}
        />
        <StatCard
          title={t("totalEarnings") || "Total Earnings"}
          value={formatCurrency(Number(stats.totalEarnings || 0), currency)}
          icon={<DollarSign className="h-5 w-5 text-amber-600" />}
          onClick={() => setActiveModal("earnings")}
        />
        <StatCard
          title={t("ticketsToday") || "Today Bets"}
          value={formatCurrency(Number(stats.todayBets || stats.todayEarnings || 0), currency)}
          icon={<BarChart3 className="h-5 w-5 text-red-600" />}
          onClick={() => setActiveModal("todayEarnings")}
        />
        <StatCard
          title={t("enabledGames") || "Enabled Games"}
          value={stats.enabledGames || 0}
          icon={<Gamepad2 className="h-5 w-5 text-indigo-600" />}
          onClick={() => setActiveModal("games")}
        />
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">{t("availableBalance") || "Available Balance"}</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(balance, currency)}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => router.push("/vendor/payouts")}
            >
              <Wallet className="h-4 w-4 mr-1" /> {t("withdrawal") || "Withdraw"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Config Banner */}
      <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-sm" onClick={() => router.push("/vendor/draws")}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-800">{t("priceConfiguration") || "Price Configuration"}</p>
            <p className="text-sm text-blue-600">{t("setYourBetLimits") || "Set your bet limits and game states"}</p>
          </div>
          <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
            {t("configure") || "Configure"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("quickActions") || "Quick Actions"}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className={`p-3 rounded-full ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!activeModal} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeModal === "players" && (t("activePlayers") || "Active Players")}
              {activeModal === "tickets" && (t("ticketsToday") || "Tickets Today")}
              {activeModal === "weekly" && (t("thisWeek") || "This Week")}
              {activeModal === "earnings" && (t("totalEarnings") || "Total Earnings")}
              {activeModal === "todayEarnings" && "Today's Earnings"}
              {activeModal === "games" && (t("enabledGames") || "Enabled Games")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-gray-500">
            <p>Detailed analytics coming soon.</p>
            <p className="text-sm mt-2">View full reports in History & Reports.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
