"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import { vendorAPI } from "@/lib/api/vendor";
import { authAPI } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Store, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

export default function VendorRegisterPage() {
  const router = useRouter();
  const t = useTranslation();
  const setUser = useAppStore((s) => s.setUser);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    businessName: "",
    operatingCurrency: "HTG" as "HTG" | "USD",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = t("firstNameRequired");
    if (!formData.lastName.trim()) newErrors.lastName = t("lastNameRequired");
    if (!formData.email.trim()) newErrors.email = t("emailRequired");
    if (!formData.phone.trim()) newErrors.phone = t("phoneRequired");
    if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = t("dobRequired");
    if (!formData.password) newErrors.password = t("passwordRequired");
    else if (formData.password.length < 6) newErrors.password = t("minimum6Chars");
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t("passwordsDontMatch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Register user account first, then vendor profile
      const user = await authAPI.register({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: "vendor",
      });

      await vendorAPI.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        businessName: formData.businessName || undefined,
        operatingCurrency: formData.operatingCurrency,
        password: formData.password,
      });

      setUser(user);
      toast.success(t("applicationSubmitted"));
      router.push("/vendor/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <div className="w-full max-w-lg animate-slide-up">
      <Link href="/vendor-login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Store className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t("vendorRegistration")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfo")}</CardTitle>
          <CardDescription>{t("fillInformation")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("firstName")} *</label>
                <Input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder={t("enterYourFirstName")} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("lastName")} *</label>
                <Input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder={t("enterYourLastName")} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")} *</label>
              <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("yourEmail")} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("phoneNumber")} *</label>
              <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+509 1234 5678" />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("dateOfBirth")} *</label>
              <Input type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
              {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("businessName")} ({t("optional")})</label>
              <Input value={formData.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder={t("yourBusinessName")} />
            </div>

            {/* Operating Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("operatingCurrency") || "Operating Currency"} *</label>
              <p className="text-xs text-gray-500 mb-2">{t("vendorCurrencyNote") || "Choose which currency you want to accept"}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField("operatingCurrency", "HTG")}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    formData.operatingCurrency === "HTG"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">🇭🇹</span>
                  <span className="font-semibold">HTG</span>
                  <span className="text-xs text-gray-500">Gourde Haïtienne</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField("operatingCurrency", "USD")}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    formData.operatingCurrency === "USD"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <span className="font-semibold">USD</span>
                  <span className="text-xs text-gray-500">US Dollar</span>
                </button>
              </div>
            </div>

            <hr className="my-2" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("password")} *</label>
              <Input type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder={t("minimum6Chars")} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("confirmPassword")} *</label>
              <Input type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder={t("repeatPassword")} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" loading={isLoading} variant="success" className="w-full" size="lg">
              {t("submitApplication")}
            </Button>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                {t("applicationReviewText")}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
