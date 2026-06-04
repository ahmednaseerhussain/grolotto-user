"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import { authAPI } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
    const t = useTranslation();
    const [step, setStep] = useState<Step>("email");
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await authAPI.forgotPassword(email);
            // toast.success(t("resetCodeSent") || "Reset code sent! Check your email.");
            toast.success(t("Reset code sent! Check your email.") || "Reset code sent! Check your email.");
            // In dev mode, the OTP may be returned
            if (result.otp) {
                toast(`Dev OTP: ${result.otp}`, { duration: 10000, icon: "🔑" });
            }
            setStep("otp");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error(t("passwordsDontMatch") || "Passwords don't match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error(t("passwordTooShort") || "Password must be at least 6 characters");
            return;
        }
        setIsLoading(true);
        try {
            await authAPI.resetPassword(email, otp, newPassword);
            toast.success(t("passwordResetSuccess") || "Password reset successfully!");
            setStep("done");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md animate-slide-up">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
            </Link>

            <div className="text-center mb-6">
                <img src="/grolotto-logo.png" alt="GroLotto" className="w-14 h-14 rounded-xl mx-auto mb-3 shadow-lg object-contain" />
                <h1 className="text-2xl font-bold text-gray-900">GroLotto</h1>
            </div>

            {step === "email" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            {t("forgotPassword")}
                        </CardTitle>
                        <CardDescription>
                            {t("Enter Email For Reset") || "Enter your email address and we'll send you a reset code."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRequestOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("yourEmail")}
                                    required
                                />
                            </div>
                            <Button type="submit" loading={isLoading} className="w-full" size="lg">
                                {t("Send Reset Code") || "Send Reset Code"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {step === "otp" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-amber-600" />
                            {t("Reset Password") || "Reset Password"}
                        </CardTitle>
                        <CardDescription>
                            {t("Enter the 6-digit code sent to your email and your new password.") || "Enter the 6-digit code sent to your email and your new password."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Reset Code") || "Reset Code"}</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    placeholder="000000"
                                    required
                                    className="text-center text-2xl tracking-[0.5em] font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("New Password") || "New Password"}</label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t("Enter new password ") || "Enter new password"}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("confirmPassword") || "Confirm Password"}</label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={t("Confirm new password") || "Confirm new password"}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <Button type="submit" loading={isLoading} className="w-full" size="lg">
                                {t("Reset Password") || "Reset Password"}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="text-sm text-blue-600 hover:text-blue-700 w-full text-center"
                            >
                                {t("Resend Code") || "Resend code"}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {step === "done" && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {t("passwordResetSuccess") || "Password Reset Successfully!"}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {t("canNowLogin") || "You can now log in with your new password."}
                        </p>
                        <Link href="/login">
                            <Button className="w-full" size="lg">
                                {t("backToLogin") || "Back to Login"}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
