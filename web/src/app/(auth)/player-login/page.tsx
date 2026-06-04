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
import { extractHaitiDigits, formatHaitiPhoneDisplay, isValidHaitiPhone, toHaitiPhone, HAITI_PHONE_PREFIX } from "@/lib/phone";

export default function PlayerLoginPage() {
  const router = useRouter();
  const t = useTranslation();
  const setUser = useAppStore((s) => s.setUser);

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [suspensionError, setSuspensionError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      if (!isValidHaitiPhone(phoneDigits)) {
        toast.error(t("phoneInvalid") || "Enter a valid Haitian phone: +509 followed by 8 digits");
        return;
      }
      if (!acceptedTerms) {
        toast.error(t("mustAcceptTerms") || "You must accept the Terms & Conditions to continue");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const user = await authAPI.login({ email: formData.email, password: formData.password });
        if (user.role !== "player") {
          clearTokens();
          toast.error(t("invalidRole"));
          return;
        }
        setUser(user);
        toast.success(t("Login Success"));
        router.push("/player/dashboard");
      } else {
        const result = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "player",
          dateOfBirth: formData.dateOfBirth,
          phone: toHaitiPhone(phoneDigits),
          acceptedTerms: true,
          verifyByEmail: true,
        });
        if (result.requiresEmailVerification) {
          toast.success(t("verificationCodeSent") || "Verification code sent to your email");
          router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&role=player`);
          return;
        }
        // Fallback (shouldn't happen with verifyByEmail=true)
        if (result.user.role !== "player") {
          clearTokens();
          toast.error(t("invalidRole"));
          return;
        }
        setUser(result.user);
        router.push("/player/dashboard");
      }
    } catch (error: any) {
      const msg = getErrorMessage(error);
      if (msg.toLowerCase().includes('suspend')) {
        setSuspensionError(msg);
      } else {
        setSuspensionError(null);
        toast.error(msg);
      }
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
          <CardTitle>{isLogin ? t("Player Login") : t("createAccount")}</CardTitle>
          <CardDescription>
            {isLogin ? t("Enter Credentials") : t("fillInformation")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspensionError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl mt-0.5">🚫</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">Account Suspended</p>
                  <p className="text-sm text-red-700 mt-1">{suspensionError}</p>
                  <p className="text-xs text-red-500 mt-2">Please contact support if you believe this is an error.</p>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Name")}</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("Enter Your Name")}
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
                placeholder={t("Your Email") || "Your Email"}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("phoneNumber") || "Phone Number"} *</label>
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm select-none">
                      {HAITI_PHONE_PREFIX}
                    </span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formatHaitiPhoneDisplay(phoneDigits)}
                      onChange={(e) => setPhoneDigits(extractHaitiDigits(e.target.value))}
                      placeholder="1234 5678"
                      className="rounded-l-none"
                      required={!isLogin}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("haitianPhoneOnly") || "Only Haitian numbers (+509 followed by 8 digits) are accepted."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("dateOfBirth") || "Date of Birth"} *</label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required={!isLogin}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("Must Be 18") || "You must be at least 18 years old"}</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("password")}</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t("Enter Password") || "Enter Password"}
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <label className="flex items-start gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <span>
                  {t("iAgreeTo") || "I agree to the"}{" "}
                  <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">
                    {t("termsAndConditions") || "Terms & Conditions"}
                  </Link>
                </span>
              </label>
            )}

            <Button type="submit" loading={isLoading} className="w-full" size="lg">
              {isLogin ? t("login") : t("register")}
            </Button>

            {isLogin && (
              <div className="text-center">
                <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
                  {t("forgotPassword")}
                </Link>
              </div>
            )}
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
