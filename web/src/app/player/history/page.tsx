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
  ArrowLeft, Calendar, Filter, Download, Trophy, Clock, XCircle, FileText
} from "lucide-react";
import { formatCurrency, GAME_LABELS } from "@/lib/utils";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  won: "success",
  lost: "destructive",
  pending: "warning",
};

const GAME_COLORS: Record<string, string> = {
  senp: "bg-red-500",
  maryaj: "bg-emerald-500",
  loto3: "bg-blue-500",
  loto4: "bg-purple-500",
  loto5: "bg-amber-500",
};

const STATE_DRAWS = ["FL", "NY", "GA", "TX"];

export default function HistoryScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const tickets = useAppStore((s) => s.tickets);
  const setTickets = useAppStore((s) => s.setTickets);

  const [filter, setFilter] = useState<"all" | "won" | "lost" | "pending">("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [apiTickets, setApiTickets] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lotteryAPI.getMyTickets({ page: 1, limit: 100, status: filter === "all" ? undefined : filter });
      const data = (res as any)?.tickets || (Array.isArray(res) ? res : []);
      setApiTickets(data);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Normalize data
  const allTickets = apiTickets.length > 0
    ? apiTickets.map((t: any) => ({
        id: t.id,
        gameType: t.gameType,
        drawState: t.drawState || t.draw,
        numbers: t.numbers || [],
        betAmount: t.betAmount || t.amount,
        status: t.status,
        winAmount: t.winAmount || 0,
        vendorName: t.vendorName || t.vendor?.businessName || "Unknown",
        date: t.createdAt || t.timestamp,
        currency: t.currency,
      }))
    : (tickets || []).map((t: any) => ({
        id: t.id,
        gameType: t.gameType,
        drawState: t.drawState || t.draw,
        numbers: t.numbers || [],
        betAmount: t.betAmount || t.amount,
        status: t.status || "pending",
        winAmount: t.winAmount || 0,
        vendorName: t.vendorName || "Unknown",
        date: t.createdAt || t.timestamp,
        currency: t.currency,
      }));

  // Apply filters
  let filtered = allTickets;
  if (filter !== "all") {
    filtered = filtered.filter((t: any) => t.status === filter);
  }
  if (stateFilter !== "all") {
    filtered = filtered.filter((t: any) => t.drawState === stateFilter);
  }
  if (fromDate) {
    filtered = filtered.filter((t: any) => t.date && isAfter(new Date(t.date), startOfDay(new Date(fromDate))));
  }
  if (toDate) {
    filtered = filtered.filter((t: any) => t.date && isBefore(new Date(t.date), endOfDay(new Date(toDate))));
  }

  // Stats
  const totalBet = filtered.reduce((s: number, t: any) => s + (t.betAmount || 0), 0);
  const totalWon = filtered.filter((t: any) => t.status === "won").reduce((s: number, t: any) => s + (t.winAmount || 0), 0);
  const netResult = totalWon - totalBet;

  const getStateCounts = () => {
    const counts: Record<string, number> = {};
    allTickets.forEach((t: any) => {
      const st = t.drawState || "?";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  };
  const stateCounts = getStateCounts();

  const handleExportPDF = () => {
    // Dynamic import for client-side only
    import("jspdf").then(({ default: jsPDF }) => {
      import("jspdf-autotable").then(() => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("GROLOTTO - Game History", 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 30);
        doc.text(`Total Bet: ${formatCurrency(totalBet, currency)} | Total Won: ${formatCurrency(totalWon, currency)} | Net: ${formatCurrency(netResult, currency)}`, 14, 36);

        const rows = filtered.map((t: any) => [
          GAME_LABELS[t.gameType] || t.gameType,
          t.drawState,
          (t.numbers || []).join(", "),
          formatCurrency(t.betAmount, currency),
          t.status,
          t.status === "won" ? formatCurrency(t.winAmount, currency) : "-",
          t.date ? format(new Date(t.date), "PP") : "-",
        ]);

        (doc as any).autoTable({
          head: [["Game", "State", "Numbers", "Bet", "Status", "Won", "Date"]],
          body: rows,
          startY: 42,
        });
        doc.save("grolotto-history.pdf");
        toast("PDF downloaded!");
      });
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-emerald-700">GROLOTTO</h1>
            <p className="text-sm text-gray-600">{t("history") || "History"}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-blue-600">{t("totalBet") || "Total Bet"}</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalBet, currency)}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-600">{t("totalWon") || "Total Won"}</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalWon, currency)}</p>
          </CardContent>
        </Card>
        <Card className={`${netResult >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <CardContent className="p-3 text-center">
            <p className={`text-xs ${netResult >= 0 ? "text-emerald-600" : "text-red-600"}`}>Net Result</p>
            <p className={`text-lg font-bold ${netResult >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatCurrency(netResult, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="block border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="block border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
            <XCircle className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "won", "lost", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? (t("allGames") || "All Games") : t(f) || f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* State Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStateFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            stateFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          All
        </button>
        {STATE_DRAWS.map((st) => (
          <button
            key={st}
            onClick={() => setStateFilter(st)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              stateFilter === st ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {st} {stateCounts[st] ? `(${stateCounts[st]})` : ""}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12 text-gray-300" />}
          title="No games found"
          description="Start playing to see your history here"
          action={<Button onClick={() => router.push("/player/dashboard")}>Start Playing</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket: any) => (
            <Card key={ticket.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-full min-h-[40px] rounded-full ${GAME_COLORS[ticket.gameType] || "bg-gray-300"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{GAME_LABELS[ticket.gameType] || ticket.gameType}</span>
                        <Badge variant="outline" className="text-xs">{ticket.drawState}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{ticket.vendorName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ticket.date ? format(new Date(ticket.date), "PPp") : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1 mb-1 justify-end">
                      {(ticket.numbers || []).map((n: any, i: number) => (
                        <span key={i} className="w-7 h-7 flex items-center justify-center bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                          {n}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(ticket.betAmount, currency)}</p>
                    <Badge variant={STATUS_COLORS[ticket.status] as any || "secondary"} className="text-xs mt-1">
                      {ticket.status === "won" && <Trophy className="h-3 w-3 mr-1" />}
                      {ticket.status}
                    </Badge>
                    {ticket.status === "won" && ticket.winAmount > 0 && (
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        +{formatCurrency(ticket.winAmount, currency)}
                      </p>
                    )}
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
