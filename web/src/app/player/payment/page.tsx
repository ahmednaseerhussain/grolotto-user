"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { paymentAPI } from "@/lib/api/payment";
import { walletAPI } from "@/lib/api/wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Wallet, CheckCircle, Smartphone, DollarSign, Loader2, CreditCard, Globe, Gift, Ticket
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
  const [selectedMethod, setSelectedMethod] = useState<string | null>("moncash");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const balance = currency === "HTG"
    ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
    : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

  const canProceed = parseFloat(amount) > 0 && (
    (selectedMethod === "moncash" && phoneNumber.length >= 8) ||
    (selectedMethod === "paypal")
  );

  const handlePayment = async () => {
    if (!canProceed) return;
    setProcessing(true);
    try {
      if (selectedMethod === "paypal") {
        // PayPal: create order then redirect to PayPal approval page
        const ppRes = await paymentAPI.createPayPalOrder({ amount: parseFloat(amount), currency: 'USD' });
        if (ppRes?.approveUrl && ppRes?.orderId) {
          // Open PayPal in new window
          const ppWindow = window.open(ppRes.approveUrl, "_blank", "width=600,height=700");

          toast("Complete payment on PayPal...", { duration: 5000 });

          // Poll for capture / completion
          let captured = false;
          for (let attempt = 0; attempt < 24; attempt++) {
            await new Promise((r) => setTimeout(r, 5000));
            try {
              const capRes = await paymentAPI.capturePayPalOrder(ppRes.orderId);
              if (capRes?.status === 'COMPLETED' || capRes?.status === 'credited' || capRes?.status === 'already_processed') {
                captured = true;
                break;
              }
            } catch {
              // Continue polling — order may not be approved yet
            }
          }

          if (captured) {
            try {
              const walletRes = await walletAPI.getBalance();
              setWallet(walletRes || null);
            } catch {}
            setShowSuccess(true);
            setTimeout(() => {
              setShowSuccess(false);
              router.push("/player/dashboard");
            }, 3000);
          } else {
            toast.error("PayPal payment verification timed out. Please check your balance.");
          }
        } else {
          toast.error("Failed to create PayPal order. Please try again.");
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
          } catch {}
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-slate-900 rounded-2xl p-8">
        <div className="bg-green-500 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Success!</h2>
        <p className="text-lg text-slate-300">
          {formatCurrency(parseFloat(amount), currency)} has been added to your wallet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto bg-slate-900 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-slate-100">Make Payment</h1>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6">
        <p className="text-slate-200 text-sm mb-2">Current Balance</p>
        <p className="text-white text-4xl font-bold">{formatCurrency(balance, currency)}</p>
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-semibold text-slate-300 block mb-3">Enter Amount</label>
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl border-2 border-slate-700 px-4 py-4">
          <span className="text-2xl text-slate-400">{currency === "HTG" ? "G" : "$"}</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-white text-2xl font-semibold outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="flex flex-wrap gap-2">
        {(currency === "HTG" ? QUICK_AMOUNTS_HTG : QUICK_AMOUNTS_USD).map((qa) => (
          <button
            key={qa}
            onClick={() => setAmount(String(qa))}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              amount === String(qa)
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
            }`}
          >
            {formatCurrency(qa, currency)}
          </button>
        ))}
      </div>

      {/* Payment Method */}
      <div>
        <label className="text-sm font-semibold text-slate-300 block mb-3">Select Payment Method</label>
        <div className="space-y-3">
          {/* MonCash */}
          <button
            onClick={() => setSelectedMethod("moncash")}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all bg-slate-800 ${
              selectedMethod === "moncash"
                ? "border-blue-500"
                : "border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="bg-red-500 w-12 h-12 rounded-full flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-white">MonCash</p>
              <p className="text-sm text-slate-400">Digicel mobile money</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedMethod === "moncash" ? "border-blue-500" : "border-slate-600"
            }`}>
              {selectedMethod === "moncash" && <div className="w-3 h-3 rounded-full bg-blue-500" />}
            </div>
          </button>

          {/* PayPal */}
          <button
            onClick={() => setSelectedMethod("paypal")}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all bg-slate-800 ${
              selectedMethod === "paypal"
                ? "border-blue-500"
                : "border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-white">{t("paypal") || "PayPal"}</p>
              <p className="text-sm text-slate-400">Pay with PayPal account</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedMethod === "paypal" ? "border-blue-500" : "border-slate-600"
            }`}>
              {selectedMethod === "paypal" && <div className="w-3 h-3 rounded-full bg-blue-500" />}
            </div>
          </button>

          {/* Credit/Debit Card - Coming Soon */}
          <button
            onClick={() => toast(t("comingSoon") || "Coming Soon")}
            className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-800 flex items-center gap-4 opacity-50 cursor-not-allowed"
          >
            <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-white">{t("creditDebitCard") || "Credit/Debit Card"}</p>
              <p className="text-sm text-slate-400">Visa, Mastercard, etc.</p>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-medium">
              {t("comingSoon") || "Coming Soon"}
            </span>
          </button>

          {/* Gift Card */}
          <div className="w-full p-4 rounded-xl border-2 border-slate-700 bg-slate-800">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500 w-12 h-12 rounded-full flex items-center justify-center">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-white">{t("giftCard") || "Gift Card"}</p>
                <p className="text-sm text-slate-400">{t("buyOrRedeemGiftCards") || "Buy or redeem gift cards"}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => router.push("/player/gift-cards")}
                className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                🎁 {t("buyGiftCard") || "Buy Gift Card"}
              </button>
              <button
                onClick={() => router.push("/player/gift-cards?tab=redeem")}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
              >
                🎟️ {t("redeemCode") || "Redeem Code"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Number */}
      {selectedMethod === "moncash" && (
        <div>
          <label className="text-sm font-semibold text-slate-300 block mb-3">MonCash Phone Number</label>
          <div className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-4">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+509 1234 5678"
              className="w-full bg-transparent text-white text-base outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {parseFloat(amount) > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-sm text-slate-400 mb-3">Payment Summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Amount</span>
            <span className="font-semibold text-white">{formatCurrency(parseFloat(amount), currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Processing Fee</span>
            <span className="font-semibold text-white">{formatCurrency(0, currency)}</span>
          </div>
          <div className="border-t border-slate-700 my-2"></div>
          <div className="flex justify-between">
            <span className="font-bold text-white">Total</span>
            <span className="font-bold text-lg text-green-400">{formatCurrency(parseFloat(amount), currency)}</span>
          </div>
        </div>
      )}

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={!canProceed || processing}
        className={`w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-lg text-white transition-colors ${
          canProceed && !processing ? "bg-green-600 hover:bg-green-700" : "bg-slate-700 cursor-not-allowed"
        }`}
      >
        {processing ? "Processing..." : `🔒 Pay ${amount ? formatCurrency(parseFloat(amount), currency) : ""}`}
      </button>
    </div>
  );
}
