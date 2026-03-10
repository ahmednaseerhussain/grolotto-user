"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { walletAPI } from "@/lib/api/wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, Wallet, Banknote, CheckCircle, HelpCircle, Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PlayerWithdrawPage() {
    const router = useRouter();
    const t = useTranslation();
    const currency = useAppStore((s) => s.currency);
    const wallet = useAppStore((s) => s.wallet);

    const [amount, setAmount] = useState("");
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

    const canSubmit = parseFloat(amount) > 0 && bankName.trim() && accountHolderName.trim() && accountNumber.trim();

    const handleSubmit = async () => {
        if (!canSubmit) return;
        const amt = parseFloat(amount);
        if (amt > balance) {
            toast.error(t("insufficientBalance") || "Insufficient balance");
            return;
        }
        if (amt < (currency === "HTG" ? 500 : 5)) {
            toast.error(`Minimum withdrawal: ${formatCurrency(currency === "HTG" ? 500 : 5, currency)}`);
            return;
        }
        setProcessing(true);
        try {
            await walletAPI.requestWithdrawal({
                amount: amt,
                currency,
                method: "bank_transfer",
                bankName,
                accountHolderName,
                accountNumber,
                routingNumber,
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
                    {t("available") || "Available"}: {formatCurrency(balance, currency)} · Min: {formatCurrency(currency === "HTG" ? 500 : 5, currency)}
                </p>
            </div>

            {/* Bank Details */}
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
