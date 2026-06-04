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
  drawTime?: string;
  createdAt?: string;
  drawDate?: string;
}

export default function VendorHistoryScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const commissionRate = useAppStore((s) => s.vendorStats)?.commissionRate ?? 0.1;

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGame, setFilterGame] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [groupByDraw, setGroupByDraw] = useState(false);

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
    if (winnersOnly) items = items.filter((i) => i.won);
    if (filterDateFrom || filterDateTo) {
      items = items.filter((i) => {
        const d = i.createdAt || i.drawDate;
        if (!d) return false;
        const itemDate = d.slice(0, 10);
        if (filterDateFrom && itemDate < filterDateFrom) return false;
        if (filterDateTo && itemDate > filterDateTo) return false;
        return true;
      });
    }
    return items;
  }, [history, searchQuery, filterGame, filterState, filterDateFrom, filterDateTo, winnersOnly]);

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

  const escapeCSV = (val: string) => `"${String(val).replace(/"/g, '""')}"`;

  /** Sort items so rows of the same player are adjacent, then by date. */
  const groupItemsByPlayer = <T extends HistoryItem>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const pa = (a.playerName || "").toLowerCase();
      const pb = (b.playerName || "").toLowerCase();
      if (pa !== pb) return pa < pb ? -1 : 1;
      const ta = a.createdAt || "";
      const tb = b.createdAt || "";
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
  };

  // Group items by draw (date + state + drawTime)
  const groupedByDraw = useMemo(() => {
    const groups: Record<string, { key: string; drawDate: string; state: string; drawTime: string; items: HistoryItem[]; hasResults: boolean }> = {};
    for (const it of filtered) {
      const d = (it.drawDate || it.createdAt || "").slice(0, 10);
      const st = it.state || "?";
      const dt = it.drawTime || "";
      const key = `${d}|${st}|${dt}`;
      if (!groups[key]) {
        groups[key] = { key, drawDate: d, state: st, drawTime: dt, items: [], hasResults: false };
      }
      groups[key].items.push(it);
      // Heuristic: if any ticket has won flag defined (true or false) with winAmount present, assume results published
      if (it.won === true || (it.won === false && typeof it.winAmount === "number")) {
        groups[key].hasResults = true;
      }
    }
    return Object.values(groups).sort((a, b) => (b.drawDate > a.drawDate ? 1 : -1));
  }, [filtered]);

  const exportGroupCSV = (group: typeof groupedByDraw[number], postResult: boolean) => {
    const sorted = groupItemsByPlayer(group.items);
    const headers = postResult
      ? "#,Player,Game,Numbers,Amount,Won,WinAmount,State,DrawTime,Date,PlayerTotalWagered\n"
      : "#,Player,Game,Numbers,Amount,State,DrawTime,Date,PlayerTotalWagered\n";

    const lines: string[] = [];
    let rowNum = 0;
    let playerTotal = 0;
    let playerWonTotal = 0;
    let grandTotal = 0;
    let grandWonTotal = 0;
    let currentPlayer: string | null = null;
    const flushPlayerSubtotal = () => {
      if (currentPlayer === null) return;
      lines.push(
        postResult
          ? `,${escapeCSV(`Subtotal — ${currentPlayer || "Unknown"}`)},,,,,,,,,${playerTotal.toFixed(2)}`
          : `,${escapeCSV(`Subtotal — ${currentPlayer || "Unknown"}`)},,,,,,,${playerTotal.toFixed(2)}`
      );
      playerTotal = 0;
      playerWonTotal = 0;
    };

    for (const i of sorted) {
      const pn = i.playerName || "Unknown";
      if (pn !== currentPlayer) {
        flushPlayerSubtotal();
        currentPlayer = pn;
      }
      rowNum += 1;
      playerTotal += Number(i.betAmount) || 0;
      grandTotal += Number(i.betAmount) || 0;
      if (postResult && i.won && i.winAmount) {
        playerWonTotal += Number(i.winAmount) || 0;
        grandWonTotal += Number(i.winAmount) || 0;
      }
      lines.push(
        postResult
          ? `${rowNum},${escapeCSV(pn)},${escapeCSV(i.gameType)},${escapeCSV(i.numbers)},${i.betAmount},${i.won ? "YES" : "NO"},${i.winAmount || 0},${escapeCSV(i.state || "")},${escapeCSV(i.drawTime || "")},${escapeCSV(i.createdAt || "")},`
          : `${rowNum},${escapeCSV(pn)},${escapeCSV(i.gameType)},${escapeCSV(i.numbers)},${i.betAmount},${escapeCSV(i.state || "")},${escapeCSV(i.drawTime || "")},${escapeCSV(i.createdAt || "")},`
      );
    }
    flushPlayerSubtotal();
    // Grand total row
    lines.push(
      postResult
        ? `,${escapeCSV("GRAND TOTAL")},,,${grandTotal.toFixed(2)},,${grandWonTotal.toFixed(2)},,,,${grandTotal.toFixed(2)}`
        : `,${escapeCSV("GRAND TOTAL")},,,${grandTotal.toFixed(2)},,,,${grandTotal.toFixed(2)}`
    );

    const blob = new Blob([headers + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = postResult ? "with-winners" : "pre-result";
    a.download = `draw-${group.drawDate}-${group.state}-${group.drawTime}-${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const handleExportCSV = () => {
    const sorted = groupItemsByPlayer(filtered);
    const headers = "#,Player,Game,Numbers,Amount,Won,WinAmount,State,Date,PlayerTotalWagered\n";

    const lines: string[] = [];
    let rowNum = 0;
    let playerTotal = 0;
    let grandTotal = 0;
    let grandWonTotal = 0;
    let currentPlayer: string | null = null;
    const flushPlayerSubtotal = () => {
      if (currentPlayer === null) return;
      lines.push(
        `,${escapeCSV(`Subtotal — ${currentPlayer || "Unknown"}`)},,,,,,,,${playerTotal.toFixed(2)}`
      );
      playerTotal = 0;
    };

    for (const i of sorted) {
      const pn = i.playerName || "Unknown";
      if (pn !== currentPlayer) {
        flushPlayerSubtotal();
        currentPlayer = pn;
      }
      rowNum += 1;
      playerTotal += Number(i.betAmount) || 0;
      grandTotal += Number(i.betAmount) || 0;
      if (i.won && i.winAmount) grandWonTotal += Number(i.winAmount) || 0;
      lines.push(
        `${rowNum},${escapeCSV(pn)},${escapeCSV(i.gameType)},${escapeCSV(i.numbers)},${i.betAmount},${i.won || false},${i.winAmount || 0},${escapeCSV(i.state || "")},${escapeCSV(i.createdAt || "")},`
      );
    }
    flushPlayerSubtotal();
    lines.push(
      `,${escapeCSV("GRAND TOTAL")},,,${grandTotal.toFixed(2)},,${grandWonTotal.toFixed(2)},,,${grandTotal.toFixed(2)}`
    );

    const blob = new Blob([headers + lines.join("\n")], { type: "text/csv" });
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

      const sorted = groupItemsByPlayer(filtered);
      const body: (string | number)[][] = [];
      let rowNum = 0;
      let playerTotal = 0;
      let grandTotal = 0;
      let grandWon = 0;
      let currentPlayer: string | null = null;

      const flushPlayerSubtotal = () => {
        if (currentPlayer === null) return;
        body.push([
          "",
          `Subtotal — ${currentPlayer}`,
          "",
          "",
          "",
          formatCurrency(playerTotal, currency),
          "",
          "",
        ]);
        playerTotal = 0;
      };

      for (const i of sorted) {
        const pn = i.playerName || "Unknown";
        if (pn !== currentPlayer) {
          flushPlayerSubtotal();
          currentPlayer = pn;
        }
        rowNum += 1;
        playerTotal += Number(i.betAmount) || 0;
        grandTotal += Number(i.betAmount) || 0;
        if (i.won && i.winAmount) grandWon += Number(i.winAmount) || 0;
        body.push([
          rowNum,
          pn,
          GAME_LABELS[i.gameType] || i.gameType,
          i.numbers,
          formatCurrency(i.betAmount, currency),
          i.won ? formatCurrency(i.winAmount || 0, currency) : "-",
          i.state || "-",
          i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "-",
        ]);
      }
      flushPlayerSubtotal();
      body.push([
        "",
        "GRAND TOTAL",
        "",
        "",
        formatCurrency(grandTotal, currency),
        formatCurrency(grandWon, currency),
        "",
        "",
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["#", "Player", "Game", "Numbers", "Amount", "Won", "State", "Date"]],
        body,
        didParseCell: (data) => {
          // Bold the subtotal/grand total rows (col 1 contains "Subtotal" or "GRAND TOTAL")
          const cell1 = String(((data.row.raw as any) ?? [])[1] ?? "");
          if (cell1.startsWith("Subtotal") || cell1 === "GRAND TOTAL") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = cell1 === "GRAND TOTAL" ? [254, 215, 170] : [243, 244, 246];
          }
        },
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
          <h1 className="text-xl font-bold">{t("Play History") || "Play History"}</h1>
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
        <StatCard title={t("Total Bet") || "Total Bet"} value={formatCurrency(stats.totalBet, currency)} icon={<DollarSign className="h-5 w-5" />} />
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
              placeholder={t("Search Players") || "Search players, numbers..."}
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
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-auto"
              placeholder="From"
            />
            <span className="text-gray-400 text-sm self-center">to</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-auto"
              placeholder="To"
            />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={winnersOnly}
                onChange={(e) => setWinnersOnly(e.target.checked)}
                className="h-4 w-4"
              />
              {t("Winners only") || "Winners only"}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={groupByDraw}
                onChange={(e) => setGroupByDraw(e.target.checked)}
                className="h-4 w-4"
              />
              {t("Group by draw") || "Group by draw"}
            </label>
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
      ) : groupByDraw ? (
        <div className="space-y-3">
          {groupedByDraw.map((group) => {
            const totalBet = group.items.reduce((s, i) => s + (i.betAmount || 0), 0);
            const winCount = group.items.filter((i) => i.won).length;
            return (
              <Card key={group.key}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-semibold text-sm">
                          {DRAW_STATES[group.state] || group.state}
                          {group.drawTime && <span className="text-gray-500 font-normal ml-1 capitalize">· {group.drawTime}</span>}
                        </p>
                        <p className="text-xs text-gray-500">{group.drawDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {group.items.length} {t("tickets") || "tickets"}
                      </Badge>
                      {group.hasResults ? (
                        <Badge variant="success" className="text-xs">
                          {winCount} {t("winners") || "winners"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {t("pending") || "Pending"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 border-t pt-2">
                    <span>{t("totalBet") || "Total Bet"}: <strong>{formatCurrency(totalBet, currency)}</strong></span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => exportGroupCSV(group, false)}>
                        <Download className="h-3 w-3 mr-1" /> {t("preResultCsv") || "Pre-Result CSV"}
                      </Button>
                      {group.hasResults && (
                        <Button variant="outline" size="sm" onClick={() => exportGroupCSV(group, true)}>
                          <Download className="h-3 w-3 mr-1" /> {t("postResultCsv") || "With Winners CSV"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
