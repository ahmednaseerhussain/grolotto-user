import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isEnabled: boolean;
  isDefault: boolean;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  isEnabled: boolean;
  isDefault: boolean;
}

const mockLanguages: Language[] = [
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl Ayisyen", flag: "🇭🇹", isEnabled: true, isDefault: true },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", isEnabled: true, isDefault: false },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", isEnabled: true, isDefault: false },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", isEnabled: false, isDefault: false }
];

const mockCurrencies: Currency[] = [
  { code: "HTG", name: "Haitian Gourde", symbol: "G", isEnabled: true, isDefault: true },
  { code: "USD", name: "US Dollar", symbol: "$", isEnabled: true, isDefault: false },
  { code: "EUR", name: "Euro", symbol: "€", isEnabled: false, isDefault: false }
];

export default function LanguageCurrencySettings() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [languages, setLanguages] = useState<Language[]>(mockLanguages);
  const [currencies, setCurrencies] = useState<Currency[]>(mockCurrencies);
  const [activeTab, setActiveTab] = useState<"languages" | "currencies">("languages");

  const toggleLanguage = (langCode: string) => {
    setLanguages(prev => prev.map(lang =>
      lang.code === langCode ? { ...lang, isEnabled: !lang.isEnabled } : lang
    ));
  };

  const setDefaultLanguage = (langCode: string) => {
    setLanguages(prev => prev.map(lang => ({
      ...lang,
      isDefault: lang.code === langCode,
      isEnabled: lang.code === langCode ? true : lang.isEnabled
    })));
  };

  const toggleCurrency = (currCode: string) => {
    setCurrencies(prev => prev.map(curr =>
      curr.code === currCode ? { ...curr, isEnabled: !curr.isEnabled } : curr
    ));
  };

  const setDefaultCurrency = (currCode: string) => {
    setCurrencies(prev => prev.map(curr => ({
      ...curr,
      isDefault: curr.code === currCode,
      isEnabled: curr.code === currCode ? true : curr.isEnabled
    })));
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Language & Currency</Text>
        <Pressable className="bg-indigo-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Save Changes</Text>
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        <Pressable
          onPress={() => setActiveTab("languages")}
          className={`flex-1 py-4 ${activeTab === "languages" ? "border-b-2 border-indigo-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "languages" ? "text-indigo-400" : "text-slate-400"
          }`}>
            Languages ({languages.filter(l => l.isEnabled).length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("currencies")}
          className={`flex-1 py-4 ${activeTab === "currencies" ? "border-b-2 border-indigo-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "currencies" ? "text-indigo-400" : "text-slate-400"
          }`}>
            Currencies ({currencies.filter(c => c.isEnabled).length})
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 p-4">
        {activeTab === "languages" ? (
          <View>
            <View className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
              <Text className="text-slate-100 font-semibold text-lg mb-2">Language Support</Text>
              <Text className="text-slate-400 text-sm">
                Enable multiple languages to reach a broader audience. Players can switch between enabled languages in the app.
              </Text>
            </View>

            {languages.map((language) => (
              <View key={language.code} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-2xl mr-3">{language.flag}</Text>
                    <View>
                      <Text className="text-slate-100 font-semibold text-lg">{language.name}</Text>
                      <Text className="text-slate-400 text-sm">{language.nativeName}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {language.isDefault && (
                      <View className="bg-indigo-600 px-3 py-1 rounded-full mr-3">
                        <Text className="text-white text-xs font-medium">Default</Text>
                      </View>
                    )}
                    <Switch
                      value={language.isEnabled}
                      onValueChange={() => toggleLanguage(language.code)}
                      trackColor={{ false: "#374151", true: "#6366f1" }}
                      thumbColor={language.isEnabled ? "#ffffff" : "#9ca3af"}
                    />
                  </View>
                </View>

                {language.isEnabled && (
                  <View className="flex-row justify-between">
                    <Pressable 
                      onPress={() => setDefaultLanguage(language.code)}
                      className={`flex-1 py-3 rounded-lg mr-2 ${
                        language.isDefault ? "bg-indigo-700" : "bg-indigo-600"
                      }`}
                      disabled={language.isDefault}
                    >
                      <Text className="text-white text-center font-medium">
                        {language.isDefault ? "Default Language" : "Set as Default"}
                      </Text>
                    </Pressable>

                    <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                      <Text className="text-slate-300 text-center font-medium">Translations</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            <Pressable className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-6 items-center justify-center">
              <Ionicons name="add-circle-outline" size={32} color="#64748b" />
              <Text className="text-slate-400 text-lg mt-2">Add New Language</Text>
              <Text className="text-slate-500 text-sm text-center mt-1">
                Request additional language support
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <View className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
              <Text className="text-slate-100 font-semibold text-lg mb-2">Currency Support</Text>
              <Text className="text-slate-400 text-sm">
                Enable multiple currencies for international players. All amounts will be converted automatically.
              </Text>
            </View>

            {currencies.map((currency) => (
              <View key={currency.code} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-indigo-600 w-12 h-12 rounded-full items-center justify-center mr-3">
                      <Text className="text-white font-bold text-lg">{currency.symbol}</Text>
                    </View>
                    <View>
                      <Text className="text-slate-100 font-semibold text-lg">{currency.name}</Text>
                      <Text className="text-slate-400 text-sm">{currency.code}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {currency.isDefault && (
                      <View className="bg-indigo-600 px-3 py-1 rounded-full mr-3">
                        <Text className="text-white text-xs font-medium">Default</Text>
                      </View>
                    )}
                    <Switch
                      value={currency.isEnabled}
                      onValueChange={() => toggleCurrency(currency.code)}
                      trackColor={{ false: "#374151", true: "#6366f1" }}
                      thumbColor={currency.isEnabled ? "#ffffff" : "#9ca3af"}
                    />
                  </View>
                </View>

                {currency.isEnabled && (
                  <View className="flex-row justify-between">
                    <Pressable 
                      onPress={() => setDefaultCurrency(currency.code)}
                      className={`flex-1 py-3 rounded-lg mr-2 ${
                        currency.isDefault ? "bg-indigo-700" : "bg-indigo-600"
                      }`}
                      disabled={currency.isDefault}
                    >
                      <Text className="text-white text-center font-medium">
                        {currency.isDefault ? "Default Currency" : "Set as Default"}
                      </Text>
                    </Pressable>

                    <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                      <Text className="text-slate-300 text-center font-medium">Exchange Rates</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            <Pressable className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-6 items-center justify-center">
              <Ionicons name="add-circle-outline" size={32} color="#64748b" />
              <Text className="text-slate-400 text-lg mt-2">Add New Currency</Text>
              <Text className="text-slate-500 text-sm text-center mt-1">
                Request additional currency support
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Current Settings Summary */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <Text className="text-slate-400 text-sm mb-2">Current Settings</Text>
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-slate-300">Default Language</Text>
            <Text className="text-indigo-400 font-medium">
              {languages.find(l => l.isDefault)?.name || "None"}
            </Text>
          </View>
          <View>
            <Text className="text-slate-300">Default Currency</Text>
            <Text className="text-indigo-400 font-medium">
              {currencies.find(c => c.isDefault)?.code || "None"}
            </Text>
          </View>
          <Pressable className="bg-indigo-600 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">Apply Changes</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}