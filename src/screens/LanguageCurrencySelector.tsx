import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, Language, Currency } from "../state/appStore";

const languages = [
  { code: "ht" as Language, name: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "en" as Language, name: "English", flag: "🇺🇸" },
  { code: "fr" as Language, name: "Français", flag: "🇫🇷" },
  { code: "es" as Language, name: "Español", flag: "🇪🇸" },
];

const currencies = [
  { code: "HTG" as Currency, name: "Haitian Gourde", symbol: "G", flag: "🇭🇹" },
  { code: "USD" as Currency, name: "US Dollar", symbol: "$", flag: "🇺🇸" },
];

export default function LanguageCurrencySelector() {
  const navigation = useNavigation();
  const setLanguage = useAppStore(s => s.setLanguage);
  const setCurrency = useAppStore(s => s.setCurrency);
  
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("ht");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("HTG");

  const handleContinue = () => {
    setLanguage(selectedLanguage);
    setCurrency(selectedCurrency);
    // Navigate to login entry screen
    navigation.navigate("LoginEntry" as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Select your language and currency</Text>

          {/* Language Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Language / Lang / Langue / Idioma
            </Text>
            <View style={styles.optionsContainer}>
              {languages.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => setSelectedLanguage(lang.code)}
                  style={[
                    styles.optionCard,
                    selectedLanguage === lang.code ? styles.optionCardSelected : styles.optionCardDefault
                  ]}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text style={[
                    styles.optionText,
                    selectedLanguage === lang.code ? styles.optionTextSelected : styles.optionTextDefault
                  ]}>
                    {lang.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Currency Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currency</Text>
            <View style={styles.optionsContainer}>
              {currencies.map((curr) => (
                <Pressable
                  key={curr.code}
                  onPress={() => setSelectedCurrency(curr.code)}
                  style={[
                    styles.optionCard,
                    selectedCurrency === curr.code ? styles.currencyCardSelected : styles.optionCardDefault
                  ]}
                >
                  <Text style={styles.flag}>{curr.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={[
                      styles.optionText,
                      selectedCurrency === curr.code ? styles.currencyTextSelected : styles.optionTextDefault
                    ]}>
                      {curr.name}
                    </Text>
                    <Text style={styles.currencySubtext}>
                      {curr.symbol} ({curr.code})
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Pressable onPress={handleContinue} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  optionCardDefault: {
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  optionCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  currencyCardSelected: {
    borderColor: "#10b981",
    backgroundColor: "#ecfdf5",
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionTextDefault: {
    color: "#374151",
  },
  optionTextSelected: {
    color: "#3b82f6",
  },
  currencyTextSelected: {
    color: "#10b981",
  },
  currencyInfo: {
    flex: 1,
  },
  currencySubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  buttonContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  continueButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});