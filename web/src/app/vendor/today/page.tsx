"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  ArrowLeft, Users, Trophy, DollarSign, Loader2, FileText,
  Download, Calendar, MapPin
} from "lucide-react";
import { formatCurrency, GAME_LABELS, DRAW_STATES, formatLotteryNumbers } from "@/lib/utils";
import toast from "react-hot-toast";

interface PlayEntry {
  id: string;
  playerName?: string;
  playerPhone?: string;
  gameType: string;
  numbers: string;
  betAmount: number;
  won?: boolean;
  winAmount?: number;
  state?: string;
  createdAt?: string;
  items?: Array<{
    id: string;
    gameType: string;
    numbers: string;
    betAmount: number;
    state?: string;
    won?: boolean;
    winAmount?: number;
  }>;
}

export default function TodayPlayersWinnersScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PlayEntry[]>([]);
  const [filterState, setFilterState] = useState("all");
  const [activeTab, setActiveTab] = useState<"players" | "winners">("players");

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await vendorAPI.getPlayHistory(1, 500);
      // Backend returns { plays: [...], total: N } — res is the raw Axios response
      const rawData = res.data?.plays || res.data?.data?.plays || res.data?.tickets || res.data?.data?.tickets || [];
      const all = (Array.isArray(rawData) ? rawData : []).map((e: any) => ({
        id: e.id,
        playerName: e.playerName || e.player_name,
        playerPhone: e.playerPhone || e.player_phone,
        gameType: e.gameType || e.game_type,
        numbers: Array.isArray(e.numbers)
          ? formatLotteryNumbers(e.numbers, e.gameType || e.game_type, '-')
          : (e.numbers || ''),
        betAmount: e.betAmount || e.bet_amount || 0,
        won: e.status === 'won',
        winAmount: e.winAmount || e.win_amount || 0,
        state: e.drawState || e.draw_state || e.state,
        createdAt: e.createdAt || e.created_at,
        items: Array.isArray(e.items)
          ? e.items.map((item: any) => ({
            id: item.id,
            gameType: item.gameType || item.game_type,
            numbers: Array.isArray(item.numbers)
              ? formatLotteryNumbers(item.numbers, item.gameType || item.game_type, '-')
              : (item.numbers || ''),
            betAmount: item.betAmount || item.bet_amount || 0,
            state: item.drawState || item.draw_state || item.state,
            won: item.status === 'won' || item.won === true,
            winAmount: item.winAmount || item.win_amount || 0,
          }))
          : undefined,
      }));
      const today = new Date().toISOString().split("T")[0];
      const todayEntries = all.filter((e: PlayEntry) => {
        const d = e.createdAt;
        return d && d.startsWith(today);
      });
      setEntries(todayEntries);
    } catch {
      toast.error("Failed to load today's data");
    } finally {
      setLoading(false);
    }
  };

  const players = useMemo(() => {
    let items = entries;
    if (filterState !== "all") items = items.filter((e) => e.state === filterState);
    return items;
  }, [entries, filterState]);

  const winners = useMemo(() => {
    let items = entries.filter((e) => e.won);
    if (filterState !== "all") items = items.filter((e) => e.state === filterState);
    return items;
  }, [entries, filterState]);

  const displayed = activeTab === "players" ? players : winners;

  const grouped = useMemo(() => {
    const map: Record<string, PlayEntry[]> = {};
    displayed.forEach((e) => {
      const key = e.state || "Unknown";
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [displayed]);

  const stats = useMemo(() => {
    const uniquePlayers = new Set(entries.map((e) => e.playerName || e.playerPhone || e.id));
    const totalBet = entries.reduce((s, e) => s + (e.betAmount || 0), 0);
    const winnersList = entries.filter((e) => e.won);
    const totalWon = winnersList.reduce((s, e) => s + (e.winAmount || 0), 0);
    return { players: uniquePlayers.size, totalBet, winners: winnersList.length, totalWon };
  }, [entries]);

  const handleExport = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Today's ${activeTab === "winners" ? "Winners" : "Players"} Report`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 28);

      // Sort: same player rows together, then by createdAt
      const sorted = [...displayed].sort((a, b) => {
        const pa = (a.playerName || a.playerPhone || "").toLowerCase();
        const pb = (b.playerName || b.playerPhone || "").toLowerCase();
        if (pa !== pb) return pa < pb ? -1 : 1;
        const ca = (a as any).createdAt || "";
        const cb = (b as any).createdAt || "";
        return ca < cb ? -1 : ca > cb ? 1 : 0;
      });

      const isWinners = activeTab === "winners";
      const body: (string | number)[][] = [];
      let rowNum = 0;
      let playerTotal = 0;
      let playerWonTotal = 0;
      let grandTotal = 0;
      let grandWonTotal = 0;
      let currentPlayer: string | null = null;

      const flushPlayerSubtotal = () => {
        if (currentPlayer === null) return;
        body.push([
          "",
          `Subtotal — ${currentPlayer}`,
          "",
          "",
          formatCurrency(playerTotal, currency),
          isWinners ? formatCurrency(playerWonTotal, currency) : "",
        ]);
        playerTotal = 0;
        playerWonTotal = 0;
      };

      for (const e of sorted) {
        const pn = e.playerName || e.playerPhone || "Unknown";
        if (pn !== currentPlayer) {
          flushPlayerSubtotal();
          currentPlayer = pn;
        }
        rowNum += 1;
        playerTotal += Number(e.betAmount) || 0;
        grandTotal += Number(e.betAmount) || 0;
        if (e.won && e.winAmount) {
          playerWonTotal += Number(e.winAmount) || 0;
          grandWonTotal += Number(e.winAmount) || 0;
        }
        body.push([
          rowNum,
          pn,
          GAME_LABELS[e.gameType] || e.gameType,
          e.numbers,
          formatCurrency(e.betAmount, currency),
          isWinners
            ? formatCurrency(e.winAmount || 0, currency)
            : DRAW_STATES[e.state || ""] || e.state || "-",
        ]);
      }
      flushPlayerSubtotal();
      body.push([
        "",
        "GRAND TOTAL",
        "",
        "",
        formatCurrency(grandTotal, currency),
        isWinners ? formatCurrency(grandWonTotal, currency) : "",
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["#", "Player", "Game", "Numbers", "Bet", isWinners ? "Won" : "State"]],
        body,
        didParseCell: (data) => {
          const raw = data.row.raw as any;
          const cell1 = String((raw && raw[1]) ?? "");
          if (cell1.startsWith("Subtotal") || cell1 === "GRAND TOTAL") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = cell1 === "GRAND TOTAL" ? [254, 215, 170] : [243, 244, 246];
          }
        },
      });
      doc.save(`today-${activeTab}-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported!");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const gameColors: Record<string, string> = {
    senp: "bg-blue-100 text-blue-700",
    maryaj: "bg-purple-100 text-purple-700",
    loto3: "bg-green-100 text-green-700",
    loto4: "bg-orange-100 text-orange-700",
    loto5: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t("Today's Players & Winners") || "Today's Players & Winners"}</h1>
            <p className="text-sm text-gray-500">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("Total Players") || "Players"} value={stats.players} icon={<Users className="h-5 w-5" />} />
        <StatCard title={t("Total Bets") || "Bets"} value={formatCurrency(stats.totalBet, currency)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title={t("Winners") || "Winners"} value={stats.winners} icon={<Trophy className="h-5 w-5" />} />
        <StatCard title={t("Total Paid") || "Total Paid"} value={formatCurrency(stats.totalWon, currency)} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(["players", "winners"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === tab
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab === "players" ? (t("Players") || "Players") : (t("winners") || "Winners")}
            <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
              {tab === "players" ? players.length : winners.length}
            </span>
          </button>
        ))}
      </div>

      {/* State Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterState("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium ${filterState === "all" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
        >
          {t("allStates") || "All States"}
        </button>
        {Object.entries(DRAW_STATES).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFilterState(k)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${filterState === k ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={activeTab === "winners" ? <Trophy className="h-10 w-10" /> : <Users className="h-10 w-10" />}
          title={activeTab === "winners" ? (t("No Winners Today") || "No winners today") : (t("No Players Today") || "No players today")}
          description={t("Check Back Later") || "Check back later for updated results."}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([state, items]) => (
            <div key={state}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-sm">{DRAW_STATES[state] || state}</h3>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-1.5">
                {items.map((entry) => (
                  <Card key={entry.id} className={entry.won ? "border-l-4 border-l-yellow-400" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {(entry.playerName || "P")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.playerName || entry.playerPhone || "Player"}</p>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${gameColors[entry.gameType] || "bg-gray-100 text-gray-700"}`}>
                              {entry.items && entry.items.length > 1 ? `${entry.items.length} selections` : GAME_LABELS[entry.gameType] || entry.gameType}
                            </span>
                            <span className="text-xs font-mono text-gray-500">{entry.numbers}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(entry.betAmount, currency)}</p>
                        {entry.won && (
                          <p className="text-xs text-yellow-600 font-medium">
                            🏆 {formatCurrency(entry.winAmount || 0, currency)}
                          </p>
                        )}
                      </div>
                      </div>
                      {entry.items && entry.items.length > 1 && (
                        <div className="mt-3 space-y-1 border-t pt-2">
                          {entry.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 text-xs text-gray-600">
                              <span>
                                <strong>{DRAW_STATES[item.state || ""] || item.state}</strong>
                                {" - "}
                                {GAME_LABELS[item.gameType] || item.gameType}
                                {" - "}
                                <span className="font-mono">{item.numbers}</span>
                              </span>
                              <span className="font-semibold">{formatCurrency(item.betAmount, currency)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
