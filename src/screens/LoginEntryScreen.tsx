import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";

const getTranslation = (lang: string, key: string) => {
  const translations: any = {
    ht: {
      welcome: "Byenveni",
      chooseRole: "Chwazi kijan ou vle konekte",
      playLottery: "Jwe Loto",
      playerDesc: "Jwe ak nimewo favori ou yo",
      manageLottery: "Jere Loto",
      vendorDesc: "Jere tiraj ak klyan ou yo",
    },
    en: {
      welcome: "Welcome",
      chooseRole: "Choose how you want to connect",
      playLottery: "Play Lottery",
      playerDesc: "Play with your favorite numbers",
      manageLottery: "Manage Lottery",
      vendorDesc: "Manage draws and your clients",
    },
    fr: {
      welcome: "Bienvenue",
      chooseRole: "Choisissez comment vous connecter",
      playLottery: "Jouer à la Loterie",
      playerDesc: "Jouez avec vos numéros favoris",
      manageLottery: "Gérer la Loterie",
      vendorDesc: "Gérez les tirages et vos clients",
    },
    es: {
      welcome: "Bienvenido",
      chooseRole: "Elige cómo conectarte",
      playLottery: "Jugar Lotería",
      playerDesc: "Juega con tus números favoritos",
      manageLottery: "Administrar Lotería",
      vendorDesc: "Administra sorteos y tus clientes",
    },
  };
  return translations[lang]?.[key] || translations.en[key];
};

export default function LoginEntryScreen() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);

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
            {getTranslation(language, "welcome")}
          </Text>
          <Text style={styles.subtitle}>
            {getTranslation(language, "chooseRole")}
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
                {getTranslation(language, "playLottery")}
              </Text>
              <Text style={styles.optionDescription}>
                {getTranslation(language, "playerDesc")}
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
                {getTranslation(language, "manageLottery")}
              </Text>
              <Text style={styles.optionDescription}>
                {getTranslation(language, "vendorDesc")}
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