import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../state/appStore";
import { Vendor, VendorDocument } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { authAPI, vendorAPI, getErrorMessage } from "../api/apiClient";

export default function VendorRegistration() {
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

  const [documents, setDocuments] = useState<{
    idCard: VendorDocument | null;
    businessLicense: VendorDocument | null;
  }>({
    idCard: null,
    businessLicense: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const addVendor = useAppStore(s => s.addVendor);
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = t("firstNameRequired");
    if (!formData.lastName.trim()) newErrors.lastName = t("lastNameRequired");
    if (!formData.email.trim()) newErrors.email = t("emailRequired");
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t("invalidEmail");
    if (!formData.phone.trim()) newErrors.phone = t("phoneRequired");
    if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = t("dobRequired");
    if (!formData.password) newErrors.password = t("passwordRequired");
    else if (formData.password.length < 6) newErrors.password = t("minimum6Chars");
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("passwordsDontMatch");
    }
    // Documents are optional until upload endpoint is available

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // First register the user account
      const authData = await authAPI.register({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        role: 'vendor',
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
      });

      // Then submit vendor registration details
      await vendorAPI.registerVendor({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        businessName: formData.businessName || undefined,
        operatingCurrency: formData.operatingCurrency,
      });

      // Set user in store so the app navigates to authenticated state
      // Vendor status will be 'pending' — dashboard will show pending message
      useAppStore.getState().setUser(authData.user);

      Alert.alert(
        t("applicationSubmitted"),
        t("applicationSubmittedMsg"),
        [{ text: "OK" }]
      );

    } catch (error) {
      Alert.alert(t("error"), getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = (type: "idCard" | "businessLicense") => {
    // Document upload requires a file picker + backend upload endpoint
    // For now, show a placeholder indicating the document was "selected"
    Alert.alert(
      t("documentUpload"),
      t("documentUploadMsg"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("continueWithoutDocument"),
          onPress: () => {
            const placeholder: VendorDocument = {
              type: type === "idCard" ? "id_card" : "business_license",
              url: `pending-${type}`,
              uploadedAt: Date.now(),
              verified: false,
            };
            setDocuments(prev => ({
              ...prev,
              [type]: placeholder,
            }));
          },
        },
      ]
    );
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="#1f2937" />
        <Text style={styles.headerTitle}>{t("vendorRegistration")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>{t("personalInfo")}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("firstName")} *</Text>
            <TextInput
              style={[styles.input, errors.firstName ? styles.inputError : null]}
              value={formData.firstName}
              onChangeText={(value) => updateFormData("firstName", value)}
              placeholder={t("enterYourFirstName")}
              placeholderTextColor="#9ca3af"
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("lastName")} *</Text>
            <TextInput
              style={[styles.input, errors.lastName ? styles.inputError : null]}
              value={formData.lastName}
              onChangeText={(value) => updateFormData("lastName", value)}
              placeholder={t("enterYourLastName")}
              placeholderTextColor="#9ca3af"
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("email")} *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              placeholder={t("yourEmail")}
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("phoneNumber")} *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              value={formData.phone}
              onChangeText={(value) => updateFormData("phone", value)}
              placeholder="+509 1234 5678"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("dateOfBirth")} *</Text>
            <TextInput
              style={[styles.input, errors.dateOfBirth ? styles.inputError : null]}
              value={formData.dateOfBirth}
              onChangeText={(value) => updateFormData("dateOfBirth", value)}
              placeholder={t("dateFormatPlaceholder")}
              placeholderTextColor="#9ca3af"
            />
            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("businessName")} ({t("optional")})</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(value) => updateFormData("businessName", value)}
              placeholder={t("yourBusinessName")}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Operating Currency *</Text>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
              This cannot be changed after registration
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                style={[
                  styles.input,
                  { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
                  formData.operatingCurrency === "HTG" && { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)" },
                ]}
                onPress={() => updateFormData("operatingCurrency", "HTG")}
              >
                <Text style={{ fontSize: 18 }}>🇭🇹</Text>
                <Text style={[styles.label, { marginBottom: 0, fontWeight: formData.operatingCurrency === "HTG" ? "700" : "500" }]}>
                  HTG (Gourde)
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.input,
                  { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
                  formData.operatingCurrency === "USD" && { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)" },
                ]}
                onPress={() => updateFormData("operatingCurrency", "USD")}
              >
                <Text style={{ fontSize: 18 }}>🇺🇸</Text>
                <Text style={[styles.label, { marginBottom: 0, fontWeight: formData.operatingCurrency === "USD" ? "700" : "500" }]}>
                  USD (Dollar)
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>{t("requiredDocuments")}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("idCard")}</Text>
            <Pressable 
              style={[styles.uploadButton, documents.idCard ? styles.uploadButtonSuccess : null]}
              onPress={() => handleDocumentUpload("idCard")}
            >
              <Ionicons 
                name={documents.idCard ? "checkmark-circle" : "cloud-upload"} 
                size={20} 
                color={documents.idCard ? "#10b981" : "#6b7280"} 
              />
              <Text style={[styles.uploadButtonText, documents.idCard ? styles.uploadButtonSuccessText : null]}>
                {documents.idCard ? t("idCardUploaded") : t("uploadIdCard")}
              </Text>
            </Pressable>
            {errors.idCard && <Text style={styles.errorText}>{errors.idCard}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("businessLicense")}</Text>
            <Pressable 
              style={[styles.uploadButton, documents.businessLicense ? styles.uploadButtonSuccess : null]}
              onPress={() => handleDocumentUpload("businessLicense")}
            >
              <Ionicons 
                name={documents.businessLicense ? "checkmark-circle" : "cloud-upload"} 
                size={20} 
                color={documents.businessLicense ? "#10b981" : "#6b7280"} 
              />
              <Text style={[styles.uploadButtonText, documents.businessLicense ? styles.uploadButtonSuccessText : null]}>
                {documents.businessLicense ? t("businessLicenseUploaded") : t("uploadBusinessLicense")}
              </Text>
            </Pressable>
            {errors.businessLicense && <Text style={styles.errorText}>{errors.businessLicense}</Text>}
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>{t("security")}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("password")} *</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={formData.password}
              onChangeText={(value) => updateFormData("password", value)}
              placeholder={t("minimum6Chars")}
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("confirmPassword")} *</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData("confirmPassword", value)}
              placeholder={t("repeatPassword")}
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <Pressable 
            style={[styles.submitButton, isLoading ? styles.submitButtonDisabled : null]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? t("submitting") : t("submitApplication")}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </Pressable>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              {t("applicationReviewText")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderStyle: "dashed",
  },
  uploadButtonSuccess: {
    borderColor: "#10b981",
    backgroundColor: "#ecfdf5",
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
  },
  uploadButtonSuccessText: {
    color: "#10b981",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 8,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoText: {
    fontSize: 13,
    color: "#1e40af",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});