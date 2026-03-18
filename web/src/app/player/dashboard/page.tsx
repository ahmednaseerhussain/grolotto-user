"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { walletAPI } from "@/lib/api/wallet";
import { publicAPI } from "@/lib/api/public";
import { lotteryAPI } from "@/lib/api/lottery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  Wallet, Search, Trophy, Clock, Star, ChevronRight, Eye, EyeOff,
  Plus, Sparkles, User, SlidersHorizontal
} from "lucide-react";
import { formatCurrency, GAME_LABELS, DRAW_STATES } from "@/lib/utils";

const GAME_TYPE_COLORS: Record<string, string> = {
  senp: "bg-red-500",
  maryaj: "bg-emerald-500",
  loto3: "bg-blue-500",
  loto4: "bg-purple-500",
  loto5: "bg-amber-500",
};

const DRAW_TIME_LABELS: Record<string, string> = {
  morning: "Morning Draw",
  midday: "Midday Draw",
  evening: "Evening Draw",
};

const DRAW_TIME_COLORS: Record<string, string> = {
  morning: "text-green-600 bg-green-50",
  midday: "text-blue-600 bg-blue-50",
  evening: "text-purple-600 bg-purple-50",
};

const DEFAULT_ADS = [
  {
    id: "default-1",
    title: "Welcome to GroLotto!",
    subtitle: "Your lucky numbers await",
    content: "Play the biggest lottery games in Haiti. Pick your numbers and win big today!",
    backgroundColor: "#166534",
    textColor: "#ffffff",
    linkText: "Play Now",
    linkUrl: "/player/play",
  },
  {
    id: "default-2",
    title: "Tchala Dream Numbers",
    subtitle: "Turn dreams into winnings",
    content: "Use Tchala to discover your lucky numbers from dreams. A Haitian tradition!",
    backgroundColor: "#4c1d95",
    textColor: "#ffffff",
    linkText: "Try Tchala",
    linkUrl: "/player/tchala",
  },
  {
    id: "default-3",
    title: "Refer & Earn",
    subtitle: "Invite friends, get rewards",
    content: "Share GroLotto with friends and earn bonus credits when they place their first bet!",
    backgroundColor: "#991b1b",
    textColor: "#ffffff",
    linkText: "Learn More",
  },
];

export default function PlayerDashboard() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const wallet = useAppStore((s) => s.wallet);
  const vendors = useAppStore((s) => s.vendors);
  const advertisements = useAppStore((s) => s.advertisements);
  const setWallet = useAppStore((s) => s.setWallet);
  const setVendors = useAppStore((s) => s.setVendors);
  const setAdvertisements = useAppStore((s) => s.setAdvertisements);

  // Use API ads if available, otherwise show default promo ads
  const displayAds = advertisements.length > 0 ? advertisements : DEFAULT_ADS;

  const [searchQuery, setSearchQuery] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todayResults, setTodayResults] = useState<any[]>([]);
  const slideInterval = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vendorRes, walletRes, adsRes] = await Promise.allSettled([
        vendorAPI.getVendors(),
        walletAPI.getBalance(),
        publicAPI.getActiveAds(),
      ]);
      if (vendorRes.status === "fulfilled") setVendors(vendorRes.value as any || []);
      if (walletRes.status === "fulfilled") setWallet(walletRes.value as any || null);
      if (adsRes.status === "fulfilled") setAdvertisements(adsRes.value as any || []);
      try {
        const rounds = await lotteryAPI.getRounds();
        const today = new Date().toISOString().split('T')[0];
        const completed = (Array.isArray(rounds) ? rounds : []).filter(
          (r: any) => r.status === 'completed' && r.drawDate && r.drawDate.startsWith(today)
        );
        setTodayResults(completed);
      } catch { /* results optional */ }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [setVendors, setWallet, setAdvertisements]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-slide ads
  useEffect(() => {
    if (displayAds.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % displayAds.length);
      }, 5000);
      return () => { if (slideInterval.current) clearInterval(slideInterval.current); };
    }
  }, [displayAds.length]);

  const balance = currency === "HTG"
    ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
    : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

  const filteredVendors = (vendors || []).filter((v: any) => {
    const matchesCurrency = !v.operatingCurrency || v.operatingCurrency === currency;
    if (!matchesCurrency) return false;
    return !searchQuery ||
      v.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getEnabledGames = (vendor: any) => {
    if (!vendor.draws) return [];
    const games = new Set<string>();
    Object.values(vendor.draws).forEach((draw: any) => {
      if (draw?.enabled) {
        Object.entries(draw.games || {}).forEach(([key, game]: [string, any]) => {
          if (game?.enabled) games.add(key);
        });
      }
    });
    return Array.from(games);
  };

  const getVendorStates = (vendor: any): string[] => {
    if (!vendor.draws) return [];
    return Object.entries(vendor.draws)
      .filter(([, d]: [string, any]) => d?.enabled)
      .map(([code]) => code);
  };

  const getVendorDrawTimes = (vendor: any): string[] => {
    if (!vendor.draws) return [];
    const times = new Set<string>();
    Object.values(vendor.draws).forEach((draw: any) => {
      if (draw?.enabled && draw?.drawTimes) {
        (Array.isArray(draw.drawTimes) ? draw.drawTimes : []).forEach((t: string) => times.add(t));
      }
    });
    return Array.from(times);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-20 lg:pb-4">
      {/* ── Section 1: Welcome Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("welcomePlayer") || "Welcome, Player!"}
          </h1>
          <p className="text-sm text-gray-500">
            {t("playAndWin") || "Play & Win Big Today!"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/player/profile")}>
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Section 2: Ad Banner Slider ── */}
      {displayAds.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl h-44 shadow-md">
          {displayAds.map((ad: any, i: number) => (
            <div
              key={ad.id || i}
              className={`absolute inset-0 transition-all duration-700 flex items-center p-6 ${i === currentSlide ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
                }`}
              style={{
                background: ad.backgroundColor
                  ? `linear-gradient(135deg, ${ad.backgroundColor}, ${ad.backgroundColor}dd)`
                  : "linear-gradient(135deg, #166534, #15803d)",
                cursor: ad.linkUrl ? "pointer" : "default",
              }}
              onClick={() => {
                if (ad.linkUrl) {
                  if (ad.linkUrl.startsWith("/")) {
                    router.push(ad.linkUrl);
                  } else {
                    try {
                      const url = new URL(ad.linkUrl);
                      if (url.protocol === 'http:' || url.protocol === 'https:') {
                        window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
                      }
                    } catch { /* invalid URL */ }
                  }
                }
              }}
            >
              <div className="flex-1 z-10">
                <h3
                  className="text-2xl font-extrabold mb-1 drop-shadow-sm"
                  style={{ color: ad.textColor || "#ffffff" }}
                >
                  {ad.title}
                </h3>
                {ad.subtitle && (
                  <p
                    className="text-base font-medium mb-1 opacity-90"
                    style={{ color: ad.textColor || "#ffffff" }}
                  >
                    {ad.subtitle}
                  </p>
                )}
                {ad.content && (
                  <p
                    className="text-sm opacity-80 line-clamp-2"
                    style={{ color: ad.textColor || "#ffffff" }}
                  >
                    {ad.content}
                  </p>
                )}
                {ad.linkText && (
                  <span
                    className="inline-block mt-2 px-4 py-1.5 bg-amber-400 text-gray-900 rounded-full text-sm font-bold shadow"
                  >
                    {ad.linkText}
                  </span>
                )}
              </div>
              {/* Decorative circles */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                <div className="w-24 h-24 rounded-full border-4 border-white/60" />
                <div className="w-16 h-16 rounded-full border-4 border-white/40 -mt-4 ml-8" />
              </div>
            </div>
          ))}
          {displayAds.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {displayAds.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all ${i === currentSlide ? "bg-white w-6" : "bg-white/40 w-2"
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Wallet Banner (compact green) ── */}
      <div
        className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl px-5 py-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
        onClick={() => router.push("/player/payment")}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-200 font-medium">{t("availableBalance") || "Available Balance"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {showBalance ? formatCurrency(balance, currency) : "••••••"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
                className="text-green-200 hover:text-white p-0.5"
              >
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); router.push("/player/payment"); }}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> {t("addFunds") || "Add Funds"}
          </button>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); router.push("/player/transactions"); }}
          className="flex items-center gap-1 text-green-200 hover:text-white text-xs font-medium mt-2 transition-colors"
        >
          <Clock className="h-3 w-3" /> {t("viewTransactionHistory") || "View Transaction History"} <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* ── Section 4: Quick Actions 2x2 Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Wallet, label: t("wallet") || "Wallet", subtitle: t("addFunds") || "Add Funds", gradient: "from-blue-500 to-blue-600", href: "/player/payment" },
          { icon: Sparkles, label: t("tchala") || "Tchala", subtitle: t("dreamNumbers") || "Dream Numbers", gradient: "from-amber-500 to-orange-500", href: "/player/tchala" },
          { icon: Trophy, label: t("results") || "Results", subtitle: "& " + (t("offers") || "Offers"), gradient: "from-emerald-500 to-green-600", href: "/player/results" },
          { icon: Clock, label: t("history") || "History", subtitle: t("pastPlays") || "Past Plays", gradient: "from-violet-500 to-purple-600", href: "/player/history" },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${action.gradient} text-white hover:opacity-90 transition-all shadow-sm`}
          >
            <action.icon className="h-8 w-8 flex-shrink-0" />
            <div className="text-left">
              <span className="text-base font-bold block">{action.label}</span>
              <span className="text-xs opacity-80">{action.subtitle}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Section 5: Latest Results ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🏆 {t("latestResults") || "Latest Results"}
          </h2>
          <button
            onClick={() => router.push("/player/results")}
            className="text-sm text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5"
          >
            {t("viewAllResults") || "View All"} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {todayResults.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {todayResults.map((round: any) => (
              <Card
                key={round.id}
                className="min-w-[180px] max-w-[200px] hover:shadow-md transition-shadow cursor-pointer flex-shrink-0 border border-gray-200"
                onClick={() => router.push("/player/results")}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{round.drawState} {t("results") || "Result"}</span>
                  </div>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${DRAW_TIME_COLORS[round.drawTime] || "text-gray-600 bg-gray-50"}`}>
                    {DRAW_TIME_LABELS[round.drawTime] || round.drawTime}
                  </span>
                  {round.winningNumbers && Object.entries(round.winningNumbers).slice(0, 1).map(([, nums]: [string, any]) => (
                    <div key="nums" className="flex gap-1.5 my-1">
                      {(Array.isArray(nums) ? nums : []).map((n: number, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-white text-sm font-extrabold shadow-sm"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  ))}
                  <button className="text-xs text-blue-600 font-semibold mt-2 hover:underline">
                    {t("viewDetails") || "View Details"}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t("noResultsYetToday") || "No results published yet today"}</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push("/player/results")}>
                {t("viewAllResults") || "View All Results"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Section 6: Search Vendors ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t("searchVendors") || "Search Vendors..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-12 rounded-xl border-gray-300 h-11"
        />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
          <SlidersHorizontal className="h-4 w-4 text-amber-600" />
        </button>
      </div>

      {/* ── Section 7: Quick Play Vendors ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🏆 {t("quickPlayVendors") || "Quick Play Vendors"}
          </h2>
          <button
            onClick={() => router.push("/player/play")}
            className="text-sm text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5"
          >
            {t("seeAll") || "See All"} <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-40" />
            ))}
          </div>
        ) : filteredVendors.length === 0 ? (
          <EmptyState
            icon={<Search className="h-12 w-12 text-gray-300" />}
            title={t("noVendorsFound") || "No vendors found"}
            description="Try a different search term"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredVendors.map((vendor: any) => {
              const states = getVendorStates(vendor);
              const drawTimes = getVendorDrawTimes(vendor);
              return (
                <Card
                  key={vendor.id}
                  className="hover:shadow-lg transition-all cursor-pointer rounded-2xl border border-gray-200 overflow-hidden"
                  onClick={() => router.push(`/player/play?vendorId=${vendor.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Vendor avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                        {(vendor.businessName || vendor.firstName || "V").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-medium text-gray-600">
                            {vendor.rating?.toFixed(1) || "5.0"}
                          </span>
                          {states.length > 0 && (
                            <div className="flex items-center gap-1 ml-1">
                              {states.slice(0, 3).map((s) => (
                                <span key={s} className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {drawTimes.length > 0 && (
                      <p className="text-xs text-gray-500 mb-3">
                        {drawTimes.map(dt => DRAW_TIME_LABELS[dt] || dt).join(" · ")}
                      </p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/player/play?vendorId=${vendor.id}`); }}
                      className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-2.5 rounded-xl text-sm hover:from-green-700 hover:to-green-600 transition-all shadow-sm"
                    >
                      {t("playNow") || "PLAY NOW"}
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}