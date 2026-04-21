"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { giftCardAPI, type GiftCard } from "@/lib/api/gift-cards";
import { walletAPI } from "@/lib/api/wallet";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Gift, Ticket, CheckCircle, Copy, Share2, Loader2, ExternalLink, Mail
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const BUY_URL_HTG = "https://grolotto.com/buy-gift-card-htg";
const BUY_URL_USD = "https://grolotto.com/buy-gift-card-usd";

export default function GiftCardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "redeem" ? "redeem" : "buy";
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const setWallet = useAppStore((s) => s.setWallet);

  const [activeTab, setActiveTab] = useState<"buy" | "redeem" | "history">(initialTab as any);
  const [redeemCode, setRedeemCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ amount: number; currency: "HTG" | "USD" } | null>(null);
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    if (activeTab === "history") {
      loadMyCards();
    }
  }, [activeTab]);

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

  const handleBuyRedirect = () => {
    const url = currency === "HTG" ? BUY_URL_HTG : BUY_URL_USD;
    window.open(url, "_blank", "noopener,noreferrer");
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
      try {
        const w = await walletAPI.getBalance();
        if (w) setWallet(w);
      } catch { }
    } catch (err: any) {
      const errorCode = err?.response?.data?.code;
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message;
      if (errorCode === "INVALID_CODE") toast.error("Incorrect PIN");
      else if (errorCode === "ALREADY_REDEEMED") toast.error("This gift card has already been redeemed.");
      else if (errorCode === "EXPIRED") toast.error("This gift card has expired.");
      else if (errorCode === "SELF_REDEEM") toast.error("You cannot redeem your own gift card.");
      else toast.error(errorMsg || "Incorrect PIN");
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
        text: `I'm sending you a GroLotto gift card worth ${amount} ${cur}! Redeem code: ${code}`,
      });
    } else {
      copyCode(code);
      toast.success("Code copied! Share it with your friend.");
    }
  };

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
          {t("backToDashboard") || "Back to Dashboard"}
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
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-slate-100">{t("giftCard") || "Gift Cards"}</h1>
      </div>

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

      {activeTab === "buy" && (
        <div className="space-y-5">
          <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-center">
            <Gift className="h-14 w-14 text-white mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {t("buyGiftCardOnline") || "Buy Gift Card Online"}
            </h2>
            <p className="text-white/90 text-sm">
              {currency === "HTG"
                ? (t("htgGiftCard") || "HTG Gift Card")
                : (t("usdGiftCard") || "USD Gift Card")}
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-3">
            <p className="text-slate-200 text-sm leading-relaxed">
              {t("buyRedirectNotice") ||
                "Gift cards are sold on our website. You will be redirected to complete your purchase."}
            </p>
            <div className="flex items-start gap-3 pt-2">
              <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
                <Mail className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-slate-400 text-sm">
                {t("pinDeliveryInfo") ||
                  "After purchase, your PIN will be sent by email or WhatsApp."}
              </p>
            </div>
          </div>

          <button
            onClick={handleBuyRedirect}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
            {t("openWebsite") || "Open Website"}
          </button>

          <p className="text-center text-slate-500 text-xs break-all">
            {currency === "HTG" ? BUY_URL_HTG : BUY_URL_USD}
          </p>
        </div>
      )}

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
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                const raw = val.replace(/-/g, "");
                if (raw.length > 16) return;
                if (raw.length > 12) {
                  val = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
                } else if (raw.length > 8) {
                  val = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
                } else if (raw.length > 4) {
                  val = `${raw.slice(0, 4)}-${raw.slice(4)}`;
                } else val = raw;
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
              <>{t("redeemCode") || "Redeem Code"}</>
            )}
          </button>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {loadingCards ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : myCards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No gift cards yet</p>
              <Button onClick={() => setActiveTab("buy")} className="mt-4 bg-amber-500 hover:bg-amber-600">
                {t("buyGiftCard") || "Buy Gift Card"}
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