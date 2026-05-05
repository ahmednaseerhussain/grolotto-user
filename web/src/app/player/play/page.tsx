"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { lotteryAPI } from "@/lib/api/lottery";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Star, Trash2, ShoppingCart, AlertTriangle, CheckCircle, Loader2, ChevronRight
} from "lucide-react";
import { formatCurrency, GAME_LABELS, MULTIPLIERS, formatLotteryNumber, formatLotteryNumbers } from "@/lib/utils";
import toast from "react-hot-toast";

const DRAWS = [
  { code: "NY", name: "New York", flag: "🗽" },
  { code: "FL", name: "Florida", flag: "🌴" },
  { code: "GA", name: "Georgia", flag: "🍑" },
  { code: "TX", name: "Texas", flag: "⛳" },
  { code: "PA", name: "Pennsylvania", flag: "🔔" },
  { code: "CT", name: "Connecticut", flag: "🏛️" },
  { code: "TN", name: "Tennessee", flag: "🎵" },
  { code: "NJ", name: "New Jersey", flag: "🏖️" },
];

const GAME_CONFIGS: Record<string, { digits: number; range: number[]; description: string }> = {
  senp: { digits: 1, range: [0, 99], description: "Pick 2 digits (00-99)" },
  maryaj: { digits: 2, range: [0, 99], description: "Pick 2 pairs of numbers (00-99 each)" },
  loto3: { digits: 3, range: [0, 9], description: "Pick 3 single digits (0-9)" },
  loto4: { digits: 4, range: [0, 9], description: "Pick 4 single digits (0-9)" },
  loto5: { digits: 5, range: [0, 9], description: "Pick 5 single digits (0-9)" },
};

const GAME_COLORS: Record<string, string> = {
  senp: "bg-red-500",
  maryaj: "bg-emerald-500",
  loto3: "bg-blue-500",
  loto4: "bg-purple-500",
  loto5: "bg-amber-500",
};

interface GameSelection {
  id: string;
  state: string;
  gameType: string;
  numbers: string[];
  betAmount: number;
}

export default function PlayScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const vendors = useAppStore((s) => s.vendors);
  const wallet = useAppStore((s) => s.wallet);

  const [vendor, setVendor] = useState<any>(null);
  const [selectedState, setSelectedState] = useState("");
  const [selectedGame, setSelectedGame] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [drawTime, setDrawTime] = useState<"morning" | "midday" | "evening">("morning");
  const [gameSelections, setGameSelections] = useState<GameSelection[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load vendor (or vendor list when no vendorId).
  // NOTE: do NOT depend on `vendors` here — `setVendors` updates it, which would
  // re-trigger this effect and cause an infinite refetch loop (perceived hang).
  useEffect(() => {
    let cancelled = false;
    const loadVendor = async () => {
      if (!vendorId) {
        // No vendor selected - selection screen. Use cache immediately if fresh
        // (stale-while-revalidate), otherwise show skeletons.
        const state = useAppStore.getState();
        const fresh = state.vendorsFetchedAt && Date.now() - state.vendorsFetchedAt < 5 * 60_000;
        if (state.vendors.length > 0) {
          // Render from cache right away
          setLoading(false);
        } else {
          setLoading(true);
        }
        if (!fresh) {
          try {
            const res = await vendorAPI.getVendors();
            if (cancelled) return;
            const list = Array.isArray(res) ? res : (res as any)?.vendors || [];
            useAppStore.getState().setVendors(list);
          } catch { }
        }
        if (!cancelled) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const cached = useAppStore.getState().vendors;
        const found = cached.find((v: any) => String(v.id) === String(vendorId));
        if (found && !cancelled) setVendor(found);
        const fullVendor = await vendorAPI.getVendorById(vendorId);
        if (fullVendor && !cancelled) setVendor(fullVendor);
      } catch (err) {
        console.error(err);
        try {
          const res = await vendorAPI.getVendors();
          if (cancelled) return;
          const list = Array.isArray(res) ? res : (res as any)?.vendors || [];
          useAppStore.getState().setVendors(list);
          const v = list.find((x: any) => String(x.id) === String(vendorId));
          if (v) setVendor(v);
        } catch { }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadVendor();
    return () => { cancelled = true; };
  }, [vendorId]);

  // Auto-select first state
  useEffect(() => {
    if (vendor?.draws) {
      const enabledStates = Object.entries(vendor.draws)
        .filter(([, d]: [string, any]) => d?.enabled)
        .map(([code]) => code);
      if (enabledStates.length > 0 && !selectedState) {
        setSelectedState(enabledStates[0]);
      }
    }
  }, [vendor, selectedState]);

  // When draw time changes, ensure the selected state is valid for that time.
  // If not, switch to the first state that supports the chosen time.
  useEffect(() => {
    if (!vendor?.draws) return;
    const draws: Record<string, any> = vendor.draws;
    const hasAnySchedule = Object.values(draws).some(
      (d: any) => Array.isArray(d?.drawTimes) && d.drawTimes.length > 0
    );
    if (!hasAnySchedule) return; // legacy: no schedule data, do nothing
    const supports = (code: string) =>
      Array.isArray(draws[code]?.drawTimes) && draws[code].drawTimes.includes(drawTime);
    if (selectedState && !supports(selectedState)) {
      const fallback = Object.keys(draws).find((code) => draws[code]?.enabled && supports(code));
      if (fallback) {
        setSelectedState(fallback);
        setSelectedGame("");
      } else {
        setSelectedState("");
        setSelectedGame("");
      }
    }
  }, [drawTime, vendor, selectedState]);

  // Reset numbers on game change
  useEffect(() => {
    if (selectedGame) {
      const config = GAME_CONFIGS[selectedGame];
      if (config) {
        if (selectedGame === "senp") {
          setNumbers([""]);
        } else if (selectedGame === "maryaj") {
          setNumbers(["", ""]);
        } else {
          setNumbers(Array(config.digits).fill(""));
        }
      }
    }
  }, [selectedGame]);

  const enabledStates = vendor?.draws
    ? Object.entries(vendor.draws)
      .filter(([, d]: [string, any]) => d?.enabled)
      .map(([code]) => code)
    : [];

  // States that have the currently-selected draw time scheduled & active.
  // If a vendor has NO schedules configured at all (legacy), fall back to all enabled states.
  const vendorHasAnySchedule = vendor?.draws
    ? Object.values(vendor.draws).some((d: any) => Array.isArray(d?.drawTimes) && d.drawTimes.length > 0)
    : false;
  const statesForDrawTime = vendorHasAnySchedule
    ? enabledStates.filter((code) => {
      const d: any = (vendor?.draws || {})[code];
      return Array.isArray(d?.drawTimes) && d.drawTimes.includes(drawTime);
    })
    : enabledStates;

  // Available draw times across all enabled states (for the time selector)
  const availableDrawTimes: string[] = vendor?.draws
    ? Array.from(new Set(
      Object.values(vendor.draws)
        .filter((d: any) => d?.enabled && Array.isArray(d?.drawTimes))
        .flatMap((d: any) => d.drawTimes as string[])
    ))
    : [];

  // Format "HH:MM:SS" or "HH:MM" → "h:mm AM/PM"
  const formatTime = (t?: string): string => {
    if (!t) return "";
    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Get displayed open/close range for a given draw time.
  // If a state is selected → use that state's schedule.
  // Otherwise → aggregate min(open) - max(close) across all enabled states for that time.
  const getDrawTimeRange = (time: string): { open: string; close: string } | null => {
    const draws: Record<string, any> = vendor?.draws || {};
    const collect = (code: string): { openTime: string; closeTime: string } | null => {
      const sched = (draws[code]?.schedules || []).find(
        (s: any) => s.drawTime === time && s.isActive !== false
      );
      return sched ? { openTime: sched.openTime, closeTime: sched.closeTime } : null;
    };
    if (selectedState) {
      const s = collect(selectedState);
      return s ? { open: s.openTime, close: s.closeTime } : null;
    }
    let minOpen: string | null = null;
    let maxClose: string | null = null;
    for (const code of enabledStates) {
      const s = collect(code);
      if (!s) continue;
      if (!minOpen || s.openTime < minOpen) minOpen = s.openTime;
      if (!maxClose || s.closeTime > maxClose) maxClose = s.closeTime;
    }
    return minOpen && maxClose ? { open: minOpen, close: maxClose } : null;
  };

  const vendorDraws: Record<string, any> = vendor?.draws || {};
  const currentDraw = vendorDraws[selectedState];
  const enabledGames = currentDraw
    ? Object.entries(currentDraw.games || {})
      .filter(([, g]: [string, any]) => g?.enabled)
      .map(([key]) => key)
    : [];

  const currentGameConfig = currentDraw?.games?.[selectedGame];
  const minBet = currentGameConfig?.minAmount || 1;
  const maxBet = currentGameConfig?.maxAmount || 10000;

  const getNumberString = () => {
    if (selectedGame === "senp") {
      return numbers[0]?.padStart(2, "0") || "";
    }
    if (selectedGame === "maryaj") {
      return (numbers[0]?.padStart(2, "0") || "") + "-" + (numbers[1]?.padStart(2, "0") || "");
    }
    return numbers.join("");
  };

  const isNumbersComplete = () => {
    if (selectedGame === "senp") {
      return numbers[0]?.length === 2;
    }
    if (selectedGame === "maryaj") {
      return numbers[0]?.length === 2 && numbers[1]?.length === 2;
    }
    const config = GAME_CONFIGS[selectedGame];
    return config && numbers.every((n) => n.length === 1);
  };

  const handleAddSelection = () => {
    const amt = parseFloat(betAmount);
    if (!selectedState || !selectedGame || !isNumbersComplete()) {
      toast.error(t("selectAllNumbers") || "Please complete your number selection");
      return;
    }
    if (isNaN(amt) || amt < minBet || amt > maxBet) {
      toast.error(`${t("enterValidAmount") || "Enter a valid amount"} (${formatCurrency(minBet, currency)} - ${formatCurrency(maxBet, currency)})`);
      return;
    }

    const numStr = getNumberString();
    // Check duplicate
    const isDuplicate = gameSelections.some(
      (s) => s.state === selectedState && s.gameType === selectedGame &&
        (selectedGame === "maryaj" ? s.numbers.join("-") === numStr : s.numbers.join("") === numStr)
    );
    if (isDuplicate) {
      toast.error("You already have this selection in your cart");
      return;
    }

    setGameSelections((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        state: selectedState,
        gameType: selectedGame,
        numbers: selectedGame === "senp" ? [numStr] : selectedGame === "maryaj" ? [numbers[0]?.padStart(2, "0"), numbers[1]?.padStart(2, "0")] : [...numbers],
        betAmount: amt,
      },
    ]);
    // Reset for next selection
    const config = GAME_CONFIGS[selectedGame];
    if (selectedGame === "senp") {
      setNumbers([""]);
    } else if (selectedGame === "maryaj") {
      setNumbers(["", ""]);
    } else {
      setNumbers(Array(config?.digits || 1).fill(""));
    }
    setBetAmount("");
    toast.success(t("selectionAdded") || "Selection added to cart!");
  };

  const handleRemoveSelection = (id: string) => {
    setGameSelections((prev) => prev.filter((s) => s.id !== id));
  };

  const totalAmount = gameSelections.reduce((sum, s) => sum + s.betAmount, 0);

  const handlePlaceBets = async () => {
    if (gameSelections.length === 0) return;

    // Pre-check balance — do NOT auto-redirect to payment.
    // Client requested: tell the user to recharge their wallet first instead of
    // sending them straight into the MonCash flow.
    const currentBalance = currency === "HTG"
      ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
      : (wallet?.balanceUsd ?? wallet?.balance ?? 0);
    if (totalAmount > currentBalance) {
      const shortBy = totalAmount - currentBalance;
      toast.error(
        `${t("insufficientBalance") || "Insufficient balance"}. ${t("pleaseRechargeWallet") || "Please recharge your wallet first."} (${formatCurrency(shortBy, currency)})`,
        { duration: 5000 }
      );
      return;
    }

    setProcessing(true);
    try {
      let allSuccess = true;
      const successfulBets: string[] = [];
      for (const sel of gameSelections) {
        try {
          await lotteryAPI.placeBet({
            vendorId: vendor.id,
            drawState: sel.state,
            gameType: sel.gameType,
            numbers: sel.numbers.map(Number),
            betAmount: sel.betAmount,
            currency,
            drawTime,
          });
          successfulBets.push(sel.id);
        } catch (err: any) {
          allSuccess = false;
          const msg = err?.response?.data?.error || err?.response?.data?.message || "Bet failed";
          if (msg.includes("INSUFFICIENT") || msg.includes("insufficient")) {
            toast.error("Insufficient balance. Please add funds.");
            // Remove successful bets from cart, keep failed ones
            if (successfulBets.length > 0) {
              setGameSelections((prev) => prev.filter((s) => !successfulBets.includes(s.id)));
              toast.success(`${successfulBets.length} bet(s) placed successfully before running out of funds.`);
            }
            router.push(`/player/payment?amount=${totalAmount}`);
            return;
          }
          toast.error(`Failed: ${sel.gameType} ${sel.numbers.join("")} - ${msg}`);
        }
      }
      if (allSuccess) {
        setShowSuccessDialog(true);
        setGameSelections([]);
      } else if (successfulBets.length > 0) {
        // Partial success: remove placed bets from cart
        setGameSelections((prev) => prev.filter((s) => !successfulBets.includes(s.id)));
        toast.success(`${successfulBets.length} of ${gameSelections.length} bets placed. Check remaining items.`);
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    // If we're on the selection screen (no vendorId), show skeleton grid
    // instead of a single spinner so the page feels responsive.
    if (!vendorId) {
      return (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("Select Vendor") || "Select a Vendor"}</h1>
              <p className="text-sm text-gray-500">{t("Choose Vendor To Play") || "Choose a vendor to place your bets"}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-28" />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!vendor) {
    // Show vendor selection screen - filter by selected currency only
    // (matches dashboard "Quick Play Vendors" so See All shows the same set)
    const availableVendors = (vendors || []).filter((v: any) => {
      const matchesCurrency = !v.operatingCurrency || v.operatingCurrency === currency;
      return matchesCurrency;
    });
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t("Select Vendor") || "Select a Vendor"}</h1>
            <p className="text-sm text-gray-500">{t("Choose Vendor To Play") || "Choose a vendor to place your bets"}</p>
          </div>
        </div>
        {availableVendors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <p className="font-medium text-gray-700">{t("No Vendors Available") || "No vendors available"}</p>
              <p className="text-sm text-gray-500 mt-1">Check back later or contact support</p>
              <Button className="mt-4" onClick={() => router.push("/player/dashboard")}>
                {t("Go Back") || "Go Back"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {availableVendors.map((v: any) => {
              const states = v.draws ? Object.entries(v.draws).filter(([, d]: [string, any]) => d?.enabled).map(([code]) => code) : [];
              const games = new Set<string>();
              if (v.draws) Object.values(v.draws).forEach((draw: any) => {
                if (draw?.enabled) Object.entries(draw.games || {}).forEach(([key, g]: [string, any]) => { if (g?.enabled) games.add(key); });
              });
              return (
                <Card
                  key={v.id}
                  className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all"
                  onClick={() => router.push(`/player/play?vendorId=${v.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                        {(v.businessName || v.firstName || "V")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{v.businessName || `${v.firstName} ${v.lastName}`}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm text-gray-600">{v.rating?.toFixed(1) || "5.0"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {states.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.from(games).map((g) => (
                            <span key={g} className={`text-[10px] text-white px-1.5 py-0.5 rounded-full ${GAME_COLORS[g] || "bg-gray-500"}`}>
                              {GAME_LABELS[g] || g}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}</h1>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="text-sm text-gray-600">{vendor.rating?.toFixed(1) || "5.0"}</span>
          </div>
        </div>
      </div>

      {/* State Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t("selectState") || "Select State"}</h3>
        {statesForDrawTime.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            {t("noStatesForDrawTime") || `No states available for ${drawTime} draw. Try another draw time.`}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {DRAWS.filter((d) => statesForDrawTime.includes(d.code)).map((draw) => (
              <button
                key={draw.code}
                onClick={() => { setSelectedState(draw.code); setSelectedGame(""); }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedState === draw.code
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                  }`}
              >
                {draw.flag} {draw.code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Draw Time Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t("Draw Time") || "Draw Time"}</h3>
        <div className="flex gap-2">
          {(["morning", "midday", "evening"] as const).map((time) => {
            const isAvailable = availableDrawTimes.length === 0 || availableDrawTimes.includes(time);
            const range = getDrawTimeRange(time);
            // Past-cutoff check: if current local time has passed the close time,
            // mark this draw as closed for today.
            const now = new Date();
            const currentHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
            const isClosed = !!(range?.close && currentHHMM > range.close.slice(0, 5));
            const isSelectable = isAvailable && !isClosed;
            const isSelected = drawTime === time && isSelectable;
            const colorActive =
              time === "morning" ? "bg-green-600 text-white border-green-600"
                : time === "midday" ? "bg-amber-500 text-white border-amber-500"
                  : "bg-indigo-600 text-white border-indigo-600";
            const colorHover =
              time === "morning" ? "hover:border-green-300"
                : time === "midday" ? "hover:border-amber-300"
                  : "hover:border-indigo-300";
            const label = time === "morning" ? `🌅 ${t("morning") || "Morning"}`
              : time === "midday" ? `☀️ ${t("midday") || "Midday"}`
                : `🌙 ${t("evening") || "Evening"}`;
            return (
              <button
                key={time}
                onClick={() => isSelectable && setDrawTime(time)}
                disabled={!isSelectable}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${!isAvailable ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                  : isClosed ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : isSelected ? colorActive
                      : `bg-white text-gray-700 border-gray-200 ${colorHover}`
                  }`}
                title={
                  !isAvailable ? "Not scheduled by this vendor"
                    : isClosed ? `Not available — closed at ${formatTime(range?.close)}`
                      : range ? `${formatTime(range.open)} – ${formatTime(range.close)}` : undefined
                }
              >
                <span>{label}</span>
                {isClosed ? (
                  <span className={`text-[11px] font-normal text-red-500`}>
                    {t("notAvailable") || "Not available"}
                  </span>
                ) : range && (
                  <span className={`text-[11px] font-normal ${isSelected ? "opacity-90" : "text-gray-500"}`}>
                    {formatTime(range.open)} – {formatTime(range.close)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Type Selection */}
      {selectedState && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t("selectGameType") || "Select Game Type"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {enabledGames.map((game) => {
              const gameData = currentDraw?.games?.[game];
              return (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`p-3 rounded-lg border text-left transition-all ${selectedGame === game
                    ? "ring-2 ring-green-500 border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full ${GAME_COLORS[game]}`} />
                    <span className="font-medium text-sm">{GAME_LABELS[game] || game}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(gameData?.minAmount || 0, currency)} - {formatCurrency(gameData?.maxAmount || 0, currency)}
                  </p>
                  <p className="text-xs text-gray-400">Win: {MULTIPLIERS[game] || "?"}x</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Number Selection */}
      {selectedGame && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">{t("selectNumbers") || "Select Numbers"}</h3>
            <p className="text-sm text-gray-500">{GAME_CONFIGS[selectedGame]?.description}</p>

            <div className="flex items-center gap-3 justify-center">
              {selectedGame === "senp" ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={numbers[0] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setNumbers([val]);
                  }}
                  placeholder="00"
                  maxLength={2}
                  className="w-20 h-16 text-center text-2xl font-bold border-2 border-amber-400 rounded-xl bg-amber-50 focus:outline-none focus:border-amber-500"
                />
              ) : selectedGame === "maryaj" ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numbers[0] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setNumbers([val, numbers[1] || ""]);
                      if (val.length === 2) {
                        document.getElementById("maryaj-num-2")?.focus();
                      }
                    }}
                    placeholder="00"
                    maxLength={2}
                    className="w-20 h-16 text-center text-2xl font-bold border-2 border-amber-400 rounded-xl bg-amber-50 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-2xl font-bold text-gray-400">+</span>
                  <input
                    id="maryaj-num-2"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numbers[1] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setNumbers([numbers[0] || "", val]);
                    }}
                    placeholder="00"
                    maxLength={2}
                    className="w-20 h-16 text-center text-2xl font-bold border-2 border-amber-400 rounded-xl bg-amber-50 focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                numbers.map((num, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={num}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 1);
                      const newNums = [...numbers];
                      newNums[idx] = val;
                      setNumbers(newNums);
                      // Auto-focus next
                      if (val && idx < numbers.length - 1) {
                        const next = document.getElementById(`num-${idx + 1}`);
                        next?.focus();
                      }
                    }}
                    id={`num-${idx}`}
                    placeholder="0"
                    maxLength={1}
                    className="w-14 h-16 text-center text-2xl font-bold border-2 border-amber-400 rounded-xl bg-amber-50 focus:outline-none focus:border-amber-500"
                  />
                ))
              )}
            </div>

            {/* Bet Amount */}
            <div>
              <label className="text-sm font-medium text-gray-700">{t("betAmount") || "Bet Amount"}</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500 font-medium">{currency === "HTG" ? "G" : "$"}</span>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`${minBet} - ${maxBet}`}
                  min={minBet}
                  max={maxBet}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Min: {formatCurrency(minBet, currency)} | Max: {formatCurrency(maxBet, currency)}
              </p>
            </div>

            <Button onClick={handleAddSelection} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
              {t("addSelection") || "Add Selection"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cart */}
      {gameSelections.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">{t("yourSelections") || "Your Selections"} ({gameSelections.length})</h3>
            </div>
            <div className="space-y-2">
              {gameSelections.map((sel) => (
                <div key={sel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs text-white px-2 py-0.5 rounded-full ${GAME_COLORS[sel.gameType]}`}>
                      {GAME_LABELS[sel.gameType]}
                    </span>
                    <Badge variant="outline">{sel.state}</Badge>
                    <span className="font-mono font-bold text-lg">{sel.gameType === "maryaj" ? sel.numbers.map((n: any) => formatLotteryNumber(n, sel.gameType)).join("-") : sel.numbers.map((n: any) => formatLotteryNumber(n, sel.gameType)).join("")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-blue-600">{formatCurrency(sel.betAmount, currency)}</span>
                    <button onClick={() => handleRemoveSelection(sel.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="font-semibold text-gray-700">{t("total") || "Total"}</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(totalAmount, currency)}</span>
            </div>
            <Button
              onClick={handlePlaceBets}
              loading={processing}
              className="w-full mt-4 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {processing ? "Processing..." : `${t("Pay") || "Pay"} ${formatCurrency(totalAmount, currency)}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
            <DialogTitle className="text-center">{t("Bets Placed Successfully!") || "Bets Placed Successfully!"}</DialogTitle>
          </DialogHeader>
          <p className="text-center text-gray-500">
            Your bets have been placed. Good luck!
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => { setShowSuccessDialog(false); router.push(`/player/vendor/${vendor.id}`); }} variant="outline">
              Rate Vendor
            </Button>
            <Button onClick={() => { setShowSuccessDialog(false); router.push("/player/history"); }} variant="outline">
              View History
            </Button>
            <Button onClick={() => setShowSuccessDialog(false)}>
              Place More Bets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
