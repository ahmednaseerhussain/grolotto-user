"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { paymentAPI } from "@/lib/api/payment";
import { paymentOrderAPI } from "@/lib/api/gift-cards";
import { walletAPI } from "@/lib/api/wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Wallet, CheckCircle, Smartphone, DollarSign, Loader2, CreditCard, Gift, Ticket, Mail, Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const QUICK_AMOUNTS_HTG = [500, 1000, 2000, 10000, 50000, 100000];
const QUICK_AMOUNTS_USD = [5, 10, 15, 100, 350, 700];

export default function PaymentScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillAmount = searchParams.get("amount");
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const wallet = useAppStore((s) => s.wallet);
  const setWallet = useAppStore((s) => s.setWallet);

  const [amount, setAmount] = useState(prefillAmount || "");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(currency === "HTG" ? "moncash" : null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<Record<string, string>>({});
  const [depositStep, setDepositStep] = useState<"select" | "instructions" | "pending">("select");

  // Load payment config for Zelle/CashApp
  useEffect(() => {
    paymentOrderAPI.getPaymentConfig().then(setPaymentConfig).catch(() => { });
  }, []);

  const balance = currency === "HTG"
    ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
    : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

  const canProceed = parseFloat(amount) > 0 && (
    (selectedMethod === "moncash" && phoneNumber.length >= 8) ||
    (selectedMethod === "zelle") ||
    (selectedMethod === "cashapp") ||
    (selectedMethod === "stripe")
  );

  const handlePayment = async () => {
    if (!canProceed) return;
    setProcessing(true);
    try {
      if (selectedMethod === "zelle" || selectedMethod === "cashapp") {
        // Manual payment: create order then show instructions
        await paymentOrderAPI.createOrder({
          amount: parseFloat(amount),
          currency: 'USD',
          paymentMethod: selectedMethod,
        });
        setDepositStep("pending");
        setProcessing(false);
        return;
      }

      if (selectedMethod === "stripe") {
        // Stripe: create intent, open checkout, confirm
        const intent = await paymentOrderAPI.createStripeIntent({
          amount: parseFloat(amount),
          currency: 'USD',
        });
        toast.success("Complete payment in the Stripe popup.");
        const confirmed = await paymentOrderAPI.confirmStripePayment(intent.paymentIntentId);
        if (confirmed.success) {
          try { const w = await walletAPI.getBalance(); if (w) setWallet(w); } catch { }
          setShowSuccess(true);
          setTimeout(() => { setShowSuccess(false); router.push("/player/dashboard"); }, 3000);
        } else {
          toast.error("Stripe payment could not be verified.");
        }
        setProcessing(false);
        return;
      }

      // MonCash flow
      const res = await paymentAPI.createPaymentIntent({ amount: parseFloat(amount), currency, phoneNumber });
      const { paymentUrl, orderId } = res || {};

      if (paymentUrl) {
        // Open MonCash in new window
        const paymentWindow = window.open(paymentUrl, "_blank", "width=600,height=700");

        // Poll for completion
        toast("Completing payment in MonCash...", { duration: 5000 });

        let verified = false;
        for (let attempt = 0; attempt < 12; attempt++) {
          await new Promise((r) => setTimeout(r, 5000));
          if (paymentWindow?.closed) {
            // User closed window — check one last time then stop
            try {
              const verifyRes = await paymentAPI.verifyPayment(orderId!);
              const status = verifyRes?.status;
              if (status === "credited" || status === "already_processed" || status === "completed") {
                verified = true;
              }
            } catch { }
            break;
          }
          try {
            const verifyRes = await paymentAPI.verifyPayment(orderId!);
            const status = verifyRes?.status;
            if (status === "credited" || status === "already_processed" || status === "completed") {
              verified = true;
              break;
            }
          } catch {
            // Continue polling
          }
        }

        if (verified) {
          // Refresh wallet
          try {
            const walletRes = await walletAPI.getBalance();
            setWallet(walletRes || null);
          } catch { }
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            router.push("/player/dashboard");
          }, 3000);
        } else {
          toast.error("Payment verification timed out. Please check your balance.");
        }
      } else {
        toast.error("Failed to create payment. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white rounded-2xl p-8 border border-gray-200">
        <div className="bg-green-500 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Success!</h2>
        <p className="text-lg text-gray-600">
          {formatCurrency(parseFloat(amount), currency)} has been added to your wallet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Make Payment</h1>
      </div>

      {/* Current Balance */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-6">
        <p className="text-blue-100 text-sm mb-2">Current Balance</p>
        <p className="text-white text-4xl font-bold">{formatCurrency(balance, currency)}</p>
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-3">Enter Amount</label>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-4">
          <span className="text-2xl text-gray-400">{currency === "HTG" ? "G" : "$"}</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-gray-900 text-2xl font-semibold outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="flex flex-wrap gap-2">
        {(currency === "HTG" ? QUICK_AMOUNTS_HTG : QUICK_AMOUNTS_USD).map((qa) => (
          <button
            key={qa}
            onClick={() => setAmount(String(qa))}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${amount === String(qa)
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
          >
            {formatCurrency(qa, currency)}
          </button>
        ))}
      </div>

      {/* Payment Method */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-3">Select Payment Method</label>
        <div>
          <select
            value={selectedMethod ?? ""}
            onChange={(e) => setSelectedMethod(e.target.value || null)}
            className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white"
          >
            {currency === "HTG" && <option value="moncash">MonCash (Digicel mobile money)</option>}
            <option value="zelle">Zelle (Send payment & email screenshot)</option>
            <option value="cashapp">CashApp (Send payment & email screenshot)</option>
            <option value="stripe">Credit / Debit Card (Stripe)</option>
            <option value="wallet">Wallet</option>
            <option value="system">System</option>
            <option value="gift_card">Gift Card</option>
            <option value="reward">Reward</option>
          </select>

          {/* Contextual actions for special methods */}
          {selectedMethod === "gift_card" && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => router.push("/player/gift-cards")}
                className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                🎁 {t("buyGiftCard") || "Buy Gift Card"}
              </button>
              <button
                onClick={() => router.push("/player/gift-cards?tab=redeem")}
                className="flex-1 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
              >
                🎟️ {t("redeemCode") || "Redeem Code"}
              </button>
            </div>
          )}

          {selectedMethod === "wallet" && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Wallet balance</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(balance, currency)}</p>
              <div className="mt-3">
                <button
                  onClick={async () => {
                    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter an amount"); return; }
                    setProcessing(true);
                    try {
                      const bal = currency === "HTG" ? (wallet?.balanceHtg ?? wallet?.balance ?? 0) : (wallet?.balanceUsd ?? wallet?.balance ?? 0);
                      if (parseFloat(amount) > bal) { toast.error("Insufficient wallet balance"); setProcessing(false); return; }
                      // Optimistically refresh wallet and show success
                      try { const w = await walletAPI.getBalance(); if (w) setWallet(w); } catch { }
                      setShowSuccess(true);
                      setTimeout(() => { setShowSuccess(false); router.push("/player/dashboard"); }, 2000);
                    } catch (err) {
                      toast.error("Wallet payment failed");
                    } finally { setProcessing(false); }
                  }}
                  className="mt-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
                >
                  Pay with Wallet
                </button>
              </div>
            </div>
          )}

          {selectedMethod === "system" && (
            <div className="mt-4 text-sm text-gray-600">System payments are for internal use only.</div>
          )}

          {selectedMethod === "reward" && (
            <div className="mt-4 text-sm text-gray-600">Reward payments use promotional credits. Contact support to apply.</div>
          )}
        </div>
      </div>

      {/* Phone Number */}
      {selectedMethod === "moncash" && (
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-3">MonCash Phone Number</label>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-4">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+509 1234 5678"
              className="w-full bg-transparent text-gray-900 text-base outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      {/* Zelle / CashApp Instructions */}
      {(selectedMethod === "zelle" || selectedMethod === "cashapp") && depositStep === "select" && (
        <div className="bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-200">
          <h4 className="font-semibold text-gray-900">How it works</h4>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</div>
            <p className="text-sm text-gray-600">
              Send <span className="font-semibold text-gray-900">{amount ? formatCurrency(parseFloat(amount), currency) : "your amount"}</span> via {selectedMethod === "zelle" ? "Zelle" : "CashApp"} to{" "}
              <span className="font-mono text-amber-600">
                {selectedMethod === "zelle" ? (paymentConfig.zelle_email || "payments@grolotto.com") : (paymentConfig.cashapp_tag || "$GroLotto")}
              </span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</div>
            <p className="text-sm text-gray-600">Take a screenshot of the payment confirmation</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</div>
            <p className="text-sm text-gray-600">Email the screenshot to <span className="font-mono text-amber-600">{paymentConfig.zelle_email || "payments@grolotto.com"}</span> with your GroLotto username</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">4</div>
            <p className="text-sm text-gray-600">Click the Pay button below — we&apos;ll verify and credit your wallet</p>
          </div>
        </div>
      )}

      {/* Pending Verification Screen */}
      {depositStep === "pending" && (
        <div className="text-center py-8 space-y-4 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Payment Under Review</h3>
          <p className="text-gray-600">
            We&apos;ve received your {selectedMethod === "zelle" ? "Zelle" : "CashApp"} deposit notification.
            Our team will verify your payment and credit your wallet within a few hours.
          </p>
          <p className="text-gray-500 text-sm">
            Make sure you&apos;ve emailed your screenshot to{" "}
            <span className="text-amber-600 font-medium">{paymentConfig.zelle_email || "payments@grolotto.com"}</span>
          </p>
          <button
            onClick={() => { setDepositStep("select"); setSelectedMethod(null); setAmount(""); }}
            className="mt-4 px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
          >
            Back to Deposit
          </button>
        </div>
      )}

      {/* Summary */}
      {parseFloat(amount) > 0 && depositStep === "select" && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
          <p className="text-sm text-gray-500 mb-3">Payment Summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount</span>
            <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(amount), currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Processing Fee</span>
            <span className="font-semibold text-gray-900">{formatCurrency(0, currency)}</span>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-lg text-green-600">{formatCurrency(parseFloat(amount), currency)}</span>
          </div>
        </div>
      )}

      {/* Pay Button */}
      {depositStep === "select" && (
        <button
          onClick={handlePayment}
          disabled={!canProceed || processing}
          className={`w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-lg text-white transition-colors ${canProceed && !processing ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          {processing ? "Processing..." : `🔒 Pay ${amount ? formatCurrency(parseFloat(amount), currency) : ""}`}
        </button>
      )}
    </div>
  );
}
