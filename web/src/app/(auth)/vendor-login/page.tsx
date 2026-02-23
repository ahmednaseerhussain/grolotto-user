"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { authAPI } from "@/lib/api/auth";
import { getErrorMessage, clearTokens } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function VendorLoginPage() {
  const router = useRouter();
  const t = useTranslation();
  const setUser = useAppStore((s) => s.setUser);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await authAPI.login(formData);

      if (user.role !== "vendor") {
        clearTokens();
        toast.error(t("invalidRole"));
        return;
      }

      setUser(user);
      toast.success(t("loginSuccess"));
      router.push("/vendor/dashboard");
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
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <span className="text-white font-bold text-xl">G</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">GroLotto</h1>
        <p className="text-sm text-gray-500">{t("vendorPortal")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("vendorLogin")}</CardTitle>
          <CardDescription>{t("enterCredentials")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t("yourEmail")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("password")}</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t("enterPassword")}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" loading={isLoading} variant="success" className="w-full" size="lg">
              {t("login")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/vendor-register" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              {t("registerAsVendor")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
