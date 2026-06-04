"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { authAPI } from "@/lib/api/auth";
import { getErrorMessage, clearTokens } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import toast from "react-hot-toast";

function VerifyEmailInner() {
    const router = useRouter();
    const search = useSearchParams();
    const t = useTranslation();
    const setUser = useAppStore((s) => s.setUser);

    const initialEmail = search.get("email") || "";
    const role = (search.get("role") || "player").toLowerCase();

    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [cooldown]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !/^\d{6}$/.test(otp)) {
            toast.error(t("invalidOtpFormat") || "Enter the 6-digit code");
            return;
        }
        setIsLoading(true);
        try {
            const result = await authAPI.verifyEmail(email, otp);
            const user = result.user;
            if (role === "vendor" && user.role !== "vendor") {
                clearTokens();
                toast.error(t("invalidRole"));
                return;
            }
            if (role === "player" && user.role !== "player") {
                clearTokens();
                toast.error(t("invalidRole"));
                return;
            }
            setUser(user);
            toast.success(t("emailVerified") || "Email verified! Welcome to GroLotto");
            router.push(user.role === "vendor" ? "/vendor/pending" : "/player/dashboard");
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            toast.error(t("emailRequired") || "Email is required");
            return;
        }
        setIsResending(true);
        try {
            const result = await authAPI.resendVerification(email);
            toast.success(result.message || t("verificationCodeSent") || "New code sent");
            if (result.otp) {
                toast(`Dev OTP: ${result.otp}`, { duration: 10000, icon: "🔑" });
            }
            setCooldown(30);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsResending(false);
        }
    };

    const backHref = role === "vendor" ? "/vendor-register" : "/player-login";

    return (
        <div className="w-full max-w-md animate-slide-up">
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
            </Link>

            <div className="text-center mb-6">
                <img src="/grolotto-logo.png" alt="GroLotto" className="w-14 h-14 rounded-xl mx-auto mb-3 shadow-lg object-contain" />
                <h1 className="text-2xl font-bold text-gray-900">GroLotto</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        {t("verifyYourEmail") || "Verify your email"}
                    </CardTitle>
                    <CardDescription>
                        {t("verifyEmailHelp") ||
                            "We sent a 6-digit verification code to your email. Enter it below to activate your account."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("yourEmail") || "your@email.com"}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t("verificationCode") || "Verification Code"}
                            </label>
                            <Input
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="123456"
                                maxLength={6}
                                className="text-center text-2xl tracking-[0.5em] font-mono"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">{t("codeExpiresIn15") || "Code expires in 15 minutes."}</p>
                        </div>

                        <Button type="submit" loading={isLoading} className="w-full" size="lg">
                            {t("verifyAndContinue") || "Verify & Continue"}
                        </Button>

                        <div className="text-center text-sm">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isResending || cooldown > 0}
                                className="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {cooldown > 0
                                    ? `${t("resendIn") || "Resend in"} ${cooldown}s`
                                    : isResending
                                        ? t("sending") || "Sending..."
                                        : t("resendCode") || "Resend code"}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="w-full max-w-md p-8 text-center text-gray-500">Loading…</div>}>
            <VerifyEmailInner />
        </Suspense>
    );
}
