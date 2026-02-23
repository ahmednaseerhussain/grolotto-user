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
  ArrowLeft, Loader2, Clock, CheckCircle, DollarSign,
  Ticket, Trophy, Percent, ChevronRight, X
} from "lucide-react";
import { formatCurrency, GAME_LABELS, DRAW_STATES } from "@/lib/utils";
import toast from "react-hot-toast";

interface Round {
  id: string;
  state: string;
  drawDate: string;
  status: string;
  totalBets?: number;
  totalAmount?: number;
  totalWinners?: number;
  totalPaid?: number;
  commission?: number;
}

interface RoundDetail {
  round: Round;
  tickets: Array<{
    id: string;
    playerName?: string;
    gameType: string;
    numbers: string;
    betAmount: number;
    won?: boolean;
    winAmount?: number;
  }>;
}

export default function VendorResultsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);

  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "completed">("open");
  const [selectedRound, setSelectedRound] = useState<RoundDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchRounds();
  }, []);

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const res = await vendorAPI.getMyRounds();
      const data = Array.isArray(res) ? res : (res as any)?.rounds || (res as any)?.data?.rounds || (res as any)?.data || [];
      setRounds(data);
    } catch {
      toast.error("Failed to load rounds");
    } finally {
      setLoading(false);
    }
  };

  const openRounds = useMemo(
    () => rounds.filter((r) => r.status === "open" || r.status === "active"),
    [rounds]
  );
  const completedRounds = useMemo(
    () => rounds.filter((r) => r.status === "completed" || r.status === "closed"),
    [rounds]
  );
  const displayed = activeTab === "open" ? openRounds : completedRounds;

  const handleViewDetail = async (round: Round) => {
    setLoadingDetail(true);
    try {
      const res = await vendorAPI.getMyRoundDetails(round.id);
      setSelectedRound((res as any)?.data || res || { round, tickets: [] });
    } catch {
      toast.error("Failed to load round details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const gameColors: Record<string, string> = {
    senp: "bg-blue-100 text-blue-700",
    maryaj: "bg-purple-100 text-purple-700",
    loto3: "bg-green-100 text-green-700",
    loto4: "bg-orange-100 text-orange-700",
    loto5: "bg-red-100 text-red-700",
  };

  // Detail view
  if (selectedRound) {
    const d = selectedRound.round || selectedRound;
    const tickets = selectedRound.tickets || [];
    const byGame: Record<string, typeof tickets> = {};
    tickets.forEach((tk) => {
      const g = tk.gameType || "other";
      if (!byGame[g]) byGame[g] = [];
      byGame[g].push(tk);
    });
    const totalBets = tickets.reduce((s, t) => s + (t.betAmount || 0), 0);
    const totalPaid = tickets.filter((t) => t.won).reduce((s, t) => s + (t.winAmount || 0), 0);
    const commission = totalBets * 0.1;
    const netProfit = totalBets - totalPaid - commission;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedRound(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{DRAW_STATES[(d as any).state] || (d as any).state || "Round"} Draw</h1>
            <p className="text-sm text-gray-500">
              {(d as any).drawDate ? new Date((d as any).drawDate).toLocaleDateString() : ""}
            </p>
          </div>
          <Badge variant={(d as any).status === "completed" ? "secondary" : "success"}>
            {(d as any).status}
          </Badge>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title={t("totalBets") || "Bets"} value={formatCurrency(totalBets, currency)} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title={t("totalPaid") || "Paid"} value={formatCurrency(totalPaid, currency)} icon={<Trophy className="h-5 w-5" />} />
          <StatCard title={t("commission") || "Commission (10%)"} value={formatCurrency(commission, currency)} icon={<Percent className="h-5 w-5" />} />
          <StatCard
            title={t("netProfit") || "Net Profit"}
            value={formatCurrency(netProfit, currency)}
            icon={<DollarSign className="h-5 w-5" />}
            trend={netProfit >= 0 ? "up" : "down"}
          />
        </div>

        {/* Tickets by game */}
        {Object.entries(byGame).map(([game, gameTickets]) => (
          <Card key={game}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm px-2 py-0.5 rounded font-medium ${gameColors[game] || "bg-gray-100 text-gray-700"}`}>
                  {GAME_LABELS[game] || game}
                </span>
                <span className="text-sm text-gray-500">{gameTickets.length} tickets</span>
              </div>
              <div className="space-y-1.5">
                {gameTickets.map((tk) => (
                  <div key={tk.id} className={`flex items-center justify-between p-2 rounded ${tk.won ? "bg-yellow-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tk.playerName || "Player"}</span>
                      <span className="text-xs font-mono bg-white px-2 py-0.5 rounded">{tk.numbers}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm">{formatCurrency(tk.betAmount, currency)}</span>
                      {tk.won && (
                        <span className="text-xs text-yellow-600 ml-2">🏆 {formatCurrency(tk.winAmount || 0, currency)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {tickets.length === 0 && (
          <EmptyState icon={<Ticket className="h-10 w-10" />} title="No tickets" description="No tickets for this round" />
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
        <h1 className="text-xl font-bold">{t("resultPublishing") || "Results & Rounds"}</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title={t("openRounds") || "Open Rounds"} value={openRounds.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title={t("completedRounds") || "Completed"} value={completedRounds.length} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(["open", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "open" ? (t("open") || "Open") : (t("completed") || "Completed")}
            <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
              {tab === "open" ? openRounds.length : completedRounds.length}
            </span>
          </button>
        ))}
      </div>

      {/* Round Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title={activeTab === "open" ? (t("noOpenRounds") || "No open rounds") : (t("noCompleted") || "No completed rounds")}
          description={t("roundsAppearHere") || "Rounds will appear here as draws occur."}
        />
      ) : (
        <div className="space-y-2">
          {displayed.map((round) => (
            <Card
              key={round.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewDetail(round)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{DRAW_STATES[round.state] || round.state}</h3>
                      <Badge variant={round.status === "open" || round.status === "active" ? "success" : "secondary"}>
                        {round.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {round.drawDate ? new Date(round.drawDate).toLocaleDateString() : ""}
                    </p>
                    {(round.totalBets !== undefined || round.totalAmount !== undefined) && (
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        {round.totalBets !== undefined && <span>{round.totalBets} bets</span>}
                        {round.totalAmount !== undefined && <span>{formatCurrency(round.totalAmount, currency)}</span>}
                        {round.totalWinners !== undefined && <span>{round.totalWinners} winners</span>}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="p-6">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading details...</p>
          </Card>
        </div>
      )}
    </div>
  );
}
