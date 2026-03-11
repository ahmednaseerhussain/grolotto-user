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
import {
  Users, Ticket, Wallet, Settings, Shield, History, LogOut, Banknote,
  ChevronRight, ChevronDown, Calendar, Loader2, Trophy, Gamepad2,
  DollarSign, TrendingUp, TrendingDown, Award
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { VendorStats } from "@/types";
import toast from "react-hot-toast";

export default function VendorDashboard() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const vendorProfile = useAppStore((s) => s.vendorProfile);
  const vendorStats = useAppStore((s) => s.vendorStats);
  const setVendorProfile = useAppStore((s) => s.setVendorProfile);
  const setVendorStats = useAppStore((s) => s.setVendorStats);
  const logout = useAppStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [estimatePeriod, setEstimatePeriod] = useState("today");

  const loadDashboard = useCallback(async (period?: string) => {
    try {
      const [profileRes, statsRes] = await Promise.allSettled([
        vendorAPI.getMyProfile(),
        vendorAPI.getMyStats(period || estimatePeriod),
      ]);
      if (profileRes.status === "fulfilled") setVendorProfile(profileRes.value || null);
      if (statsRes.status === "fulfilled") setVendorStats(statsRes.value || null);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }, [setVendorProfile, setVendorStats, estimatePeriod]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handlePeriodChange = (newPeriod: string) => {
    setEstimatePeriod(newPeriod);
    loadDashboard(newPeriod);
  };

  const handleLogout = async () => {
    if (!confirm(t("areYouSureLogout") || "Are you sure you want to logout?")) return;
    try { await authAPI.logout(); } catch { } finally {
      logout();
      router.replace("/login");
    }
  };

  const stats = vendorStats || {} as Partial<VendorStats>;
  const vendorCurrency = (vendorProfile?.operatingCurrency || currency) as "HTG" | "USD";
  const balance = stats.availableBalance || (vendorProfile as any)?.availableBalance || 0;

  // Vendor Estimates — use server-calculated values
  const totalSales = Number(stats.totalSales ?? stats.todayBets ?? 0);
  const commissionRate = Number(stats.commissionRate ?? 0.1);
  const commission = Number(stats.totalCommission ?? 0);
  const netIncome = Number(stats.netIncome ?? 0);
  const totalPlayerWin = Number(stats.totalPlayerWins ?? 0);
  const totalProfit = Number(stats.totalProfit ?? 0);
  const totalLoss = Number(stats.totalLoss ?? 0);

  const quickActions = [
    { label: t("results") || "Results", icon: Trophy, href: "/vendor/results", color: "bg-amber-50 text-amber-600" },
    { label: t("pricesAndStates") || "Prices & States", icon: Settings, href: "/vendor/draws", color: "bg-blue-50 text-blue-600" },
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
          <Badge variant="outline" className="text-xs">{vendorCurrency}</Badge>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">{t("availableBalance") || "Available Balance"}</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(balance, vendorCurrency)}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => router.push("/vendor/payouts")}
            >
              <Wallet className="h-4 w-4 mr-1" /> {t("withdrawal") || "Withdrawal"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Estimates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t("vendorEstimates") || "Vendor Estimates"}</h2>
          <div className="relative">
            <select
              value={estimatePeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="today">{t("today") || "Today"}</option>
              <option value="week">{t("thisWeek") || "This Week"}</option>
              <option value="month">{t("thisMonth") || "This Month"}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Total Sales */}
          <Card className="border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-100 p-1.5 rounded-lg">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500">{t("totalSales") || "Total Sales"}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSales, vendorCurrency)}</p>
            </CardContent>
          </Card>

          {/* Commission */}
          <Card className="border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-xs text-gray-500">{t("commission") || "Commission"}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(commission, vendorCurrency)}</p>
            </CardContent>
          </Card>

          {/* Net Income */}
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs text-gray-500">{t("netIncome") || "Net Income"}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(netIncome, vendorCurrency)}</p>
            </CardContent>
          </Card>

          {/* Total Profit */}
          <Card className="border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-100 p-1.5 rounded-lg">
                  <Award className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-xs text-gray-500">{t("totalProfit") || "Total Profit"}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {totalSales > 0 ? formatCurrency(totalProfit, vendorCurrency) : t("pending") || "Pending"}
              </p>
            </CardContent>
          </Card>

          {/* Total Loss */}
          <Card className="border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-red-100 p-1.5 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-xs text-gray-500">{t("totalLoss") || "Total Loss"}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {totalSales > 0 ? formatCurrency(totalLoss, vendorCurrency) : t("pending") || "Pending"}
              </p>
            </CardContent>
          </Card>

          {/* Total Player Win */}
          <Card className="border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-purple-100 p-1.5 rounded-lg">
                  <Trophy className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500">{t("totalPlayerWin") || "Total Player Win"}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {totalSales > 0 ? formatCurrency(totalPlayerWin, vendorCurrency) : t("pending") || "Pending"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalPlayers || stats.activePlayers || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{t("activePlayers") || "Active Players"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Ticket className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.ticketsToday || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{t("ticketsToday") || "Tickets Today"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gamepad2 className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalTicketsSold || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{t("totalTickets") || "Total Tickets"}</p>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
