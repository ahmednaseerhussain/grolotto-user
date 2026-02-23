"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { Users, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslation();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const user = useAppStore((s) => s.user);
  const hasHydrated = useAppStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated && user) {
      router.replace(user.role === "vendor" ? "/vendor/dashboard" : "/player/dashboard");
    }
  }, [isAuthenticated, user, router, hasHydrated]);

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl">G</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">GroLotto</h1>
        <p className="text-gray-500 mt-1">{t("welcome")}</p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t("loginAs")}</CardTitle>
          <CardDescription>{t("selectYourRole")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/player-login" className="block">
            <Button variant="outline" size="xl" className="w-full justify-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{t("player")}</p>
                <p className="text-xs text-gray-500">{t("playAndWin")}</p>
              </div>
            </Button>
          </Link>

          <Link href="/vendor-login" className="block">
            <Button variant="outline" size="xl" className="w-full justify-start gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{t("vendor")}</p>
                <p className="text-xs text-gray-500">{t("manageYourBusiness")}</p>
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
