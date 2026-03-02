"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  ArrowLeft, Search, Filter, FileText, Download, Loader2,
  Ticket, DollarSign, Trophy, Percent, Calendar
} from "lucide-react";
import { formatCurrency, GAME_LABELS, DRAW_STATES } from "@/lib/utils";
import toast from "react-hot-toast";

interface HistoryItem {
  id: string;
  playerName?: string;
  gameType: string;
  numbers: string;
  betAmount: number;
  won?: boolean;
  winAmount?: number;
  state?: string;
  createdAt?: string;
  drawDate?: string;
}

export default function VendorHistoryScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGame, setFilterGame] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await vendorAPI.getPlayHistory(1, 200);
      const raw = res.data?.data || res.data;
      const data = raw?.plays || raw?.tickets || raw;
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load play history");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let items = [...history];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          (i.playerName?.toLowerCase().includes(q)) ||
          i.numbers?.includes(q) ||
          i.gameType?.toLowerCase().includes(q)
      );
    }
    if (filterGame !== "all") items = items.filter((i) => i.gameType === filterGame);
    if (filterState !== "all") items = items.filter((i) => i.state === filterState);
    if (filterDate) {
      items = items.filter((i) => {
        const d = i.createdAt || i.drawDate;
        return d && d.startsWith(filterDate);
      });
    }
    return items;
  }, [history, searchQuery, filterGame, filterState, filterDate]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const totalBet = filtered.reduce((s, i) => s + (i.betAmount || 0), 0);
    const winners = filtered.filter((i) => i.won);
    const totalWon = winners.reduce((s, i) => s + (i.winAmount || 0), 0);
    const commission = totalBet * 0.1;
    return { total, totalBet, winners: winners.length, totalWon, commission };
  }, [filtered]);

  const gameColors: Record<string, string> = {
    senp: "bg-blue-100 text-blue-700",
    maryaj: "bg-purple-100 text-purple-700",
    loto3: "bg-green-100 text-green-700",
    loto4: "bg-orange-100 text-orange-700",
    loto5: "bg-red-100 text-red-700",
  };

  const handleExportCSV = () => {
    const headers = "Player,Game,Numbers,Amount,Won,WinAmount,State,Date\n";
    const rows = filtered
      .map(
        (i) =>
          `"${i.playerName || ""}","${i.gameType}","${i.numbers}",${i.betAmount},${i.won || false},${i.winAmount || 0},"${i.state || ""}","${i.createdAt || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `play-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Play History Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      autoTable(doc, {
        startY: 35,
        head: [["Player", "Game", "Numbers", "Amount", "Won", "State", "Date"]],
        body: filtered.map((i) => [
          i.playerName || "-",
          GAME_LABELS[i.gameType] || i.gameType,
          i.numbers,
          formatCurrency(i.betAmount, currency),
          i.won ? formatCurrency(i.winAmount || 0, currency) : "-",
          i.state || "-",
          i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "-",
        ]),
      });
      doc.save(`play-history-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported!");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("playHistory") || "Play History"}</h1>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("totalTickets") || "Tickets"} value={stats.total} icon={<Ticket className="h-5 w-5" />} />
        <StatCard title={t("totalBet") || "Total Bet"} value={formatCurrency(stats.totalBet, currency)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title={t("winners") || "Winners"} value={stats.winners} icon={<Trophy className="h-5 w-5" />} />
        <StatCard title={t("commission") || "Commission"} value={formatCurrency(stats.commission, currency)} icon={<Percent className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder={t("searchPlayers") || "Search players, numbers..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
            >
              <option value="all">{t("allGames") || "All Games"}</option>
              {Object.entries(GAME_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
            >
              <option value="all">{t("allStates") || "All States"}</option>
              {Object.entries(DRAW_STATES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-gray-500">{filtered.length} {t("results") || "results"}</p>

      {/* History List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title={t("noHistory") || "No play history"}
          description={t("noHistoryDesc") || "Play history will appear here once players start betting."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className={item.won ? "border-l-4 border-l-yellow-400" : ""}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gameColors[item.gameType] || "bg-gray-100 text-gray-700"}`}>
                      {GAME_LABELS[item.gameType] || item.gameType}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{item.playerName || "Player"}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono">{item.numbers}</span>
                        {item.state && <span>• {DRAW_STATES[item.state] || item.state}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.betAmount, currency)}</p>
                    {item.won && (
                      <p className="text-xs text-yellow-600 font-medium">
                        Won {formatCurrency(item.winAmount || 0, currency)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
