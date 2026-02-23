"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { walletAPI } from "@/lib/api/wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, RotateCcw, Loader2, Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

const TX_ICONS: Record<string, { icon: any; color: string; sign: string }> = {
  deposit: { icon: ArrowDownCircle, color: "text-emerald-500 bg-emerald-50", sign: "+" },
  bet_payment: { icon: ArrowUpCircle, color: "text-red-500 bg-red-50", sign: "-" },
  winning_payout: { icon: ArrowDownCircle, color: "text-amber-500 bg-amber-50", sign: "+" },
  withdrawal: { icon: ArrowUpCircle, color: "text-purple-500 bg-purple-50", sign: "-" },
};

const TX_LABELS: Record<string, string> = {
  deposit: "Deposit",
  bet_payment: "Bet Payment",
  winning_payout: "Winning Payout",
  withdrawal: "Withdrawal",
};

export default function TransactionsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);

  const [filter, setFilter] = useState<string>("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletAPI.getTransactions({ page: 1, limit: 100, type: filter === "all" ? undefined : filter });
      setTransactions((res as any)?.transactions || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 1) return formatDistanceToNow(d, { addSuffix: true });
      if (diffHours < 24) return formatDistanceToNow(d, { addSuffix: true });
      return format(d, "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Transaction History</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "deposit", label: "Deposits" },
          { key: "bet_payment", label: "Bets" },
          { key: "winning_payout", label: "Winnings" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-12 w-12 text-gray-300" />}
          title="No transactions yet"
          description="Your transaction history will appear here"
        />
      ) : (
        <div className="space-y-2">
          {transactions.map((tx: any, idx: number) => {
            const type = tx.type || "deposit";
            const config = TX_ICONS[type] || TX_ICONS.deposit;
            const IconComp = config.icon;
            const amount = tx.amount || 0;
            const isPositive = config.sign === "+";
            return (
              <Card key={tx.id || idx} className="hover:shadow-sm transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-full ${config.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{TX_LABELS[type] || type}</p>
                    {tx.description && (
                      <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt || tx.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {config.sign}{formatCurrency(amount, currency)}
                    </p>
                    {tx.status && (
                      <Badge
                        variant={
                          tx.status === "completed" ? "success" :
                          tx.status === "pending" ? "warning" :
                          "destructive"
                        }
                        className="text-xs mt-1"
                      >
                        {tx.status}
                      </Badge>
                    )}
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
