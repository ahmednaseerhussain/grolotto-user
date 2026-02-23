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
  ArrowLeft, Star, Trash2, ShoppingCart, AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import { formatCurrency, GAME_LABELS, MULTIPLIERS } from "@/lib/utils";
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
  maryaj: { digits: 1, range: [0, 99], description: "Pick 2 digits combo (00-99)" },
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
  const [gameSelections, setGameSelections] = useState<GameSelection[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load vendor
  useEffect(() => {
    const loadVendor = async () => {
      setLoading(true);
      try {
        const found = vendors.find((v: any) => v.id === vendorId || v.id === Number(vendorId));
        if (found) {
          setVendor(found);
        } else if (vendorId) {
          const res = await vendorAPI.getVendors();
          const list = Array.isArray(res) ? res : (res as any)?.vendors || [];
          const v = list.find((x: any) => x.id === vendorId || x.id === Number(vendorId));
          if (v) setVendor(v);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadVendor();
  }, [vendorId, vendors]);

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

  // Reset numbers on game change
  useEffect(() => {
    if (selectedGame) {
      const config = GAME_CONFIGS[selectedGame];
      if (config) {
        if (selectedGame === "senp" || selectedGame === "maryaj") {
          setNumbers([""]);
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
    if (selectedGame === "senp" || selectedGame === "maryaj") {
      return numbers[0]?.padStart(2, "0") || "";
    }
    return numbers.join("");
  };

  const isNumbersComplete = () => {
    if (selectedGame === "senp" || selectedGame === "maryaj") {
      return numbers[0]?.length === 2;
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
      (s) => s.state === selectedState && s.gameType === selectedGame && s.numbers.join("") === numStr
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
        numbers: selectedGame === "senp" || selectedGame === "maryaj" ? [numStr] : [...numbers],
        betAmount: amt,
      },
    ]);
    // Reset for next selection
    const config = GAME_CONFIGS[selectedGame];
    if (selectedGame === "senp" || selectedGame === "maryaj") {
      setNumbers([""]);
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
    setProcessing(true);
    try {
      let allSuccess = true;
      for (const sel of gameSelections) {
        try {
          await lotteryAPI.placeBet({
            vendorId: vendor.id,
            drawState: sel.state,
            gameType: sel.gameType,
            numbers: sel.numbers.map(Number),
            betAmount: sel.betAmount,
            currency,
          });
        } catch (err: any) {
          allSuccess = false;
          const msg = err?.response?.data?.error || err?.response?.data?.message || "Bet failed";
          if (msg.includes("INSUFFICIENT") || msg.includes("insufficient")) {
            toast.error("Insufficient balance. Please add funds.");
            router.push(`/player/payment?amount=${totalAmount}`);
            return;
          }
          toast.error(`Failed: ${sel.gameType} ${sel.numbers.join("")} - ${msg}`);
        }
      }
      if (allSuccess) {
        setShowSuccessDialog(true);
        setGameSelections([]);
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Vendor not found</p>
        <Button className="mt-4" onClick={() => router.push("/player/dashboard")}>
          Go Back
        </Button>
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
        <div className="flex flex-wrap gap-2">
          {DRAWS.filter((d) => enabledStates.includes(d.code)).map((draw) => (
            <button
              key={draw.code}
              onClick={() => { setSelectedState(draw.code); setSelectedGame(""); }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                selectedState === draw.code
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
              }`}
            >
              {draw.flag} {draw.code}
            </button>
          ))}
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
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedGame === game
                      ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50"
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
              {(selectedGame === "senp" || selectedGame === "maryaj") ? (
                <input
                  type="text"
                  value={numbers[0] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setNumbers([val]);
                  }}
                  placeholder="00"
                  maxLength={2}
                  className="w-20 h-16 text-center text-2xl font-bold border-2 border-amber-400 rounded-xl bg-amber-50 focus:outline-none focus:border-amber-500"
                />
              ) : (
                numbers.map((num, idx) => (
                  <input
                    key={idx}
                    type="text"
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

            <Button onClick={handleAddSelection} className="w-full" size="lg">
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
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
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
                    <span className="font-mono font-bold text-lg">{sel.numbers.join("")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-700">{formatCurrency(sel.betAmount, currency)}</span>
                    <button onClick={() => handleRemoveSelection(sel.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="font-semibold text-gray-700">{t("total") || "Total"}</span>
              <span className="text-xl font-bold text-emerald-700">{formatCurrency(totalAmount, currency)}</span>
            </div>
            <Button
              onClick={handlePlaceBets}
              loading={processing}
              className="w-full mt-4"
              size="lg"
            >
              {processing ? "Processing..." : `${t("pay") || "Pay"} ${formatCurrency(totalAmount, currency)}`}
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
            <DialogTitle className="text-center">{t("betPlacedSuccessfully") || "Bets Placed Successfully!"}</DialogTitle>
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
