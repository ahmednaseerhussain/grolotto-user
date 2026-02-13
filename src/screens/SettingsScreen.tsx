import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, Language, Currency } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { authAPI } from "../api/apiClient";

const languages = [
  { code: "ht" as Language, name: "Kreyòl Ayisyen", flag: "🇭🇹", nativeName: "Kreyòl" },
  { code: "en" as Language, name: "English", flag: "🇺🇸", nativeName: "English" },
  { code: "fr" as Language, name: "Français", flag: "🇫🇷", nativeName: "Français" },
  { code: "es" as Language, name: "Español", flag: "🇪🇸", nativeName: "Español" },
];

const currencies = [
  { code: "HTG" as Currency, name: "Haitian Gourde", symbol: "G", flag: "🇭🇹" },
  { code: "USD" as Currency, name: "US Dollar", symbol: "$", flag: "🇺🇸" },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  const setLanguage = useAppStore(s => s.setLanguage);
  const setCurrency = useAppStore(s => s.setCurrency);
  const logout = useAppStore(s => s.logout);
  
  const t = (key: string) => getTranslation(key as any, language);
  
  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    Alert.alert(t("success"), t("languageUpdated"));
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    Alert.alert(t("success"), t("currencyUpdated"));
  };

  const handleLogout = () => {
    Alert.alert(
      t("confirmLogout"),
      t("areYouSureSignOut"),
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: t("signOut"), 
          style: "destructive",
          onPress: async () => { await authAPI.logout(); logout(); }
        }
      ]
    );
  };

  const clearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear stored data and may improve performance. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          onPress: async () => {
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.clear();
              Alert.alert("Success", "Cache cleared successfully. Restart the app.");
            } catch { Alert.alert("Error", "Failed to clear cache"); }
          }
        }
      ]
    );
  };

  const getCurrentLanguageName = () => {
    return languages.find(l => l.code === language)?.nativeName || "English";
  };

  const getCurrentCurrencyName = () => {
    return currencies.find(c => c.code === currency)?.name || "US Dollar";
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-yellow-600">
              GROLOTTO
            </Text>
            <Text className="text-2xl font-bold text-gray-800">
              {t("settings")}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          {/* User Info */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Pressable
              onPress={() => (navigation as any).navigate("EditProfileScreen")}
              className="flex-row items-center"
            >
              <View className="bg-yellow-100 rounded-full p-3 mr-4">
                <Ionicons 
                  name={user?.role === "vendor" ? "business" : "person"} 
                  size={24} 
                  color="#ca8a04" 
                />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  {user?.name}
                </Text>
                <Text className="text-gray-600 capitalize">
                  {user?.role} Account
                </Text>
                <Text className="text-gray-500 text-sm">
                  {user?.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ca8a04" />
            </Pressable>
          </View>

          {/* Language Settings */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Language / Langue / Idioma
            </Text>
            <Text className="text-gray-600 mb-3">
              Current: {getCurrentLanguageName()}
            </Text>
            <View className="space-y-2">
              {languages.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  className={`p-3 rounded-xl border flex-row items-center ${
                    language === lang.code
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="text-xl mr-3">{lang.flag}</Text>
                  <Text
                    className={`text-base font-medium flex-1 ${
                      language === lang.code
                        ? "text-yellow-600"
                        : "text-gray-700"
                    }`}
                  >
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color="#ca8a04" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Currency Settings */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              {t("currency")}
            </Text>
            <Text className="text-gray-600 mb-3">
              Current: {getCurrentCurrencyName()}
            </Text>
            <View className="space-y-2">
              {currencies.map((curr) => (
                <Pressable
                  key={curr.code}
                  onPress={() => handleCurrencyChange(curr.code)}
                  className={`p-3 rounded-xl border flex-row items-center ${
                    currency === curr.code
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="text-xl mr-3">{curr.flag}</Text>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-medium ${
                        currency === curr.code
                          ? "text-green-600"
                          : "text-gray-700"
                      }`}
                    >
                      {curr.name}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {curr.symbol} ({curr.code})
                    </Text>
                  </View>
                  {currency === curr.code && (
                    <Ionicons name="checkmark" size={20} color="#16a34a" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* App Preferences */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Preferences
            </Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-800">
                    Push Notifications
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Get notified about results and promotions
                  </Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: "#e5e7eb", true: "#fbbf24" }}
                  thumbColor={notifications ? "#ca8a04" : "#9ca3af"}
                />
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-800">
                    Auto-play Results
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Automatically advance advertisement slides
                  </Text>
                </View>
                <Switch
                  value={autoPlay}
                  onValueChange={setAutoPlay}
                  trackColor={{ false: "#e5e7eb", true: "#16a34a" }}
                  thumbColor={autoPlay ? "#15803d" : "#9ca3af"}
                />
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-800">
                    Biometric Authentication
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Use fingerprint or face ID to sign in
                  </Text>
                </View>
                <Switch
                  value={biometric}
                  onValueChange={setBiometric}
                  trackColor={{ false: "#e5e7eb", true: "#8b5cf6" }}
                  thumbColor={biometric ? "#7c3aed" : "#9ca3af"}
                />
              </View>
            </View>
          </View>

          {/* Financial Settings */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Financial Settings
            </Text>

            <Pressable
              onPress={() => (navigation as any).navigate("PaymentProfileScreen")}
              className="flex-row items-center p-3 rounded-xl bg-blue-50 mb-3 border border-blue-200"
            >
              <Ionicons name="card-outline" size={24} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-800">
                  Payment & Payout Methods
                </Text>
                <Text className="text-gray-600 text-sm">
                  Manage deposit and withdrawal methods
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
            </Pressable>

            <Pressable
              onPress={() => (navigation as any).navigate("TransactionHistory")}
              className="flex-row items-center p-3 rounded-xl bg-gray-50 mb-3"
            >
              <Ionicons name="receipt-outline" size={24} color="#6b7280" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-800">
                  Transaction History
                </Text>
                <Text className="text-gray-600 text-sm">
                  View all your transactions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          </View>

          {/* App Actions */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              App Management
            </Text>
            
            <Pressable
              onPress={clearCache}
              className="flex-row items-center p-3 rounded-xl bg-gray-50 mb-3"
            >
              <Ionicons name="refresh-outline" size={24} color="#6b7280" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-800">
                  Clear Cache
                </Text>
                <Text className="text-gray-600 text-sm">
                  Free up storage space
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable
              onPress={() => Alert.alert("Info", "GROLOTTO v1.0.0\nBuilt with ❤️ for Haitian lottery players")}
              className="flex-row items-center p-3 rounded-xl bg-gray-50 mb-3"
            >
              <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-800">
                  About GROLOTTO
                </Text>
                <Text className="text-gray-600 text-sm">
                  Version and app information
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            className="bg-red-500 rounded-2xl py-4 px-6 mb-6"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text className="text-white text-center font-bold text-lg ml-2">
                {t("logout")}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}