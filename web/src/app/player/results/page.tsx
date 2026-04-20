"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { lotteryAPI } from "@/lib/api/lottery";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Trophy, Sparkles, Clock, ChevronRight, ChevronLeft, Star, Loader2, TrendingUp, Info, Calendar
} from "lucide-react";
import { formatCurrency, GAME_LABELS } from "@/lib/utils";
import { format, addDays, subDays, isToday } from "date-fns";

const STATE_INFO: Record<string, { name: string; color: string; flag: string }> = {
  NY: { name: "New York", color: "from-blue-600 to-blue-700", flag: "🗽" },
  FL: { name: "Florida", color: "from-orange-500 to-orange-600", flag: "🌴" },
  GA: { name: "Georgia", color: "from-red-500 to-red-600", flag: "🍑" },
  TX: { name: "Texas", color: "from-purple-600 to-purple-700", flag: "⛳" },
  PA: { name: "Pennsylvania", color: "from-yellow-600 to-yellow-700", flag: "🔔" },
  CT: { name: "Connecticut", color: "from-teal-600 to-teal-700", flag: "🏛️" },
  TN: { name: "Tennessee", color: "from-pink-500 to-pink-600", flag: "🎵" },
  NJ: { name: "New Jersey", color: "from-green-600 to-green-700", flag: "🏖️" },
};

const DRAW_TIME_LABELS: Record<string, string> = {
  morning: "🌅 Morning",
  midday: "☀️ Midday",
  evening: "🌙 Evening",
};

const DRAW_TIME_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  morning: { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" },
  midday: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
  evening: { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-300" },
};

const GAME_COLORS: Record<string, { bg: string; text: string; ball: string }> = {
  senp: { bg: "bg-amber-50", text: "text-amber-800", ball: "bg-amber-500" },
  maryaj: { bg: "bg-purple-50", text: "text-purple-800", ball: "bg-purple-500" },
  loto3: { bg: "bg-blue-50", text: "text-blue-800", ball: "bg-blue-500" },
  loto4: { bg: "bg-emerald-50", text: "text-emerald-800", ball: "bg-emerald-500" },
  loto5: { bg: "bg-red-50", text: "text-red-800", ball: "bg-red-600" },
};

const MARYAJ_PAIR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-red-500",
];

function NumberBall({ number, color = "bg-amber-500", size = "w-11 h-11" }: { number: number | string; color?: string; size?: string }) {
  return (
    <div className={`${size} rounded-full ${color} text-white flex items-center justify-center font-bold shadow-md text-base`}>
      {number}
    </div>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const vendors = useAppStore((s) => s.vendors);

  const [lotteryRounds, setLotteryRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPayoutInfo, setShowPayoutInfo] = useState(false);
  const [payoutRates, setPayoutRates] = useState<Record<string, number> | null>(null);
  const [filterState, setFilterState] = useState("all");

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
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

  useEffect(() => {
    const loadPayoutRates = async () => {
      try {
        if (vendors && vendors.length > 0) {
          const rates = await vendorAPI.getVendorPayoutRates(vendors[0].id);
          setPayoutRates(rates);
        }
      } catch {
        setPayoutRates({ senp_1st: 60, senp_2nd: 20, senp_3rd: 10, maryaj: 800, loto3: 700, loto4: 4000, loto5: 30000 });
      }
    };
    loadPayoutRates();
  }, [vendors]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const filteredRounds = lotteryRounds
    .filter((r: any) => {
      const dateMatch = r.drawDate && r.drawDate.startsWith(selectedDateStr);
      const stateMatch = filterState === "all" || r.drawState === filterState;
      return dateMatch && stateMatch;
    })
    .sort((a: any, b: any) => {
      const stateOrder = Object.keys(STATE_INFO);
      return stateOrder.indexOf(a.drawState) - stateOrder.indexOf(b.drawState);
    });

  // Group rounds by state
  const groupedByState = filteredRounds.reduce((acc: Record<string, any[]>, round: any) => {
    const state = round.drawState || "Unknown";
    if (!acc[state]) acc[state] = [];
    acc[state].push(round);
    return acc;
  }, {});

  const getDrawTimeLabel = (time: string) => {
    if (!time) return "";
    const lower = time.toLowerCase().trim();
    // Exact match first
    if (lower === "morning") return "morning";
    if (lower === "midday") return "midday";
    if (lower === "evening") return "evening";
    // Keyword match
    if (lower.includes("morning") || lower.includes("am") || lower.includes("matin")) return "morning";
    if (lower.includes("midday") || lower.includes("midi")) return "midday";
    if (lower.includes("evening") || lower.includes("soir") || lower.includes("pm")) return "evening";
    return lower;
  };

  const parseWinningNumbers = (round: any) => {
    const wn = round.winningNumbers;
    if (!wn) return null;
    if (typeof wn === "object" && !Array.isArray(wn)) return wn;
    return null;
  };

  const availableStates = [...new Set(lotteryRounds.map((r: any) => r.drawState).filter(Boolean))];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t("Lottery Results") || "Lottery Results"}</h1>
            <p className="text-xs text-gray-500">{t("Official Draw Results") || "Official draw results"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPayoutInfo(true)}>
          <Info className="h-4 w-4 mr-1" /> {t("Payout Rates") || "Payout Rates"}
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-sm">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}, {format(selectedDate, "MMMM d, yyyy")}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={isToday(selectedDate)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* State Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterState("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filterState === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          All States
        </button>
        {availableStates.map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filterState === state ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {STATE_INFO[state]?.flag || ""} {state}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : Object.keys(groupedByState).length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="p-8 text-center">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">No results for this date</p>
            <p className="text-sm text-gray-400 mt-1">Results will appear after draws are completed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByState).map(([state, rounds]) => {
            const info = STATE_INFO[state] || { name: state, color: "from-gray-500 to-gray-600", flag: "🎯" };
            return (
              <Card key={state} className="overflow-hidden border-0 shadow-md">
                {/* State Header */}
                <div className={`bg-gradient-to-r ${info.color} px-4 py-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.flag}</span>
                      <div>
                        <h3 className="text-white font-bold text-sm">{info.name}</h3>
                        <p className="text-white/70 text-xs">{state} Lottery</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      {(rounds as any[]).length} draw{(rounds as any[]).length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                {/* Draws for this state */}
                <CardContent className="p-0 divide-y divide-gray-100">
                  {(rounds as any[]).map((round: any, idx: number) => {
                    const winNums = parseWinningNumbers(round);
                    const isCompleted = round.status === "completed" || round.status === "drawn";
                    const isLive = round.status === "open" || round.status === "live";
                    const drawTimeLabel = getDrawTimeLabel(round.drawTime || "");
                    const drawTimeStyle = DRAW_TIME_STYLES[drawTimeLabel] || DRAW_TIME_STYLES.midday;
                    const drawTimeDisplay = DRAW_TIME_LABELS[drawTimeLabel] || round.drawTime || "Draw";

                    // Get all numbers flat for the header display
                    const allNums = winNums
                      ? Object.values(winNums).flat().filter((n: any) => typeof n === "number")
                      : [];

                    return (
                      <div key={round.id || idx} className="p-4">
                        {/* Draw Time Label — bold with emoji and color */}
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${drawTimeStyle.bg} border ${drawTimeStyle.border}`}>
                            <Clock className={`h-3.5 w-3.5 ${drawTimeStyle.text}`} />
                            <span className={`text-sm font-bold ${drawTimeStyle.text} uppercase tracking-wide`}>
                              {drawTimeDisplay}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isLive && (
                              <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                LIVE
                              </span>
                            )}
                            {isCompleted && (
                              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                FINAL
                              </Badge>
                            )}
                          </div>
                        </div>

                        {winNums && Object.keys(winNums).length > 0 ? (
                          <div className="space-y-3">
                            {/* SENP — show 4 numbers: single + 1st/2nd/3rd */}
                            {winNums.senp && Array.isArray(winNums.senp) && winNums.senp.length > 0 && (() => {
                              const gc = GAME_COLORS.senp;
                              const senpNums = winNums.senp;
                              // Extract the single digit from loto3[0] if available
                              const singleDigit = winNums.loto3 && Array.isArray(winNums.loto3) && winNums.loto3.length > 0 ? winNums.loto3[0] : null;
                              const labels = ["1st", "2nd", "3rd"];
                              return (
                                <div className={`${gc.bg} rounded-lg p-3`}>
                                  <span className={`text-xs font-bold ${gc.text} uppercase tracking-wider block mb-2`}>Senp</span>
                                  <div className="flex items-center gap-4">
                                    {singleDigit !== null && (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className={`text-[10px] font-semibold text-gray-500`}>&nbsp;</span>
                                        <NumberBall number={singleDigit} color="bg-gray-500" size="w-10 h-10" />
                                      </div>
                                    )}
                                    {senpNums.map((n: number, i: number) => (
                                      <div key={i} className="flex flex-col items-center gap-1">
                                        <span className={`text-[10px] font-semibold ${gc.text}`}>{labels[i] || ""}</span>
                                        <NumberBall number={n} color={gc.ball} size="w-10 h-10" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* MARYAJ — combinations with × */}
                            {(() => {
                              const senpNums = winNums.senp && Array.isArray(winNums.senp) ? winNums.senp as number[] : [];
                              const maryajNums = winNums.maryaj && Array.isArray(winNums.maryaj) ? winNums.maryaj as number[] : [];
                              // Always derive 3 pairs from senp [fp, sp, tp] → fp×sp, fp×tp, sp×tp
                              let combos: [number, number][] = [];
                              if (senpNums.length >= 3) {
                                combos = [
                                  [senpNums[0], senpNums[1]],
                                  [senpNums[0], senpNums[2]],
                                  [senpNums[1], senpNums[2]],
                                ];
                              } else if (maryajNums.length >= 6) {
                                // Fallback: read sequential pairs from maryaj array
                                for (let i = 0; i + 1 < maryajNums.length; i += 2) {
                                  combos.push([maryajNums[i], maryajNums[i + 1]]);
                                }
                              } else if (senpNums.length >= 2) {
                                combos = [[senpNums[0], senpNums[1]]];
                              } else if (maryajNums.length >= 2) {
                                for (let i = 0; i + 1 < maryajNums.length; i += 2) {
                                  combos.push([maryajNums[i], maryajNums[i + 1]]);
                                }
                              }
                              if (combos.length === 0) return null;
                              const gc = GAME_COLORS.maryaj;
                              return (
                                <div className={`${gc.bg} rounded-lg p-3`}>
                                  <span className={`text-xs font-bold ${gc.text} uppercase tracking-wider block mb-2`}>Maryaj</span>
                                  <div className="flex flex-wrap items-center gap-3">
                                    {combos.map(([a, b], i) => {
                                      const pairColor = MARYAJ_PAIR_COLORS[i % MARYAJ_PAIR_COLORS.length];
                                      return (
                                        <div key={i} className="flex items-center gap-1.5">
                                          <NumberBall number={a} color={pairColor} size="w-9 h-9" />
                                          <span className={`text-sm font-bold ${gc.text}`}>×</span>
                                          <NumberBall number={b} color={pairColor} size="w-9 h-9" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* LOTO 3 / 4 / 5 — card style with concatenated numbers */}
                            {(["loto3", "loto4", "loto5"] as const).map((gameType) => {
                              const nums = winNums[gameType];
                              if (!nums || !Array.isArray(nums) || nums.length === 0) return null;
                              const gc = GAME_COLORS[gameType] || GAME_COLORS.senp;
                              const concatenated = nums.join("");
                              return (
                                <div key={gameType} className={`${gc.bg} rounded-lg p-3`}>
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold ${gc.text} uppercase tracking-wider`}>
                                      {GAME_LABELS[gameType] || gameType}
                                    </span>
                                    <div className={`px-4 py-2 rounded-lg ${gc.ball} shadow-md`}>
                                      <span className="text-white font-bold text-lg tracking-widest">{concatenated}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Any other game types not explicitly handled */}
                            {Object.entries(winNums)
                              .filter(([gt]) => !["senp", "maryaj", "loto3", "loto4", "loto5"].includes(gt))
                              .map(([gameType, nums]: [string, any]) => {
                                const numsArr = Array.isArray(nums) ? nums : [];
                                if (numsArr.length === 0) return null;
                                const gc = GAME_COLORS[gameType] || GAME_COLORS.senp;
                                return (
                                  <div key={gameType} className={`${gc.bg} rounded-lg p-3`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-xs font-bold ${gc.text} uppercase tracking-wider`}>
                                        {GAME_LABELS[gameType] || gameType}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {numsArr.map((n: number, i: number) => (
                                          <NumberBall key={i} number={n} color={gc.ball} size="w-9 h-9" />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400">
                              {isLive ? "⏳ Draw in progress..." : "Waiting for results..."}
                            </p>
                          </div>
                        )}

                        {round.winnerCount > 0 && (
                          <div className="mt-3 flex items-center justify-center gap-1.5 text-emerald-600">
                            <Trophy className="h-4 w-4" />
                            <span className="text-sm font-semibold">
                              {round.winnerCount} winner{round.winnerCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payout Rates Dialog */}
      <Dialog open={showPayoutInfo} onOpenChange={setShowPayoutInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Payout Rates
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-bold text-amber-800">Senp</h4>
              {[
                { key: "senp_1st", label: "1st Prize", color: "text-yellow-600" },
                { key: "senp_2nd", label: "2nd Prize", color: "text-gray-500" },
                { key: "senp_3rd", label: "3rd Prize", color: "text-amber-700" },
              ].map((tier) => (
                <div key={tier.key} className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${tier.color}`}>{tier.label}</span>
                  <span className="text-gray-700">
                    $1 = <span className="font-bold text-emerald-700">${payoutRates?.[tier.key] ?? "..."}</span>
                  </span>
                </div>
              ))}
            </div>
            {[
              { key: "maryaj", label: "Maryaj" },
              { key: "loto3", label: "Loto 3" },
              { key: "loto4", label: "Loto 4" },
              { key: "loto5", label: "Loto 5" },
            ].map((game) => (
              <div key={game.key} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{game.label}</span>
                <span className="text-gray-700">
                  $1 = <span className="font-bold text-emerald-700">${(payoutRates?.[game.key] ?? 0).toLocaleString()}</span>
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center mt-2">
              Payout rates may vary by vendor
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
