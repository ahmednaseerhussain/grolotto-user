import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

export default function LoginEntryScreen() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => navigation.navigate("LanguageCurrencySelector" as never)}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="ticket" size={48} color="white" />
          </View>
          <Text style={styles.title}>GROLOTTO</Text>
          <Text style={styles.welcome}>
            {t("welcome")}
          </Text>
          <Text style={styles.subtitle}>
            {t("chooseRole")}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {/* Player Option */}
          <Pressable
            onPress={() => navigation.navigate("PlayerLogin" as never)}
            style={styles.optionCard}
          >
            <View style={styles.playerIcon}>
              <Ionicons name="person" size={24} color="#ca8a04" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                {t("playLottery")}
              </Text>
              <Text style={styles.optionDescription}>
                {t("playerDesc")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6b7280" />
          </Pressable>

          {/* Vendor Option */}
          <Pressable
            onPress={() => navigation.navigate("VendorLogin" as never)}
            style={styles.optionCard}
          >
            <View style={styles.vendorIcon}>
              <Ionicons name="business" size={24} color="#16a34a" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                {t("manageLottery")}
              </Text>
              <Text style={styles.optionDescription}>
                {t("vendorDesc")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6b7280" />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure • Trusted • Licensed
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e40af", // Blue background
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  welcome: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    color: "#bfdbfe",
    fontSize: 18,
    textAlign: "center",
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  playerIcon: {
    backgroundColor: "#fef3c7",
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  vendorIcon: {
    backgroundColor: "#dcfce7",
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: "#1f2937",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  optionDescription: {
    color: "#6b7280",
    fontSize: 16,
  },
  footer: {
    marginTop: 48,
  },
  footerText: {
    color: "#bfdbfe",
    textAlign: "center",
    fontSize: 14,
  },
});