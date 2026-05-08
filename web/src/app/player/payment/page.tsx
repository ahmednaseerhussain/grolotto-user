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
  ArrowLeft, Wallet, CheckCircle, Smartphone, DollarSign, Loader2, CreditCard, Gift, Ticket, Mail, Clock,
  ChevronRight, Banknote, ExternalLink
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
    (selectedMethod === "stripe") ||
    (selectedMethod === "bank_transfer") ||
    (selectedMethod === "paypal") ||
    (selectedMethod === "gift_card")
  );

  const handlePayment = async () => {
    if (!canProceed) return;

    // Gift card — external redirect
    if (selectedMethod === "gift_card") {
      const url = currency === "HTG"
        ? "https://grolotto.com/buy-gift-card-htg"
        : "https://grolotto.com/buy-gift-card-usd";
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setProcessing(true);
    try {
      if (selectedMethod === "zelle" || selectedMethod === "cashapp" || selectedMethod === "bank_transfer" || selectedMethod === "paypal") {
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
        toast.success(t("completePaymentStripe") || "Complete payment in the Stripe popup.");
        const confirmed = await paymentOrderAPI.confirmStripePayment(intent.paymentIntentId);
        if (confirmed.success) {
          try { const w = await walletAPI.getBalance(); if (w) setWallet(w); } catch { }
          setShowSuccess(true);
          setTimeout(() => { setShowSuccess(false); router.push("/player/dashboard"); }, 3000);
        } else {
          toast.error(t("stripePaymentFailed") || "Stripe payment could not be verified.");
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
        toast(t("completingPaymentMoncash") || "Completing payment in MonCash...", { duration: 5000 });

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
          toast.error(t("paymentVerificationTimeout") || "Payment verification timed out. Please check your balance.");
        }
      } else {
        toast.error(t("failedToCreatePayment") || "Failed to create payment. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("paymentFailed") || "Payment failed");
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
        <h2 className="text-3xl font-bold text-gray-900 mb-3">{t("successTitle") || "Success!"}</h2>
        <p className="text-lg text-gray-600">
          {formatCurrency(parseFloat(amount), currency)} {t("addedToWallet") || "has been added to your wallet"}
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
        <h1 className="text-xl font-bold text-gray-900">{t("makePayment") || "Make Payment"}</h1>
      </div>

      {/* Current Balance */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-6">
        <p className="text-blue-100 text-sm mb-2">{t("currentBalance") || "Current Balance"}</p>
        <p className="text-white text-4xl font-bold">{formatCurrency(balance, currency)}</p>
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-3">{t("enterAmount") || "Enter Amount"}</label>
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
        <label className="text-sm font-semibold text-gray-700 block mb-3">{t("selectPaymentMethod") || "Select Payment Method"}</label>
        <div className="space-y-3">
          {/* MonCash — HTG only */}
          {currency === "HTG" && (
            <button
              onClick={() => setSelectedMethod("moncash")}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "moncash"
                ? "border-red-500 bg-red-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
            >
              <div className="bg-red-500 w-12 h-12 rounded-full flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900">MonCash</p>
                <p className="text-sm text-gray-500">{t("digicelMobileMoneyDesc") || "Digicel mobile money"}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === "moncash" ? "border-red-500" : "border-gray-300"
                }`}>
                {selectedMethod === "moncash" && <div className="w-3 h-3 rounded-full bg-red-500" />}
              </div>
            </button>
          )}

          {/* PayPal — USD only */}
          {currency === "USD" && (
            <>
              {/* Zelle */}
              <button
                onClick={() => setSelectedMethod("zelle")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "zelle"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Zelle</p>
                  <p className="text-sm text-gray-500">{t("sendPaymentScreenshot") || "Send payment & email screenshot"}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === "zelle" ? "border-purple-500" : "border-gray-300"}`}>
                  {selectedMethod === "zelle" && <div className="w-3 h-3 rounded-full bg-purple-500" />}
                </div>
              </button>

              {/* CashApp */}
              <button
                onClick={() => setSelectedMethod("cashapp")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "cashapp"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">CashApp</p>
                  <p className="text-sm text-gray-500">{t("sendPaymentScreenshot") || "Send payment & email screenshot"}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === "cashapp" ? "border-green-500" : "border-gray-300"}`}>
                  {selectedMethod === "cashapp" && <div className="w-3 h-3 rounded-full bg-green-500" />}
                </div>
              </button>

              {/* Credit/Debit Card (Stripe) */}
              <button
                onClick={() => setSelectedMethod("stripe")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "stripe"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">{t("debitCard") || "Debit Card"}</p>
                  <p className="text-sm text-gray-500">{t("payInstantly") || "Pay instantly"}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === "stripe" ? "border-blue-500" : "border-gray-300"}`}>
                  {selectedMethod === "stripe" && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                </div>
              </button>

              {/* PayPal */}
              {/* <button
                onClick={() => setSelectedMethod("paypal")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "paypal"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">{t("paypal") || "PayPal"}</p>
                  <p className="text-sm text-gray-500">{t("sendPaymentScreenshot") || "Send payment & email screenshot"}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === "paypal" ? "border-indigo-500" : "border-gray-300"}`}>
                  {selectedMethod === "paypal" && <div className="w-3 h-3 rounded-full bg-indigo-500" />}
                </div>
              </button> */}

              {/* Bank Transfer */}
              {/* <button
                onClick={() => setSelectedMethod("bank_transfer")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "bank_transfer"
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="bg-amber-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">{t("bankTransfer") || "Bank Transfer"}</p>
                  <p className="text-sm text-gray-500">{t("transferEmailProof") || "Transfer & email proof"}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === "bank_transfer" ? "border-amber-500" : "border-gray-300"}`}>
                  {selectedMethod === "bank_transfer" && <div className="w-3 h-3 rounded-full bg-amber-500" />}
                </div>
              </button> */}
            </>
          )}

          {/* Gift Card — currency-specific, redirects to website */}
          <button
            onClick={() => setSelectedMethod("gift_card")}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${selectedMethod === "gift_card"
              ? "border-orange-500 bg-orange-50"
              : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
          >
            <div className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-gray-900">
                {currency === "HTG"
                  ? (t("htgGiftCard") || "HTG Gift Card")
                  : (t("usdGiftCard") || "USD Gift Card")}
              </p>
              <p className="text-sm text-gray-500">
                {t("buyRedirectNotice") || "Buy on our website — redirects to grolotto.com"}
              </p>
            </div>
            <ExternalLink className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Phone Number */}
      {selectedMethod === "moncash" && (
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-3">{t("moncashPhone") || "MonCash Phone Number"}</label>
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
          <h4 className="font-semibold text-gray-900">{t("howItWorks") || "How it works"}</h4>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</div>
            <p className="text-sm text-gray-600">
              {t("sendLabel") || "Send"} <span className="font-semibold text-gray-900">{amount ? formatCurrency(parseFloat(amount), currency) : (t("yourAmountLabel") || "your amount")}</span> {t("viaLabel") || "via"} {selectedMethod === "zelle" ? "Zelle" : "CashApp"} {t("toLabel") || "to"}{" "}
              <span className="font-mono text-amber-600">
                {selectedMethod === "zelle" ? (paymentConfig.zelle_email || "payments@grolotto.com") : (paymentConfig.cashapp_tag || "$GroLotto")}
              </span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</div>
            <p className="text-sm text-gray-600">{t("takeScreenshot") || "Take a screenshot of the payment confirmation"}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</div>
            <p className="text-sm text-gray-600">
              {t("sendScreenshotUsernameEmail") || "Send the screenshot with your GroLotto username via email to"}{" "}
              <span className="font-mono text-amber-600">{paymentConfig.zelle_email || "payments@grolotto.com"}</span>
              {" "}{t("orWhatsAppSmsTo") || "or WhatsApp/SMS to"}{" "}
              <span className="font-mono text-amber-600">{paymentConfig.support_phone || "+1 (555) 123-4567"}</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">4</div>
            <p className="text-sm text-gray-600">{t("clickButtonBelow") || "Click the button below"} — {t("weWillVerifyPayment") || "we'll verify and credit your wallet"}</p>
          </div>
        </div>
      )}

      {/* Pending Verification Screen */}
      {depositStep === "pending" && (
        <div className="text-center py-8 space-y-4 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{t("paymentUnderReview") || "Payment Under Review"}</h3>
          <p className="text-gray-600">
            {t("verificationInProgress") || "We've received your deposit notification. Our team will verify and credit your wallet within a few hours."}
          </p>
          <p className="text-gray-500 text-sm">
            {t("makeSureSentScreenshotTo") || "Make sure you've sent your screenshot to"}{" "}
            <span className="text-amber-600 font-medium">{paymentConfig.zelle_email || "payments@grolotto.com"}</span>
            {" "}or{" "}
            <span className="text-amber-600 font-medium">{paymentConfig.support_phone || "+1 (555) 123-4567"}</span>
          </p>
          <button
            onClick={() => { setDepositStep("select"); setSelectedMethod(null); setAmount(""); }}
            className="mt-4 px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
          >
            {t("backToDeposit") || "Back to Deposit"}
          </button>
        </div>
      )}

      {/* Summary */}
      {parseFloat(amount) > 0 && depositStep === "select" && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
          <p className="text-sm text-gray-500 mb-3">{t("paymentSummary") || "Payment Summary"}</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("amountLabel") || "Amount"}</span>
            <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(amount), currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("processingFee") || "Processing Fee"}</span>
            <span className="font-semibold text-gray-900">{formatCurrency(0, currency)}</span>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-900">{t("total") || "Total"}</span>
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
          {processing
            ? (t("processing") || "Processing...")
            : selectedMethod === "gift_card"
              ? `${t("openWebsite") || "Open Website"} →`
              : `🔒 ${t("pay") || "Pay"} ${amount ? formatCurrency(parseFloat(amount), currency) : ""}`}
        </button>
      )}
    </div>
  );
}
