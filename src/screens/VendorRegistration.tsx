import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../state/appStore";
import { Vendor, VendorDocument } from "../state/appStore";

export default function VendorRegistration() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    businessName: "",
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "Prénom requis";
    if (!formData.lastName.trim()) newErrors.lastName = "Non requis";
    if (!formData.email.trim()) newErrors.email = "Email requis";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email invalide";
    if (!formData.phone.trim()) newErrors.phone = "Numéro téléphone requis";
    if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = "Date de naissance requise";
    if (!formData.password) newErrors.password = "Mot de passe requis";
    else if (formData.password.length < 6) newErrors.password = "Minimum 6 caractères";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mots de passe ne correspondent pas";
    }
    if (!documents.idCard) newErrors.idCard = "Carte d'identité requise";
    if (!documents.businessLicense) newErrors.businessLicense = "Licence d'affaires requise";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const newVendor: Vendor = {
        id: Date.now().toString(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        businessName: formData.businessName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        
        status: "pending",
        applicationDate: Date.now(),
        
        documents: [documents.idCard!, documents.businessLicense!],
        
        draws: {
          NY: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          FL: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          GA: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          TX: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          PA: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          CT: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          TN: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
          NJ: { enabled: false, games: { senp: { enabled: true, minAmount: 1, maxAmount: 100 }, maryaj: { enabled: false, minAmount: 1, maxAmount: 100 }, loto3: { enabled: false, minAmount: 1, maxAmount: 100 }, loto4: { enabled: false, minAmount: 1, maxAmount: 100 }, loto5: { enabled: false, minAmount: 1, maxAmount: 100 } } },
        },
        
        totalRevenue: 0,
        availableBalance: 0,
        totalPlayers: 0,
        rating: 0,
        totalTicketsSold: 0,
        isActive: false,
      };

      addVendor(newVendor);
      
      Alert.alert(
        "Demande soumise",
        "Votre demande d'inscription vendeur a été soumise. Vous recevrez un email lorsque votre compte sera approuvé.",
        [{ text: "OK" }]
      );

    } catch (error) {
      Alert.alert("Erreur", "Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = (type: "idCard" | "businessLicense") => {
    // In a real app, this would open document picker
    const mockDocument: VendorDocument = {
      type: type === "idCard" ? "id_card" : "business_license",
      url: `mock-${type}-${Date.now()}.jpg`,
      uploadedAt: Date.now(),
      verified: false,
    };
    
    setDocuments(prev => ({
      ...prev,
      [type]: mockDocument,
    }));
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
        <Text style={styles.headerTitle}>Inscription Vendeur</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={[styles.input, errors.firstName ? styles.inputError : null]}
              value={formData.firstName}
              onChangeText={(value) => updateFormData("firstName", value)}
              placeholder="Entrez votre prénom"
              placeholderTextColor="#9ca3af"
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Non *</Text>
            <TextInput
              style={[styles.input, errors.lastName ? styles.inputError : null]}
              value={formData.lastName}
              onChangeText={(value) => updateFormData("lastName", value)}
              placeholder="Entrez votre nom de famille"
              placeholderTextColor="#9ca3af"
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              placeholder="votre@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de téléphone *</Text>
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
            <Text style={styles.label}>Date de naissance *</Text>
            <TextInput
              style={[styles.input, errors.dateOfBirth ? styles.inputError : null]}
              value={formData.dateOfBirth}
              onChangeText={(value) => updateFormData("dateOfBirth", value)}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor="#9ca3af"
            />
            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d'entreprise (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(value) => updateFormData("businessName", value)}
              placeholder="Nom de votre entreprise"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Documents requis</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Carte d'identité *</Text>
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
                {documents.idCard ? "Carte d'identité téléchargée" : "Télécharger carte d'identité"}
              </Text>
            </Pressable>
            {errors.idCard && <Text style={styles.errorText}>{errors.idCard}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Licence d'affaires *</Text>
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
                {documents.businessLicense ? "Licence d'affaires téléchargée" : "Télécharger licence d'affaires"}
              </Text>
            </Pressable>
            {errors.businessLicense && <Text style={styles.errorText}>{errors.businessLicense}</Text>}
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Sécurité</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={formData.password}
              onChangeText={(value) => updateFormData("password", value)}
              placeholder="Minimum 6 caractères"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer mot de passe *</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData("confirmPassword", value)}
              placeholder="Répétez le mot de passe"
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
              {isLoading ? "Soumission en cours..." : "Soumettre la demande"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </Pressable>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Votre demande sera examinée par notre équipe. Vous recevrez un email de confirmation dans les 24-48 heures.
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