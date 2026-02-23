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
  ArrowLeft, Wallet, CheckCircle, Smartphone, DollarSign, Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

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

  const canProceed = parseFloat(amount) > 0 && selectedMethod && (!selectedMethod || phoneNumber.length >= 8);

  const handlePayment = async () => {
    if (!canProceed) return;
    setProcessing(true);
    try {
      const res = await paymentAPI.createPaymentIntent({ amount: parseFloat(amount), currency, phoneNumber });
      const { redirectUrl: paymentUrl, orderId } = res || {};

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-emerald-100 p-6 rounded-full mb-4">
          <CheckCircle className="h-16 w-16 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-700">Payment Successful!</h2>
        <p className="text-gray-500 mt-2">
          {formatCurrency(parseFloat(amount), currency)} has been added to your wallet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Make Payment</h1>
      </div>

      {/* Current Balance */}
      <Card className="bg-gray-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">Current Balance</span>
          </div>
          <span className="font-bold text-lg">{formatCurrency(balance, currency)}</span>
        </CardContent>
      </Card>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Amount</label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-500">{currency === "HTG" ? "G" : "$"}</span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="text-lg"
          />
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS.map((qa) => (
          <button
            key={qa}
            onClick={() => setAmount(String(qa))}
            className={`py-2 rounded-lg border text-sm font-medium transition-all ${
              amount === String(qa)
                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {formatCurrency(qa, currency)}
          </button>
        ))}
      </div>

      {/* Payment Method */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Payment Method</label>
        <button
          onClick={() => setSelectedMethod("moncash")}
          className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
            selectedMethod === "moncash"
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="bg-red-500 p-2 rounded-lg">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold">MonCash</p>
            <p className="text-xs text-gray-500">Pay with Digicel mobile money</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selectedMethod === "moncash" ? "border-red-500" : "border-gray-300"
          }`}>
            {selectedMethod === "moncash" && <div className="w-3 h-3 rounded-full bg-red-500" />}
          </div>
        </button>
      </div>

      {/* Phone Number */}
      {selectedMethod === "moncash" && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">MonCash Phone Number</label>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+509 XXXX XXXX"
          />
        </div>
      )}

      {/* Summary */}
      {parseFloat(amount) > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount</span>
              <span className="font-medium">{formatCurrency(parseFloat(amount), currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Processing Fee</span>
              <span className="font-medium text-emerald-600">Free</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(parseFloat(amount), currency)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePayment}
        disabled={!canProceed}
        loading={processing}
      >
        {processing ? "Processing..." : `Pay ${amount ? formatCurrency(parseFloat(amount), currency) : ""}`}
      </Button>
    </div>
  );
}
