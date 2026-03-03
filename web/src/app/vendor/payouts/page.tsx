"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Wallet, DollarSign, Smartphone, HelpCircle, Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PayoutsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const vendorStats = useAppStore((s) => s.vendorStats);
  const payouts = useAppStore((s) => s.payouts);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>("moncash");
  const [withdrawalCurrency, setWithdrawalCurrency] = useState<"HTG" | "USD">(currency as any);
  const [processing, setProcessing] = useState(false);
  const [moncashPhone, setMoncashPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankRoutingNumber, setBankRoutingNumber] = useState("");

  const balance = vendorStats?.balance || 0;
  const displayBalance = withdrawalCurrency === "HTG" ? balance * 150 : balance;
  const pendingAmount = payouts
    .filter((p: any) => p.status === "pending")
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const amtInUsd = withdrawalCurrency === "HTG" ? amt / 150 : amt;
    if (amtInUsd > balance) {
      toast.error(t("insufficientBalance") || "Insufficient balance");
      return;
    }
    if (amtInUsd < 10) {
      toast.error(t("minimumAmount") || "Minimum withdrawal is $10");
      return;
    }
    setProcessing(true);
    try {
      await vendorAPI.requestPayout({
        amount: amt,
        method: selectedMethod || "moncash",
        currency: withdrawalCurrency,
        ...(selectedMethod === "bank_transfer" && {
          bankName,
          bankAccountName,
          bankAccountNumber,
          bankRoutingNumber,
        }),
        ...(selectedMethod === "moncash" && { moncashPhone }),
      });
      toast.success(t("withdrawalSubmitted") || "Withdrawal request submitted!");
      setShowRequestForm(false);
      setAmount("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit withdrawal");
    } finally {
      setProcessing(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "warning",
    approved: "success",
    rejected: "destructive",
    paid: "secondary",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t("withdrawals") || "Withdrawals"}</h1>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm opacity-80">{t("availableBalance") || "Available Balance"}</p>
            <div className="flex gap-1">
              {(["HTG", "USD"] as const).map((cur) => (
                <button
                  key={cur}
                  onClick={() => setWithdrawalCurrency(cur)}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    withdrawalCurrency === cur ? "bg-white/30" : "bg-white/10"
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(displayBalance, withdrawalCurrency)}</p>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-xs opacity-60">{t("pendingAmount") || "Pending"}</p>
              <p className="font-semibold">{formatCurrency(pendingAmount, withdrawalCurrency)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">{t("totalEarned") || "Total Earned"}</p>
              <p className="font-semibold">{formatCurrency(vendorStats?.totalEarnings || 0, withdrawalCurrency)}</p>
            </div>
          </div>
          {!showRequestForm && (
            <Button
              className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setShowRequestForm(true)}
            >
              {t("requestWithdrawal") || "Request Withdrawal"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Request Form */}
      {showRequestForm && (
        <Card className="border-emerald-200">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold">{t("newWithdrawal") || "New Withdrawal"}</h3>
            <div>
              <label className="text-sm text-gray-600">{t("amountToWithdraw") || "Amount"}</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500 font-medium">{withdrawalCurrency === "HTG" ? "G" : "$"}</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Available: {formatCurrency(displayBalance, withdrawalCurrency)}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600">{t("paymentMethod") || "Payment Method"}</label>
              {withdrawalCurrency === "HTG" ? (
                <button
                  onClick={() => setSelectedMethod("moncash")}
                  className={`w-full mt-1 p-3 rounded-lg border-2 flex items-center gap-3 ${
                    selectedMethod === "moncash" ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                >
                  <div className="bg-red-500 p-1.5 rounded">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm">MonCash</p>
                    <p className="text-xs text-gray-500">{t("fees") || "Fee"}: 2% | {t("minimum") || "Min"}: $10</p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setSelectedMethod("bank_transfer")}
                  className={`w-full mt-1 p-3 rounded-lg border-2 flex items-center gap-3 ${
                    selectedMethod === "bank_transfer" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <div className="bg-blue-500 p-1.5 rounded">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm">Bank Transfer</p>
                    <p className="text-xs text-gray-500">{t("fees") || "Fee"}: 1% | {t("minimum") || "Min"}: $10</p>
                  </div>
                </button>
              )}

              {/* Bank Details Fields */}
              {selectedMethod === "bank_transfer" && withdrawalCurrency === "USD" && (
                <div className="mt-3 space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800">Bank Details</h4>
                  <div>
                    <label className="text-xs text-gray-600">Bank Name</label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Bank of America" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Account Holder Name</label>
                    <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Full name on account" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Account Number</label>
                    <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Account number" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Routing Number</label>
                    <Input value={bankRoutingNumber} onChange={(e) => setBankRoutingNumber(e.target.value)} placeholder="Routing number" className="mt-1" />
                  </div>
                </div>
              )}

              {/* MonCash Phone */}
              {selectedMethod === "moncash" && withdrawalCurrency === "HTG" && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <label className="text-xs text-gray-600">MonCash Phone Number</label>
                  <Input value={moncashPhone} onChange={(e) => setMoncashPhone(e.target.value)} placeholder="+509 XXXX XXXX" className="mt-1" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmit} loading={processing}>
                {t("submitRequest") || "Submit Request"}
              </Button>
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("withdrawalHistory") || "Withdrawal History"}</h2>
        {payouts.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-6 text-center text-gray-400">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t("noWithdrawals") || "No withdrawals yet"}</p>
              <p className="text-xs">{t("withdrawalRequestsAppearHere") || "Your withdrawal requests will appear here"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout: any) => (
              <Card key={payout.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{formatCurrency(payout.amount, payout.currency || currency)}</p>
                    <p className="text-xs text-gray-500">
                      {payout.method || "MonCash"} • {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString() : ""}
                    </p>
                    {payout.notes && <p className="text-xs text-gray-400 mt-0.5">{payout.notes}</p>}
                  </div>
                  <Badge variant={statusColors[payout.status] as any || "secondary"}>
                    {payout.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800">{t("helpAndFAQ") || "Help & FAQ"}</h4>
              <p className="text-xs text-blue-700 mt-1">
                {t("helpWithdrawalText") || "Withdrawals are processed within 24 hours. MonCash withdrawals incur a 2% fee. Minimum withdrawal is $10 USD."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
