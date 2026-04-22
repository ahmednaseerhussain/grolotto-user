"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Wallet, DollarSign, Smartphone, HelpCircle, Loader2, Mail, AtSign
} from "lucide-react";
import { formatCurrency, getVendorBalanceClasses } from "@/lib/utils";
import toast from "react-hot-toast";

type PayoutMethod = "moncash" | "bank_transfer" | "zelle" | "cashapp" | "paypal";

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
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>("moncash");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankRoutingNumber, setBankRoutingNumber] = useState("");
  const [moncashPhone, setMoncashPhone] = useState("");
  const [zelleEmail, setZelleEmail] = useState("");
  const [zellePhone, setZellePhone] = useState("");
  const [cashappTag, setCashappTag] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  // Use vendor's operating currency — no toggle
  const vendorProfile = useAppStore((s) => s.vendorProfile);
  const withdrawalCurrency = (vendorProfile?.operatingCurrency || currency) as "HTG" | "USD";

  // Method options by currency: HTG → MonCash only; USD → Zelle / Cash App / PayPal / Bank
  const methodOptions: { value: PayoutMethod; label: string; icon: any; desc: string }[] =
    withdrawalCurrency === "HTG"
      ? [{ value: "moncash", label: "MonCash", icon: Smartphone, desc: "Fee: 2% | Min: 100 HTG" }]
      : [
        { value: "zelle", label: "Zelle", icon: Mail, desc: "Fee: 0% | Min: $10" },
        { value: "cashapp", label: "Cash App", icon: AtSign, desc: "Fee: 0% | Min: $10" },
        { value: "paypal", label: "PayPal", icon: DollarSign, desc: "Fee: 2% | Min: $10" },
        { value: "bank_transfer", label: "Bank Transfer", icon: Wallet, desc: "Fee: 1% | Min: $10" },
      ];

  // Reset method when currency-driven options change
  React.useEffect(() => {
    setMethod(methodOptions[0]?.value || "moncash");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawalCurrency]);

  const balance = vendorStats?.availableBalance || vendorStats?.balance || 0;
  const displayBalance = balance;
  const pendingAmount = payouts
    .filter((p: any) => p.status === "pending")
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amt > balance) {
      toast.error(t("insufficientBalance") || "Insufficient balance");
      return;
    }
    if (amt < 10) {
      toast.error(t("minimumAmount") || "Minimum withdrawal is 10");
      return;
    }
    if (!confirm(t("confirmWithdrawal") || `Are you sure you want to withdraw ${formatCurrency(amt, withdrawalCurrency)}?`)) return;

    // Validate method-specific fields
    if (method === "bank_transfer") {
      if (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim()) {
        toast.error("Please fill in all bank details");
        return;
      }
    } else if (method === "moncash") {
      if (!moncashPhone.trim()) {
        toast.error("Please enter your MonCash phone number");
        return;
      }
    } else if (method === "zelle") {
      if (!zelleEmail.trim() && !zellePhone.trim()) {
        toast.error("Please enter your Zelle email or phone");
        return;
      }
    } else if (method === "cashapp") {
      if (!cashappTag.trim()) {
        toast.error("Please enter your Cash App $cashtag");
        return;
      }
    } else if (method === "paypal") {
      if (!paypalEmail.trim()) {
        toast.error("Please enter your PayPal email");
        return;
      }
    }

    setProcessing(true);
    try {
      await vendorAPI.requestPayout({
        amount: amt,
        method,
        currency: withdrawalCurrency,
        bankName: method === "bank_transfer" ? bankName : undefined,
        bankAccountName: method === "bank_transfer" ? bankAccountName : undefined,
        bankAccountNumber: method === "bank_transfer" ? bankAccountNumber : undefined,
        bankRoutingNumber: method === "bank_transfer" ? bankRoutingNumber : undefined,
        moncashPhone: method === "moncash" ? moncashPhone : undefined,
        zelleEmail: method === "zelle" ? zelleEmail : undefined,
        zellePhone: method === "zelle" ? zellePhone : undefined,
        cashappTag: method === "cashapp" ? cashappTag : undefined,
        paypalEmail: method === "paypal" ? paypalEmail : undefined,
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
      <Card className={`${getVendorBalanceClasses(withdrawalCurrency).gradient} text-white border-0`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm opacity-80">{t("availableBalance") || "Available Balance"}</p>
            <Badge variant="outline" className="text-white border-white/30 text-xs">{withdrawalCurrency}</Badge>
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
              <div className="mt-1 space-y-2">
                {methodOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = method === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMethod(opt.value)}
                      className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <div className={`p-1.5 rounded ${selected ? "bg-blue-500" : "bg-gray-400"}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Method-specific fields */}
              {method === "bank_transfer" && (
                <div className="mt-3 space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800">Bank Details</h4>
                  <div>
                    <label className="text-xs text-gray-600">Bank Name</label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Sogebank, BNC, Unibank" className="mt-1" />
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

              {method === "moncash" && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="text-xs text-gray-600">MonCash Phone Number</label>
                  <Input value={moncashPhone} onChange={(e) => setMoncashPhone(e.target.value)} placeholder="e.g. +509 3456-7890" className="mt-1" />
                </div>
              )}

              {method === "zelle" && (
                <div className="mt-3 space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800">Zelle Details</h4>
                  <div>
                    <label className="text-xs text-gray-600">Email</label>
                    <Input type="email" value={zelleEmail} onChange={(e) => setZelleEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Or Phone Number</label>
                    <Input value={zellePhone} onChange={(e) => setZellePhone(e.target.value)} placeholder="+1 555-555-5555" className="mt-1" />
                  </div>
                </div>
              )}

              {method === "cashapp" && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="text-xs text-gray-600">Cash App $Cashtag</label>
                  <Input value={cashappTag} onChange={(e) => setCashappTag(e.target.value)} placeholder="$yourcashtag" className="mt-1" />
                </div>
              )}

              {method === "paypal" && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="text-xs text-gray-600">PayPal Email</label>
                  <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="your@paypal.com" className="mt-1" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmit} loading={processing}>
                {t("submitRequest") || "Submit Request"}
              </Button>
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>Cancel</Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              ℹ️ Withdrawal requests are reviewed by the admin. Once approved, the admin will process the transfer to your account.
            </p>
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
