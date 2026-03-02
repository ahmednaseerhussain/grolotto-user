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

export default function PlayerLoginPage() {
  const router = useRouter();
  const t = useTranslation();
  const setUser = useAppStore((s) => s.setUser);

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await authAPI.login({ email: formData.email, password: formData.password });
      } else {
        user = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "player",
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone || undefined,
        });
      }

      if (user.role !== "player") {
        clearTokens();
        toast.error(t("invalidRole"));
        return;
      }

      setUser(user);
      toast.success(isLogin ? t("loginSuccess") : t("registrationSuccess"));
      router.push("/player/dashboard");
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

      <Card>
        <CardHeader>
          <CardTitle>{isLogin ? t("playerLogin") : t("createAccount")}</CardTitle>
          <CardDescription>
            {isLogin ? t("enterCredentials") : t("fillInformation")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("enterYourName")}
                  required={!isLogin}
                />
              </div>
            )}

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

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("phoneNumber") || "Phone Number"}</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+509 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("dateOfBirth") || "Date of Birth"} *</label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required={!isLogin}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("mustBe18") || "You must be at least 18 years old"}</p>
                </div>
              </>
            )}

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

            <Button type="submit" loading={isLoading} className="w-full" size="lg">
              {isLogin ? t("login") : t("register")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isLogin ? t("dontHaveAccount") : t("alreadyHaveAccount")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
