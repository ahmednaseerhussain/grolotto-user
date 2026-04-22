"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { authAPI } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Clock, CheckCircle2, XCircle, AlertTriangle, LogOut, RefreshCw
} from "lucide-react";
import type { Vendor } from "@/types";
import toast from "react-hot-toast";

export default function VendorPendingPage() {
    const router = useRouter();
    const t = useTranslation();
    const logout = useAppStore((s) => s.logout);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Vendor | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const p = await vendorAPI.getMyProfile();
            setProfile(p);
            if (p.status === "approved" || p.status === "active") {
                router.replace("/vendor/dashboard");
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
            let msg = "Failed to load application status";
            if (status === 401) {
                msg = "Your session expired. Please sign in again.";
            } else if (status === 404) {
                msg = "No vendor profile found for your account. Please re-register as a vendor.";
            } else if (serverMsg) {
                msg = serverMsg;
            } else if (err?.message && !err?.response) {
                msg = `Network error: ${err.message}`;
            }
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch { }
        logout();
        router.replace("/vendor-login");
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (errorMsg && !profile) {
        return (
            <div className="max-w-md mx-auto py-12">
                <Card className="border-red-200">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Unable to load status</h2>
                        <p className="text-sm text-gray-600">{errorMsg}</p>
                        <div className="flex gap-2 justify-center pt-2">
                            <Button variant="outline" onClick={load}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                            </Button>
                            <Button variant="destructive" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" /> Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const status = profile?.status || "pending";
    const isRejected = status === "rejected";
    const isSuspended = status === "suspended";

    const config = isRejected
        ? {
            icon: XCircle,
            color: "red",
            title: t("Application Denied") || "Application Denied",
            message: t("Your vendor application has been denied. Please review the reason below and resubmit if applicable.",
            ) ||
                "Your vendor application has been denied. Please review the reason below and resubmit if applicable.",
        }
        : isSuspended
            ? {
                icon: AlertTriangle,
                color: "orange",
                title: t("Account Suspended") || "Account Suspended",
                message: t("Your vendor account is currently suspended. Please contact support for more information.") ||
                    "Your vendor account is currently suspended. Please contact support for more information.",
            }
            : {
                icon: Clock,
                color: "amber",
                title: t("Application Under Review") || "Application Under Review",
                message: t("Your account is pending Admin approval. You will receive a notification once a decision has been made.",
                ) ||
                    "Your account is pending Admin approval. You will receive a notification once a decision has been made.",
            };

    const Icon = config.icon;

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <Card className={`border-${config.color}-200`}>
                <CardContent className="p-8 text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-${config.color}-100 mb-4`}>
                        <Icon className={`h-10 w-10 text-${config.color}-600`} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>
                    <p className="text-gray-600 leading-relaxed max-w-md mx-auto">{config.message}</p>
                </CardContent>
            </Card>

            {profile && (
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <h2 className="font-semibold text-gray-900">
                            {t("Application Details") || "Application Details"}
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">
                                    {profile.businessName
                                        ? (t("BusinessName") || "Business Name")
                                        : (t("Name") || "Name")}
                                </p>

                                <p className="font-medium text-gray-900">
                                    {profile.businessName
                                        ? profile.businessName
                                        : `${profile.firstName} ${profile.lastName}`}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t("email") || "Email"}</p>
                                <p className="font-medium text-gray-900">{profile.email}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t("operatingCurrency") || "Operating Currency"}</p>
                                <p className="font-medium text-gray-900">{profile.operatingCurrency || "HTG"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t("Status") || "Status"}</p>
                                <p className={`font-medium capitalize text-${config.color}-600`}>
                                    {status}
                                </p>
                            </div>
                            {profile.applicationDate && (
                                <div className="col-span-2">
                                    <p className="text-gray-500">{t("Submitted On") || "Submitted On"}</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(profile.applicationDate).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {isRejected && profile?.rejectionReason && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            {t("Reason for Denial") || "Reason for Denial"}
                        </h3>
                        <p className="text-red-800 text-sm leading-relaxed">
                            {profile.rejectionReason}
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="flex gap-3">
                <Button onClick={load} variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t("Refresh Status") || "Refresh Status"}
                </Button>
                <Button onClick={handleLogout} variant="ghost" className="flex-1">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("logout") || "Logout"}
                </Button>
            </div>

            {!isRejected && !isSuspended && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                        {t("Review typically takes 1-2 business days. You'll receive an email once your account is approved.") ||
                            "Review typically takes 1-2 business days. You'll receive an email once your account is approved."}
                    </p>
                </div>
            )}
        </div>
    );
}
