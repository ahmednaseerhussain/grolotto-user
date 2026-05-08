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
  Plus, Sparkles, User, SlidersHorizontal, ArrowDownCircle, CreditCard,
  Gift
} from "lucide-react";
import { formatCurrency, GAME_LABELS, DRAW_STATES, formatLotteryNumber } from "@/lib/utils";

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

  const displayAds = advertisements;

  const [searchQuery, setSearchQuery] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todayResults, setTodayResults] = useState<any[]>([]);
  const slideInterval = useRef<NodeJS.Timeout | null>(null);
  const adScrollRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Show vendors from cache immediately so the section never blocks
      const state = useAppStore.getState();
      const vendorsFresh =
        state.vendorsFetchedAt && Date.now() - state.vendorsFetchedAt < 5 * 60_000;
      const hasVendorCache = state.vendors.length > 0;
      // Only show loading skeleton if we have no vendors at all
      setLoading(!hasVendorCache);

      // Wallet + ads always fetched (cheap)
      const [walletRes, adsRes] = await Promise.allSettled([
        walletAPI.getBalance(),
        publicAPI.getActiveAds(),
      ]);
      if (walletRes.status === "fulfilled") setWallet(walletRes.value as any || null);
      if (adsRes.status === "fulfilled") setAdvertisements(adsRes.value as any || []);

      // Vendor fetch decoupled: don't block other UI; refresh only if stale
      if (!vendorsFresh) {
        vendorAPI
          .getVendors()
          .then((list) => setVendors((list as any) || []))
          .catch(() => { /* ignore */ })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }

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
      setLoading(false);
    }
  }, [setVendors, setWallet, setAdvertisements]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-slide ads
  useEffect(() => {
    if (displayAds.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prev) => {
          const next = (prev + 1) % displayAds.length;
          const container = adScrollRef.current;
          if (container) {
            const child = container.children[next] as HTMLElement;
            child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
          }
          return next;
        });
      }, 5000);
      return () => { if (slideInterval.current) clearInterval(slideInterval.current); };
    }
  }, [displayAds.length]);

  // Sync currentSlide on manual scroll
  const handleAdScroll = useCallback(() => {
    const container = adScrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentSlide(index);
    // Reset auto-slide timer on manual swipe
    if (slideInterval.current) clearInterval(slideInterval.current);
    if (displayAds.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prev) => {
          const next = (prev + 1) % displayAds.length;
          const cont = adScrollRef.current;
          if (cont) {
            const child = cont.children[next] as HTMLElement;
            child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
          }
          return next;
        });
      }, 5000);
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
        <div className="relative rounded-2xl shadow-md">
          <div
            ref={adScrollRef}
            onScroll={handleAdScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
          >
            {displayAds.map((ad: any, i: number) => (
              <div
                key={ad.id || i}
                className="snap-start shrink-0 w-full h-44 flex items-center p-6 relative"
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
          </div>
          {displayAds.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {displayAds.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentSlide(i);
                    const container = adScrollRef.current;
                    if (container) {
                      const child = container.children[i] as HTMLElement;
                      child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
                    }
                  }}
                  className={`h-2 rounded-full transition-all ${i === currentSlide ? "bg-white w-6" : "bg-white/40 w-2"
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Wallet Banner (currency-specific color) ── */}
      <div
        className={`rounded-2xl px-5 py-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow ${currency === "HTG"
          ? "bg-linear-to-r from-red-700 to-red-600"
          : "bg-linear-to-r from-green-700 to-green-600"
          }`}
        onClick={() => router.push("/player/payment")}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-medium ${currency === "HTG" ? "text-red-200" : "text-green-200"}`}>{t("availableBalance") || "Available Balance"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {showBalance ? formatCurrency(balance, currency) : "••••••"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
                className={`${currency === "HTG" ? "text-red-200 hover:text-white" : "text-green-200 hover:text-white"} p-0.5`}
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
          className={`flex items-center gap-1 ${currency === "HTG" ? "text-red-200" : "text-green-200"} hover:text-white text-xs font-medium mt-2 transition-colors`}
        >
          <Clock className="h-3 w-3" /> {t("viewTransactionHistory") || "View Transaction History"} <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* ── Section 4: Quick Actions 2x2 Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: ArrowDownCircle, label: t("withdraw") || "Withdraw", subtitle: t("cashOut") || "Cash Out", gradient: "from-red-500 to-red-600", href: "/player/withdraw" },
          { icon: Sparkles, label: t("tchala") || "Tchala", subtitle: t("dreamNumbers") || "Dream Numbers", gradient: "from-amber-500 to-orange-500", href: "/player/tchala" },
          { icon: Trophy, label: t("results") || "Results", subtitle: "" + (t("offers") || "Offers"), gradient: "from-emerald-500 to-green-600", href: "/player/results" },
          { icon: Clock, label: t("history") || "History", subtitle: t("pastPlays") || "Past Plays", gradient: "from-violet-500 to-purple-600", href: "/player/history" },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl bg-linear-to-br ${action.gradient} text-white hover:opacity-90 transition-all shadow-sm`}
          >
            <action.icon className="h-8 w-8 shrink-0" />
            <div className="text-left">
              <span className="text-base font-bold block">{action.label}</span>
              <span className="text-xs opacity-80">{action.subtitle}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Buy Gift Card from Debit Card ── */}
      {/* <button
        onClick={() => window.open("https://grolotto.com/buy-gift-card", "_blank", "noopener,noreferrer")}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-linear-to-r from-indigo-600 to-blue-500 text-white hover:opacity-90 transition-all shadow-md"
      >
        <div className="bg-white/20 p-3 rounded-xl">
          <CreditCard className="h-6 w-6" />
        </div>
        <div className="text-left flex-1">
          <span className="text-base font-bold block">{t("buyGiftCardFromDebitCard") || "Buy Gift Card from Debit Card"}</span>
          <span className="text-xs opacity-80">{t("payWithDebitCard") || "Pay with your debit card"}</span>
        </div>
        <ChevronRight className="h-5 w-5 opacity-70" />
      </button> */}
      <div className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 w-12 h-12 rounded-full flex items-center justify-center">
            <Gift className="h-6 w-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-gray-900">{t("giftCard") || "Gift Card"}</p>
            <p className="text-sm text-gray-500">
              {t("shareCreditsGiftCard") || "Share Credits Through Gift Card"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => router.push("/player/gift-cards")}
            className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            🎁 {t("shareGiftCard") || "Share Gift Card"}
          </button>
          {/* <button
            onClick={() => router.push("/player/gift-cards?tab=redeem")}
            className="flex-1 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
          >
            🎟️ {t("redeemCode") || "Redeem Code"}
          </button> */}
        </div>
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
                className="min-w-45 max-w-50 hover:shadow-md transition-shadow cursor-pointer shrink-0 border border-gray-200"
                onClick={() => router.push("/player/results")}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{round.drawState} {t("results") || "Result"}</span>
                  </div>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${DRAW_TIME_COLORS[round.drawTime] || "text-gray-600 bg-gray-50"}`}>
                    {DRAW_TIME_LABELS[round.drawTime] || round.drawTime}
                  </span>
                  {round.winningNumbers && Object.entries(round.winningNumbers).slice(0, 1).map(([gameType, nums]: [string, any]) => (
                    <div key="nums" className="flex gap-1.5 my-1">
                      {(Array.isArray(nums) ? nums : []).map((n: number, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-white text-sm font-extrabold shadow-sm"
                        >
                          {formatLotteryNumber(n, gameType)}
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
              <p className="text-sm text-gray-500">{t("noResultsPublishedToday") || "No results published yet today"}</p>
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
            description={t("tryDifferentSearch") || "Try a different search term"}
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
                      <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
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
                      className="w-full bg-linear-to-r from-green-600 to-green-500 text-white font-bold py-2.5 rounded-xl text-sm hover:from-green-700 hover:to-green-600 transition-all shadow-sm"
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