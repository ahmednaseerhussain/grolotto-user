"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { walletAPI } from "@/lib/api/wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, Wallet, Banknote, CheckCircle, HelpCircle, Loader2, Smartphone, Globe
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PlayerWithdrawPage() {
    const router = useRouter();
    const t = useTranslation();
    const currency = useAppStore((s) => s.currency);
    const wallet = useAppStore((s) => s.wallet);
    const setWallet = useAppStore((s) => s.setWallet);

    useEffect(() => {
        walletAPI.getBalance().then((w) => setWallet(w)).catch(() => { });
    }, []);

    const [amount, setAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState<"moncash" | "bank_transfer">(
        currency === "HTG" ? "moncash" : "bank_transfer"
    );
    const [moncashPhone, setMoncashPhone] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountHolderName, setAccountHolderName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [routingNumber, setRoutingNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const balance = currency === "HTG"
        ? (wallet?.balanceHtg ?? wallet?.balance ?? 0)
        : (wallet?.balanceUsd ?? wallet?.balance ?? 0);

    const methodLimits: Record<string, { min: number; max: number }> = {
        moncash: { min: 500, max: 250000 },
        bank_transfer: currency === "HTG" ? { min: 500, max: 500000 } : { min: 5, max: 5000 },
    };
    const limits = methodLimits[withdrawMethod] || methodLimits.bank_transfer;

    const canSubmit = parseFloat(amount) > 0 && (
        withdrawMethod === "moncash"
            ? moncashPhone.trim().length >= 8
            : bankName.trim() && accountHolderName.trim() && accountNumber.trim()
    );

    const handleSubmit = async () => {
        if (!canSubmit) return;
        const amt = parseFloat(amount);
        if (amt > balance) {
            toast.error(t("insufficientBalance") || "Insufficient balance");
            return;
        }
        if (amt < limits.min) {
            toast.error(`Minimum withdrawal: ${formatCurrency(limits.min, currency)}`);
            return;
        }
        if (amt > limits.max) {
            toast.error(`Maximum withdrawal: ${formatCurrency(limits.max, currency)}`);
            return;
        }
        setProcessing(true);
        try {
            await walletAPI.requestWithdrawal({
                amount: amt,
                currency,
                method: withdrawMethod,
                ...(withdrawMethod === "moncash"
                    ? { moncashPhone }
                    : { bankName, accountHolderName, accountNumber, routingNumber }),
                notes,
            });
            setShowSuccess(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to submit withdrawal request");
        } finally {
            setProcessing(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="bg-green-500 p-6 rounded-full mb-6">
                    <CheckCircle className="h-16 w-16 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {t("withdrawalSubmitted") || "Withdrawal Request Submitted!"}
                </h2>
                <p className="text-gray-600 mb-2">
                    {formatCurrency(parseFloat(amount), currency)} withdrawal has been requested.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    {t("adminWillProcess") || "The admin will review and process your withdrawal via bank transfer."}
                </p>
                <Button onClick={() => router.push("/player/dashboard")}>
                    {t("backToDashboard") || "Back to Dashboard"}
                </Button>
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
                <h1 className="text-xl font-bold">{t("withdrawal") || "Withdrawal"}</h1>
            </div>

            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm opacity-80">{t("availableBalance") || "Available Balance"}</p>
                        <Badge variant="outline" className="text-white border-white/30 text-xs">{currency}</Badge>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(balance, currency)}</p>
                </CardContent>
            </Card>

            {/* Amount Input */}
            <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                    {t("withdrawalAmount") || "Withdrawal Amount"}
                </label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
                    <span className="text-xl text-gray-400">{currency === "HTG" ? "G" : "$"}</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-gray-900 text-xl font-semibold outline-none placeholder:text-gray-400"
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    {t("available") || "Available"}: {formatCurrency(balance, currency)} · Min: {formatCurrency(limits.min, currency)} · Max: {formatCurrency(limits.max, currency)}
                </p>
            </div>

            {/* Withdrawal Method Selector */}
            <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Withdrawal Method</label>
                <div className="space-y-3">
                    {currency === "HTG" && (
                        <button
                            onClick={() => setWithdrawMethod("moncash")}
                            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${withdrawMethod === "moncash"
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                                }`}
                        >
                            <div className="bg-red-500 w-10 h-10 rounded-full flex items-center justify-center">
                                <Smartphone className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="font-semibold text-gray-900">MonCash</p>
                                <p className="text-sm text-gray-500">Receive via Digicel mobile money</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${withdrawMethod === "moncash" ? "border-red-500" : "border-gray-300"}`}>
                                {withdrawMethod === "moncash" && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                            </div>
                        </button>
                    )}
                    <button
                        onClick={() => setWithdrawMethod("bank_transfer")}
                        className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${withdrawMethod === "bank_transfer"
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                    >
                        <div className="bg-amber-500 w-10 h-10 rounded-full flex items-center justify-center">
                            <Banknote className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-semibold text-gray-900">Bank Transfer</p>
                            <p className="text-sm text-gray-500">Direct transfer to your bank account</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${withdrawMethod === "bank_transfer" ? "border-amber-500" : "border-gray-300"}`}>
                            {withdrawMethod === "bank_transfer" && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                        </div>
                    </button>
                </div>
            </div>

            {/* MonCash Details (HTG) */}
            {withdrawMethod === "moncash" && (
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Smartphone className="h-5 w-5 text-red-600" />
                            <h3 className="font-semibold">MonCash Details</h3>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">MonCash Phone Number</label>
                            <Input
                                value={moncashPhone}
                                onChange={(e) => setMoncashPhone(e.target.value)}
                                placeholder="+509 XXXX XXXX"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">{t("additionalNotes") || "Additional Notes"} ({t("optional") || "optional"})</label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any special instructions"
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bank Details (USD / optional for HTG) */}
            {withdrawMethod === "bank_transfer" && (
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Banknote className="h-5 w-5 text-amber-600" />
                            <h3 className="font-semibold">{t("bankDetails") || "Bank Details"}</h3>
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">{t("bankName") || "Bank Name"}</label>
                            <Input
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="e.g. Sogebank, BNC, Unibank"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">{t("accountHolderName") || "Account Holder Name"}</label>
                            <Input
                                value={accountHolderName}
                                onChange={(e) => setAccountHolderName(e.target.value)}
                                placeholder="Full name on bank account"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">{t("accountNumber") || "Account Number"}</label>
                            <Input
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="Bank account number"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">{t("routingNumber") || "Routing Number"} ({t("optional") || "optional"})</label>
                            <Input
                                value={routingNumber}
                                onChange={(e) => setRoutingNumber(e.target.value)}
                                placeholder="Routing/transit number"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">{t("additionalNotes") || "Additional Notes"} ({t("optional") || "optional"})</label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any special instructions"
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Submit Button */}
            <Button
                className="w-full py-3"
                onClick={handleSubmit}
                disabled={!canSubmit || processing}
            >
                {processing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                ) : (
                    t("submitWithdrawalRequest") || "Submit Withdrawal Request"
                )}
            </Button>

            {/* Info */}
            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                        <HelpCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-blue-800">{t("howItWorks") || "How It Works"}</h4>
                            <ul className="text-xs text-blue-700 mt-1 space-y-1">
                                <li>• {t("withdrawStep1") || "Submit your withdrawal request with bank details"}</li>
                                <li>• {t("withdrawStep2") || "Admin reviews and approves the request"}</li>
                                <li>• {t("withdrawStep3") || "Funds are transferred directly to your bank account"}</li>
                                <li>• {t("withdrawStep4") || "Processing typically takes 1-3 business days"}</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
