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
import { ArrowLeft, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import {
  HAITI_PHONE_PREFIX,
  extractHaitiDigits,
  formatHaitiPhoneDisplay,
  isValidHaitiPhone,
  toHaitiPhone,
} from "@/lib/phone";

export default function VendorRegisterPage() {
  const router = useRouter();
  const t = useTranslation();
  const setUser = useAppStore((s) => s.setUser);

  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState("");
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
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = t("firstNameRequired");
    else if (formData.firstName.trim().length < 2) newErrors.firstName = "First name must be at least 2 characters";
    if (!formData.lastName.trim()) newErrors.lastName = t("lastNameRequired");
    else if (formData.lastName.trim().length < 2) newErrors.lastName = "Last name must be at least 2 characters";
    if (!formData.email.trim()) newErrors.email = t("emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) newErrors.email = "Invalid email address";
    if (!isValidHaitiPhone(phoneDigits)) newErrors.phone = t("phoneInvalid") || "Phone must be +509 followed by 8 digits";
    if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = t("dobRequired");
    else {
      const dob = new Date(formData.dateOfBirth);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) newErrors.dateOfBirth = "You must be at least 18 years old";
    }
    if (!formData.businessName.trim()) newErrors.businessName = "Business name is required";
    if (!formData.password) newErrors.password = t("passwordRequired");
    else if (formData.password.length < 6) newErrors.password = t("minimum6Chars");
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t("passwordsDontMatch");
    if (!acceptedTerms) newErrors.acceptedTerms = t("mustAcceptTerms") || "You must accept the Terms & Conditions";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Atomic signup: creates user + vendor row in a single backend transaction.
      // If any part fails, nothing is persisted — no orphan users.
      const result = await authAPI.register({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: "vendor",
        dateOfBirth: formData.dateOfBirth,
        phone: toHaitiPhone(phoneDigits),
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessName: formData.businessName || undefined,
        operatingCurrency: formData.operatingCurrency,
        acceptedTerms: true,
        verifyByEmail: true,
      });

      if (result.requiresEmailVerification) {
        // Defer document uploads until after email verification + login
        try {
          if (idCardFile) sessionStorage.setItem('pendingIdCardName', idCardFile.name);
          if (businessLicenseFile) sessionStorage.setItem('pendingBusinessLicenseName', businessLicenseFile.name);
        } catch { /* sessionStorage may be unavailable */ }
        toast.success(t("verificationCodeSent") || "Verification code sent to your email");
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&role=vendor`);
        return;
      }

      // Fallback path (no verification required)
      setUser(result.user);
      try {
        if (idCardFile) await vendorAPI.uploadDocument(idCardFile, "id_card");
        if (businessLicenseFile) await vendorAPI.uploadDocument(businessLicenseFile, "business_license");
      } catch {
        toast.error("Registration succeeded but document upload failed. You can upload later from your profile.");
      }
      toast.success(t("applicationSubmitted"));
      router.push("/vendor/pending");
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
        <img src="/grolotto-logo.png" alt="GroLotto" className="w-14 h-14 rounded-xl mx-auto mb-3 object-contain" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("First Name")} *</label>
                <Input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder={t("enterYourFirstName")} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Last Name")} *</label>
                <Input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder={t("enterYourLastName")} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("Email")} *</label>
              <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("yourEmail")} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("Phone Number")} *</label>
              <div className="flex items-stretch">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm select-none">
                  {HAITI_PHONE_PREFIX}
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={formatHaitiPhoneDisplay(phoneDigits)}
                  onChange={(e) => {
                    setPhoneDigits(extractHaitiDigits(e.target.value));
                    if (errors.phone) setErrors({ ...errors, phone: "" });
                  }}
                  placeholder="1234 5678"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t("haitianPhoneOnly") || "Only Haitian numbers (+509 followed by 8 digits) are accepted."}
              </p>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("dateOfBirth")} *</label>
              <Input type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
              {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("businessName")} *</label>
              <Input value={formData.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder={t("yourBusinessName")} />
              {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>}
            </div>

            {/* Operating Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("operatingCurrency") || "Operating Currency"} *</label>
              <p className="text-xs text-gray-500 mb-2">{t("vendorCurrencyNote") || "Choose which currency you want to accept"}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField("operatingCurrency", "HTG")}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.operatingCurrency === "HTG"
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
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.operatingCurrency === "USD"
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

            {/* Identity Documents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("Identity Documents") || "Identity Documents"}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {t("Identity Documents Help") || "Upload your ID card and business license (JPG/PNG/PDF, max 5MB each). Optional but speeds up approval."}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t("idCard") || "ID Card"} ({t("optional")})
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {idCardFile && (
                    <p className="text-xs text-emerald-600 mt-1">✓ {idCardFile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t("businessLicense") || "Business License"} ({t("optional")})
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setBusinessLicenseFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {businessLicenseFile && (
                    <p className="text-xs text-emerald-600 mt-1">✓ {businessLicenseFile.name}</p>
                  )}
                </div>
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

            <div>
              <label className="flex items-start gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (errors.acceptedTerms && e.target.checked) setErrors({ ...errors, acceptedTerms: "" });
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  {t("iAgreeTo") || "I agree to the"}{" "}
                  <Link href="/terms" target="_blank" className="text-emerald-600 hover:underline font-medium">
                    {t("termsAndConditions") || "Terms & Conditions"}
                  </Link>
                </span>
              </label>
              {errors.acceptedTerms && <p className="text-xs text-red-500 mt-1">{errors.acceptedTerms}</p>}
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
