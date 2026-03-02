"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { walletAPI } from "@/lib/api/wallet";
import { publicAPI } from "@/lib/api/public";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  Wallet, Search, Trophy, Clock, Gift, Star, ChevronRight, Eye, EyeOff,
  Plus, DollarSign, Sparkles, TrendingUp, User, ArrowRightLeft
} from "lucide-react";
import { formatCurrency, GAME_LABELS } from "@/lib/utils";
import toast from "react-hot-toast";

const GAME_TYPE_COLORS: Record<string, string> = {
  senp: "bg-red-500",
  maryaj: "bg-emerald-500",
  loto3: "bg-blue-500",
  loto4: "bg-purple-500",
  loto5: "bg-amber-500",
};

export default function PlayerDashboard() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const wallet = useAppStore((s) => s.wallet);
  const vendors = useAppStore((s) => s.vendors);
  const advertisements = useAppStore((s) => s.advertisements);
  const setWallet = useAppStore((s) => s.setWallet);
  const setVendors = useAppStore((s) => s.setVendors);
  const setAdvertisements = useAppStore((s) => s.setAdvertisements);

  const [searchQuery, setSearchQuery] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
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
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [setVendors, setWallet, setAdvertisements]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-slide ads
  useEffect(() => {
    if (advertisements.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % advertisements.length);
      }, 5000);
      return () => { if (slideInterval.current) clearInterval(slideInterval.current); };
    }
  }, [advertisements.length]);

  const balance = currency === "HTG"
    ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
    : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

  const balanceHtg = wallet?.balanceHtg ?? wallet?.balance ?? 0;
  const balanceUsd = wallet?.balanceUsd ?? 0;

  const filteredVendors = (vendors || []).filter((v: any) => {
    const matchesSearch = !searchQuery || 
      v.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.firstName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCurrency = !v.operatingCurrency || v.operatingCurrency === currency;
    return matchesSearch && matchesCurrency;
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

  const getVendorStates = (vendor: any) => {
    if (!vendor.draws) return "";
    return Object.entries(vendor.draws)
      .filter(([, d]: [string, any]) => d?.enabled)
      .map(([code]) => code)
      .join(", ");
  };

  const getVendorPriceRange = (vendor: any) => {
    if (!vendor.draws) return { min: 0, max: 0 };
    let min = Infinity, max = 0;
    Object.values(vendor.draws).forEach((draw: any) => {
      if (draw?.enabled) {
        Object.values(draw.games || {}).forEach((game: any) => {
          if (game?.enabled) {
            if (game.minAmount < min) min = game.minAmount;
            if (game.maxAmount > max) max = game.maxAmount;
          }
        });
      }
    });
    return { min: min === Infinity ? 0 : min, max };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-500">GROLOTTO</h1>
          <p className="text-gray-600">
            {t("welcome")}, {user?.firstName || user?.name?.split(" ")[0] || t("player")}! {t("readyToPlay")}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/player/profile")}>
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* Advertisement Slideshow */}
      {advertisements.length > 0 && (
        <div className="relative overflow-hidden rounded-xl h-40 bg-gradient-to-r from-blue-500 to-blue-600">
          {advertisements.map((ad: any, i: number) => (
            <div
              key={ad.id || i}
              className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center p-6 ${
                i === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onClick={() => ad.linkUrl && window.open(ad.linkUrl, "_blank")}
              style={{ cursor: ad.linkUrl ? "pointer" : "default" }}
            >
              {ad.imageUrl ? (
                <img src={ad.imageUrl} alt={ad.title || "Ad"} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="text-center text-white">
                  <h3 className="text-xl font-bold">{ad.title}</h3>
                  <p className="text-sm opacity-90">{ad.description}</p>
                </div>
              )}
            </div>
          ))}
          {advertisements.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {advertisements.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSlide ? "bg-white w-6" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Balance Card */}
      <Card className="bg-white shadow-md border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500">{t("availableBalance") || "Available Balance"}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-3xl font-bold text-gray-900">
                  {showBalance ? formatCurrency(balance, currency) : "••••••"}
                </p>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1 italic">
                {showBalance ? "Tap eye to hide balance" : "Tap eye to show balance"}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => router.push("/player/payment")}
            >
              <Plus className="h-4 w-4 mr-1" /> {t("addFunds") || "Add Funds"}
            </Button>
          </div>
          <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => router.push("/player/transactions")}
              className="flex items-center gap-1 text-sm text-blue-500 font-medium hover:text-blue-600"
            >
              {t("viewTransactionHistory") || "View Transaction History"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Wallet, label: t("wallet") || "Wallet", subtitle: t("addFunds") || "Add Funds", color: "bg-blue-500", href: "/player/payment" },
          { icon: Sparkles, label: t("tchala") || "Tchala", subtitle: t("dreamNumbers") || "Dream Numbers", color: "bg-amber-500", href: "/player/tchala" },
          { icon: Trophy, label: t("results") || "Results", subtitle: t("offers") || "Latest", color: "bg-emerald-500", href: "/player/results" },
          { icon: Clock, label: t("history") || "History", subtitle: t("pastPlays") || "Past Plays", color: "bg-violet-500", href: "/player/history" },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl ${action.color} text-white hover:opacity-90 transition-all min-h-[100px]`}
          >
            <action.icon className="h-8 w-8" />
            <span className="text-base font-semibold">{action.label}</span>
            <span className="text-xs opacity-80">{action.subtitle}</span>
          </button>
        ))}
      </div>

      {/* Rewards Banner */}
      <div
        onClick={() => router.push("/player/rewards")}
        className="w-full bg-amber-100 border-2 border-amber-400 rounded-2xl p-4 cursor-pointer hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
            <Gift className="h-8 w-8 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900 text-lg">🎁 {t("rewards") || "Rewards"}</p>
            <p className="text-sm text-amber-800">{t("checkRewards") || "Check your rewards & bonuses"}</p>
          </div>
        </div>
        <button className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-base hover:bg-amber-600 transition-colors">
          {t("viewRewards") || "View Rewards"}
        </button>
      </div>

      {/* Find Vendors */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("findVendors") || "Find Vendors"}</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("searchVendorOrState") || "Search vendors..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-36" />
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
              const games = getEnabledGames(vendor);
              const states = getVendorStates(vendor);
              const range = getVendorPriceRange(vendor);
              return (
                <Card
                  key={vendor.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/player/play?vendorId=${vendor.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm text-gray-600">{vendor.rating?.toFixed(1) || "5.0"}</span>
                        </div>
                      </div>
                      <Badge variant="success">{t("active") || "Active"}</Badge>
                    </div>
                    {states && (
                      <p className="text-xs text-gray-500 mb-2">
                        {t("states") || "States"}: {states}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {games.map((g) => (
                        <span
                          key={g}
                          className={`text-xs text-white px-2 py-0.5 rounded-full ${GAME_TYPE_COLORS[g] || "bg-gray-500"}`}
                        >
                          {GAME_LABELS[g] || g}
                        </span>
                      ))}
                    </div>
                    {range.max > 0 && (
                      <p className="text-xs text-gray-500">
                        {t("betRange") || "Bet Range"}: {formatCurrency(range.min, currency)} - {formatCurrency(range.max, currency)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/player/vendor/${vendor.id}`);
                        }}
                      >
                        {t("viewProfile") || "View Profile"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/player/play?vendorId=${vendor.id}`);
                        }}
                      >
                        {t("play") || "Play"} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
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
