"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { giftCardAPI, paymentOrderAPI, type GiftCard } from "@/lib/api/gift-cards";
import { walletAPI } from "@/lib/api/wallet";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Gift, Ticket, CheckCircle, Copy, Share2, Loader2,
  CreditCard, Wallet, Mail, DollarSign, Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const GIFT_AMOUNTS_HTG = [500, 1000, 2000, 5000, 10000];
const GIFT_AMOUNTS_USD = [5, 10, 25, 50, 100];

type PaymentMethod = "wallet" | "zelle" | "cashapp" | "stripe";
type BuyStep = "amount" | "payment" | "instructions" | "pending";

export default function GiftCardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "redeem" ? "redeem" : "buy";
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const wallet = useAppStore((s) => s.wallet);
  const setWallet = useAppStore((s) => s.setWallet);

  const [activeTab, setActiveTab] = useState<"buy" | "redeem" | "history">(initialTab as any);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<GiftCard | null>(null);
  const [redeemResult, setRedeemResult] = useState<{ amount: number; currency: "HTG" | "USD" } | null>(null);
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Payment flow state
  const [buyStep, setBuyStep] = useState<BuyStep>("amount");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<Record<string, string>>({});

  const balance = currency === "HTG"
    ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
    : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

  useEffect(() => {
    if (activeTab === "history") {
      loadMyCards();
    }
  }, [activeTab]);

  // Load payment config for Zelle/CashApp
  useEffect(() => {
    paymentOrderAPI.getPaymentConfig().then(setPaymentConfig).catch(() => { });
  }, []);

  const loadMyCards = async () => {
    setLoadingCards(true);
    try {
      const cards = await giftCardAPI.getMyCards();
      setMyCards(cards);
    } catch {
      toast.error("Failed to load gift cards");
    } finally {
      setLoadingCards(false);
    }
  };

  const handlePurchaseWithWallet = async () => {
    if (!selectedAmount) return;
    if (selectedAmount > balance) {
      toast.error(t("insufficientBalance") || "Insufficient balance");
      return;
    }
    setProcessing(true);
    try {
      const card = await giftCardAPI.purchase({
        amount: selectedAmount,
        currency,
        recipientName: recipientName || undefined,
        message: giftMessage || undefined,
      });
      setPurchasedCard(card);
      try {
        const w = await walletAPI.getBalance();
        if (w) setWallet(w);
      } catch { }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to purchase gift card");
    } finally {
      setProcessing(false);
    }
  };

  const handleManualPayment = async (method: "zelle" | "cashapp") => {
    if (!selectedAmount) return;
    setProcessing(true);
    try {
      await paymentOrderAPI.createOrder({
        amount: selectedAmount,
        currency,
        paymentMethod: method,
        giftCardAmount: selectedAmount,
      });
      setBuyStep("pending");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create payment order");
    } finally {
      setProcessing(false);
    }
  };

  const handleStripePayment = async () => {
    if (!selectedAmount) return;
    setProcessing(true);
    try {
      const intent = await paymentOrderAPI.createStripeIntent({
        amount: selectedAmount,
        currency,
        giftCardAmount: selectedAmount,
      });
      // For now, redirect to a Stripe-hosted payment page
      // In production, use Stripe Elements embedded form
      toast.success("Stripe payment created! Complete payment in the popup.");
      // After payment, confirm:
      const confirmed = await paymentOrderAPI.confirmStripePayment(intent.paymentIntentId);
      if (confirmed.success) {
        toast.success(`$${confirmed.amount} ${confirmed.currency} added to your wallet!`);
        try { const w = await walletAPI.getBalance(); if (w) setWallet(w); } catch { }
        resetBuyFlow();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Stripe payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const resetBuyFlow = () => {
    setBuyStep("amount");
    setPaymentMethod(null);
    setSelectedAmount(null);
    setRecipientName("");
    setGiftMessage("");
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast.error("Please enter a gift card code");
      return;
    }
    setProcessing(true);
    try {
      const result = await giftCardAPI.redeem(redeemCode.trim());
      setRedeemResult(result);
      // Refresh wallet
      try {
        const w = await walletAPI.getBalance();
        if (w) setWallet(w);
      } catch { }
    } catch (err: any) {
      const errorCode = err?.response?.data?.code;
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message;
      if (errorCode === "INVALID_CODE") toast.error("Invalid gift card code. Please check and try again.");
      else if (errorCode === "ALREADY_REDEEMED") toast.error("This gift card has already been redeemed.");
      else if (errorCode === "EXPIRED") toast.error("This gift card has expired.");
      else if (errorCode === "SELF_REDEEM") toast.error("You cannot redeem your own gift card.");
      else toast.error(errorMsg || "Failed to redeem gift card");
    } finally {
      setProcessing(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const shareCode = (code: string, amount: number, cur: string) => {
    if (navigator.share) {
      navigator.share({
        title: "GroLotto Gift Card",
        text: `🎁 I'm sending you a GroLotto gift card worth ${amount} ${cur}! Redeem code: ${code}`,
      });
    } else {
      copyCode(code);
      toast.success("Code copied! Share it with your friend.");
    }
  };

  // Success screen for purchase
  if (purchasedCard) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto bg-slate-900 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="bg-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Gift Card Purchased!</h2>
          <p className="text-slate-400">Share this code with your friend</p>
        </div>

        <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-center">
          <Gift className="h-10 w-10 text-white mx-auto mb-3" />
          <p className="text-white/80 text-sm mb-1">Gift Card Value</p>
          <p className="text-white text-3xl font-bold mb-4">
            {formatCurrency(purchasedCard.amount, purchasedCard.currency)}
          </p>
          <div className="bg-white/20 rounded-xl p-4 mb-4">
            <p className="text-white/70 text-xs mb-1">CODE</p>
            <p className="text-white text-2xl font-mono font-bold tracking-widest">{purchasedCard.code}</p>
          </div>
          {purchasedCard.recipientName && (
            <p className="text-white/80 text-sm">For: {purchasedCard.recipientName}</p>
          )}
          {purchasedCard.message && (
            <p className="text-white/70 text-sm italic mt-1">"{purchasedCard.message}"</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => copyCode(purchasedCard.code)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold hover:bg-slate-700"
          >
            <Copy className="h-5 w-5" /> Copy Code
          </button>
          <button
            onClick={() => shareCode(purchasedCard.code, purchasedCard.amount, purchasedCard.currency)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            <Share2 className="h-5 w-5" /> Share
          </button>
        </div>

        <Button
          onClick={() => { setPurchasedCard(null); resetBuyFlow(); }}
          variant="ghost"
          className="w-full text-slate-400 hover:text-white"
        >
          Buy Another Gift Card
        </Button>
      </div>
    );
  }

  // Success screen for redeem
  if (redeemResult) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto bg-slate-900 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="bg-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Gift Card Redeemed!</h2>
          <p className="text-green-400 text-xl font-bold mt-2">
            +{formatCurrency(redeemResult.amount, redeemResult.currency)}
          </p>
          <p className="text-slate-400 mt-2">Added to your wallet</p>
        </div>
        <button
          onClick={() => router.push("/player/dashboard")}
          className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold text-lg transition-colors"
        >
          Go to Dashboard
        </button>
        <Button
          onClick={() => { setRedeemResult(null); setRedeemCode(""); }}
          variant="ghost"
          className="w-full text-slate-400 hover:text-white"
        >
          Redeem Another Code
        </Button>
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
        <h1 className="text-xl font-bold text-slate-100">🎁 {t("giftCard") || "Gift Cards"}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "buy" as const, label: t("buyGiftCard") || "Buy", icon: Gift },
          { key: "redeem" as const, label: t("redeemCode") || "Redeem", icon: Ticket },
          { key: "history" as const, label: t("history") || "History", icon: Ticket },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.key
              ? "bg-amber-500 text-white"
              : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Buy Tab */}
      {activeTab === "buy" && (
        <div className="space-y-5">
          {/* Step 1: Amount Selection */}
          {buyStep === "amount" && (
            <>
              {/* Balance */}
              <div className="flex items-center justify-between bg-slate-800 rounded-xl p-4 border border-slate-700">
                <span className="text-slate-400 text-sm">Your Balance</span>
                <span className="text-white font-bold">{formatCurrency(balance, currency)}</span>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-3">Select Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {(currency === "HTG" ? GIFT_AMOUNTS_HTG : GIFT_AMOUNTS_USD).map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedAmount(amt)}
                      className={`py-4 rounded-xl border-2 text-center font-bold text-lg transition-all ${selectedAmount === amt
                        ? "bg-amber-500 border-amber-400 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/50"
                        }`}
                    >
                      {formatCurrency(amt, currency)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional: Recipient & Message */}
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Recipient Name (optional)</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Friend's name..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Message (optional)</label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Continue to Payment */}
              <button
                onClick={() => selectedAmount && setBuyStep("payment")}
                disabled={!selectedAmount}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-colors ${selectedAmount
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-slate-700 cursor-not-allowed"
                  }`}
              >
                Continue — {selectedAmount ? formatCurrency(selectedAmount, currency) : "Select Amount"}
              </button>
            </>
          )}

          {/* Step 2: Payment Method Selection */}
          {buyStep === "payment" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setBuyStep("amount")} className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-white">Choose Payment Method</h3>
              </div>

              <div className="bg-amber-500/20 rounded-xl p-4 text-center border border-amber-500/30">
                <p className="text-amber-300 text-sm">Gift Card Amount</p>
                <p className="text-white text-2xl font-bold">{formatCurrency(selectedAmount!, currency)}</p>
              </div>

              <div className="space-y-3">
                {/* Wallet Balance */}
                <button
                  onClick={() => { setPaymentMethod("wallet"); handlePurchaseWithWallet(); }}
                  disabled={processing || balance < (selectedAmount ?? 0)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-green-500/50 transition-all disabled:opacity-50"
                >
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <Wallet className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">Wallet Balance</p>
                    <p className="text-slate-400 text-sm">
                      {balance >= (selectedAmount ?? 0)
                        ? `Available: ${formatCurrency(balance, currency)}`
                        : "Insufficient balance"}
                    </p>
                  </div>
                  {processing && paymentMethod === "wallet" && <Loader2 className="h-5 w-5 animate-spin text-white" />}
                </button>

                {/* Zelle */}
                <button
                  onClick={() => { setPaymentMethod("zelle"); setBuyStep("instructions"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500/50 transition-all"
                >
                  <div className="bg-purple-500/20 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">Zelle</p>
                    <p className="text-slate-400 text-sm">Send payment &amp; email screenshot</p>
                  </div>
                </button>

                {/* CashApp */}
                <button
                  onClick={() => { setPaymentMethod("cashapp"); setBuyStep("instructions"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-green-500/50 transition-all"
                >
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">CashApp</p>
                    <p className="text-slate-400 text-sm">Send payment &amp; email screenshot</p>
                  </div>
                </button>

                {/* Debit Card (Stripe) */}
                <button
                  onClick={() => { setPaymentMethod("stripe"); handleStripePayment(); }}
                  disabled={processing}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-all disabled:opacity-50"
                >
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">Debit Card</p>
                    <p className="text-slate-400 text-sm">Pay instantly with Stripe</p>
                  </div>
                  {processing && paymentMethod === "stripe" && <Loader2 className="h-5 w-5 animate-spin text-white" />}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Zelle / CashApp Instructions */}
          {buyStep === "instructions" && paymentMethod && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setBuyStep("payment")} className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-white">
                  {paymentMethod === "zelle" ? "Zelle" : "CashApp"} Payment Instructions
                </h3>
              </div>

              <div className="bg-amber-500/20 rounded-xl p-4 text-center border border-amber-500/30 mb-2">
                <p className="text-amber-300 text-sm">Amount to Send</p>
                <p className="text-white text-2xl font-bold">{formatCurrency(selectedAmount!, currency)}</p>
              </div>

              <div className="bg-slate-800 rounded-xl p-5 space-y-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0">1</div>
                  <div>
                    <p className="text-white font-medium">
                      Send {formatCurrency(selectedAmount!, currency)} via {paymentMethod === "zelle" ? "Zelle" : "CashApp"}
                    </p>
                    {paymentMethod === "zelle" ? (
                      <p className="text-slate-400 text-sm mt-1">
                        Send to: <span className="text-amber-400 font-mono">{paymentConfig.zelle_email || "payments@grolotto.com"}</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 text-sm mt-1">
                        Send to: <span className="text-amber-400 font-mono">{paymentConfig.cashapp_tag || "$GroLotto"}</span>
                        {paymentConfig.cashapp_phone && (
                          <> or <span className="text-amber-400 font-mono">{paymentConfig.cashapp_phone}</span></>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0">2</div>
                  <div>
                    <p className="text-white font-medium">Take a screenshot of the confirmation</p>
                    <p className="text-slate-400 text-sm mt-1">Save the payment receipt or confirmation screen</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0">3</div>
                  <div>
                    <p className="text-white font-medium">Email the screenshot</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Send to: <span className="text-amber-400 font-mono">{paymentConfig.zelle_email || "payments@grolotto.com"}</span>
                    </p>
                    <p className="text-slate-400 text-sm">Include your GroLotto username in the email</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0">4</div>
                  <div>
                    <p className="text-white font-medium">Click the button below</p>
                    <p className="text-slate-400 text-sm mt-1">We&apos;ll verify your payment and credit your wallet</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleManualPayment(paymentMethod as "zelle" | "cashapp")}
                disabled={processing}
                className="w-full py-4 rounded-xl font-bold text-lg text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</>
                ) : (
                  <><Mail className="h-5 w-5" /> I&apos;ve Sent the Payment</>
                )}
              </button>
            </>
          )}

          {/* Step 4: Pending Verification */}
          {buyStep === "pending" && (
            <div className="text-center py-8 space-y-4">
              <div className="bg-amber-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Clock className="h-10 w-10 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Payment Under Review</h3>
              <p className="text-slate-400">
                We&apos;ve received your payment notification. Our team will verify
                your {paymentMethod === "zelle" ? "Zelle" : "CashApp"} payment and credit your
                wallet within a few hours.
              </p>
              <p className="text-slate-500 text-sm">
                Make sure you&apos;ve emailed your screenshot to{" "}
                <span className="text-amber-400">{paymentConfig.zelle_email || "payments@grolotto.com"}</span>
              </p>
              <button
                onClick={resetBuyFlow}
                className="mt-4 px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
              >
                Back to Gift Cards
              </button>
            </div>
          )}
        </div>
      )}

      {/* Redeem Tab */}
      {activeTab === "redeem" && (
        <div className="space-y-5">
          <div className="text-center py-4">
            <div className="bg-amber-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="h-10 w-10 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{t("redeemGiftCard") || "Redeem Gift Card"}</h3>
            <p className="text-slate-400 text-sm">Enter the 16-character code from your gift card</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-2">Gift Card Code</label>
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => {
                // Auto-format: XXXX-XXXX-XXXX-XXXX
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                const raw = val.replace(/-/g, "");
                if (raw.length > 16) return;
                if (raw.length > 12) val = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
                else if (raw.length > 8) val = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
                else if (raw.length > 4) val = `${raw.slice(0, 4)}-${raw.slice(4)}`;
                else val = raw;
                setRedeemCode(val);
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={19}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-4 text-white text-2xl font-mono text-center tracking-[0.3em] placeholder:text-slate-600 outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleRedeem}
            disabled={redeemCode.replace(/-/g, "").length !== 16 || processing}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-colors flex items-center justify-center gap-2 ${redeemCode.replace(/-/g, "").length === 16 && !processing
              ? "bg-green-600 hover:bg-green-700"
              : "bg-slate-700 cursor-not-allowed"
              }`}
          >
            {processing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</>
            ) : (
              <>🎟️ {t("redeemCode") || "Redeem Code"}</>
            )}
          </button>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {loadingCards ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : myCards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No gift cards purchased yet</p>
              <Button onClick={() => setActiveTab("buy")} className="mt-4 bg-amber-500 hover:bg-amber-600">
                Buy Your First Gift Card
              </Button>
            </div>
          ) : (
            myCards.map((card) => (
              <div key={card.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold">{formatCurrency(card.amount, card.currency)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${card.status === "active" ? "bg-green-500/20 text-green-400"
                    : card.status === "redeemed" ? "bg-blue-500/20 text-blue-400"
                      : "bg-red-500/20 text-red-400"
                    }`}>
                    {card.status}
                  </span>
                </div>
                <p className="text-slate-400 font-mono text-sm mb-1">{card.code}</p>
                {card.recipientName && (
                  <p className="text-slate-500 text-xs">For: {card.recipientName}</p>
                )}
                <p className="text-slate-600 text-xs mt-1">
                  {new Date(card.purchasedAt).toLocaleDateString()}
                </p>
                {card.status === "active" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => copyCode(card.code)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-medium hover:bg-slate-600"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button
                      onClick={() => shareCode(card.code, card.amount, card.currency)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                    >
                      <Share2 className="h-3 w-3" /> Share
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
