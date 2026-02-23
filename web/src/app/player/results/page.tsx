"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { lotteryAPI } from "@/lib/api/lottery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  ArrowLeft, Trophy, Wallet, Sparkles, Clock, ChevronRight, Star, Loader2, TrendingUp
} from "lucide-react";
import { formatCurrency, GAME_LABELS } from "@/lib/utils";
import { format } from "date-fns";

const STATE_COLORS: Record<string, string> = {
  FL: "bg-orange-500",
  NY: "bg-blue-600",
  GA: "bg-red-500",
  TX: "bg-purple-600",
  PA: "bg-yellow-600",
  CT: "bg-teal-600",
  TN: "bg-pink-500",
  NJ: "bg-green-600",
};

interface DailyResult {
  id: string;
  drawState: string;
  numbers: number[];
  status: string;
  drawTime: string;
  date: string;
  winnerCount?: number;
}

export default function ResultsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const wallet = useAppStore((s) => s.wallet);
  const vendors = useAppStore((s) => s.vendors);

  const [lotteryRounds, setLotteryRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const res = await lotteryAPI.getRounds();
        const data = Array.isArray(res) ? res : [];
        setLotteryRounds(data);
      } catch (err) {
        console.error("Failed to load results", err);
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, []);

  // Auto-cycle results
  useEffect(() => {
    if (lotteryRounds.length > 1) {
      const interval = setInterval(() => {
        setCurrentResultIndex((prev) => (prev + 1) % lotteryRounds.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [lotteryRounds.length]);

  const balance = currency === "HTG"
    ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
    : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

  const messages = [
    "🔴 LIVE - Results update in real-time",
    "🎯 Check your numbers after each draw",
    "💰 Winners are paid automatically",
    "📊 View your complete history anytime",
  ];
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setMsgIndex((p) => (p + 1) % messages.length), 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-700">GROLOTTO</h1>
          <p className="text-gray-600">{t("welcome")}, {t("player")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/player/settings")}>
            <Star className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/player/history")}>
            <Clock className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">{t("availableBalance") || "Available Balance"}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(balance, currency)}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => router.push("/player/payment")}
            >
              {t("addFunds") || "Add Funds"}
            </Button>
          </div>
          <button
            onClick={() => router.push("/player/transactions")}
            className="text-sm opacity-80 hover:opacity-100 mt-2 inline-flex items-center gap-1"
          >
            {t("viewTransactionHistory") || "View Transaction History"} <ChevronRight className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Wallet, label: t("wallet") || "Wallet", href: "/player/payment", color: "text-blue-600 bg-blue-50" },
          { icon: Sparkles, label: t("tchala") || "Tchala", href: "/player/tchala", color: "text-purple-600 bg-purple-50" },
          { icon: Trophy, label: t("results") || "Results", href: "/player/results", color: "text-amber-600 bg-amber-50" },
          { icon: Clock, label: t("history") || "History", href: "/player/history", color: "text-emerald-600 bg-emerald-50" },
        ].map((a) => (
          <button
            key={a.href}
            onClick={() => router.push(a.href)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className={`p-2 rounded-full ${a.color}`}><a.icon className="h-5 w-5" /></div>
            <span className="text-xs font-medium text-gray-700">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Today's Results */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Results</h2>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : lotteryRounds.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-6 text-center text-gray-500">
              No results yet today. Check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {lotteryRounds.map((round: any, idx: number) => {
              const winNums = Array.isArray(round.winningNumbers)
                ? round.winningNumbers
                : Object.values(round.winningNumbers || {});
              const isLive = round.status === "open" || round.status === "live";
              return (
                <div
                  key={round.id || idx}
                  className={`transition-all duration-500 ${
                    idx === currentResultIndex ? "block" : "hidden"
                  }`}
                >
                  <Card className="overflow-hidden">
                    <div className={`h-1 ${STATE_COLORS[round.drawState] || "bg-gray-400"}`} />
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge className={`${STATE_COLORS[round.drawState] || "bg-gray-500"} text-white`}>
                            {round.drawState}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {round.drawDate ? format(new Date(round.drawDate), "PP") : "Today"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLive && (
                            <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              LIVE
                            </span>
                          )}
                          {!isLive && <Badge variant="secondary">FINAL</Badge>}
                        </div>
                      </div>

                      {/* Winning Numbers */}
                      <div className="flex items-center justify-center gap-3 my-4">
                        {winNums.length > 0 ? (
                          winNums.map((n: any, i: number) => (
                            <div
                              key={i}
                              className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg font-bold shadow-lg"
                            >
                              {n}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm">Waiting for results...</p>
                        )}
                      </div>

                      {round.winnerCount > 0 && (
                        <p className="text-center text-sm text-emerald-600 font-medium">
                          🏆 {round.winnerCount} winner{round.winnerCount > 1 ? "s" : ""}!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {/* Slide indicators */}
            {lotteryRounds.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {lotteryRounds.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentResultIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentResultIndex ? "bg-emerald-600 w-6" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sliding Messages */}
      <div className="bg-emerald-50 rounded-xl p-3 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-600">Live Updates</span>
        </div>
        <p className="text-sm text-emerald-800 transition-all duration-300">{messages[msgIndex]}</p>
      </div>

      {/* Vendors */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("availableVendors") || "Available Vendors"}</h2>
        {(vendors || []).length === 0 ? (
          <p className="text-sm text-gray-400">{t("noVendorsAvailable") || "No vendors available"}</p>
        ) : (
          <div className="space-y-2">
            {(vendors || []).slice(0, 5).map((v: any) => (
              <button
                key={v.id}
                onClick={() => router.push(`/player/play?vendorId=${v.id}`)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-all"
              >
                <span className="font-medium text-sm">{v.businessName || v.firstName}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
