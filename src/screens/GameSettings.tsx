import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { adminAPI, getErrorMessage } from "../api/apiClient";

export default function GameSettings() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  const appSettings = useAppStore(s => s.appSettings);
  
  const [localSettings, setLocalSettings] = useState(appSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  
  const t = (key: string) => getTranslation(key as any, language);
  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  // Fetch game settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getAppSettings();
        const settings = response.data || response;
        if (settings) {
          setLocalSettings(settings);
        }
      } catch (error) {
        console.error("Failed to load settings:", getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSetting = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateGameAvailability = (game: string, enabled: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      gameAvailability: {
        ...prev.gameAvailability,
        [game]: enabled
      }
    }));
    setHasChanges(true);
  };

  const toggleState = (state: string) => {
    const updatedStates = localSettings.allowedStates.includes(state)
      ? localSettings.allowedStates.filter(s => s !== state)
      : [...localSettings.allowedStates, state];
    
    updateSetting("allowedStates", updatedStates);
  };

  const saveSettings = async () => {
    try {
      const entries = Object.entries(localSettings);
      for (const [key, value] of entries) {
        await adminAPI.updateAppSetting(key, JSON.stringify(value));
      }
      setHasChanges(false);
      setSuccessMessage("Game settings updated successfully!");
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error) {
      console.error("Failed to save settings:", getErrorMessage(error));
    }
  };

  const resetSettings = () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    const defaultSettings = {
      maintenanceMode: false,
      minBetAmount: 1,
      maxBetAmount: 10000,
      systemCommission: 0.1,
      allowedStates: ["GA", "NY", "FL", "CT", "MA", "NJ"],
      gameAvailability: {
        senp: true,
        maryaj: true,
        loto3: true,
        loto4: true,
        loto5: true,
      }
    };
    setLocalSettings(defaultSettings);
    setHasChanges(true);
    setShowResetModal(false);
  };

  const availableStates = ["GA", "NY", "FL", "CT", "MA", "NJ", "PA", "CA", "TX", "NC", "SC", "VA"];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-4">Loading settings...</Text>
      </SafeAreaView>
    );
  }

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
            <Text className="text-lg font-bold text-blue-600">
              GROLOTTO ADMIN
            </Text>
            <Text className="text-2xl font-bold text-gray-800">
              Game Settings
            </Text>
          </View>
          {hasChanges && (
            <Pressable
              onPress={saveSettings}
              className="bg-blue-600 rounded-xl px-4 py-2"
            >
              <Text className="text-white font-medium">Save</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* System Status */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">System Status</Text>
          
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-800 font-medium">Maintenance Mode</Text>
              <Text className="text-gray-600 text-sm">
                Temporarily disable all game activities
              </Text>
            </View>
            <Pressable
              onPress={() => updateSetting("maintenanceMode", !localSettings.maintenanceMode)}
              className={`w-12 h-6 rounded-full ${
                localSettings.maintenanceMode ? "bg-red-500" : "bg-green-500"
              }`}
            >
              <View className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                localSettings.maintenanceMode ? "ml-6" : "ml-0.5"
              }`} />
            </Pressable>
          </View>
        </View>

        {/* Betting Limits */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">Betting Limits</Text>
          
          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Minimum Bet Amount ({getCurrencySymbol()})
              </Text>
              <TextInput
                value={localSettings.minBetAmount.toString()}
                onChangeText={(text) => updateSetting("minBetAmount", parseInt(text) || 1)}
                keyboardType="numeric"
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="1"
              />
            </View>
            
            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Maximum Bet Amount ({getCurrencySymbol()})
              </Text>
              <TextInput
                value={localSettings.maxBetAmount.toString()}
                onChangeText={(text) => updateSetting("maxBetAmount", parseInt(text) || 10000)}
                keyboardType="numeric"
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="10000"
              />
            </View>
            
            <View>
              <Text className="text-gray-700 font-medium mb-2">
                System Commission (%)
              </Text>
              <TextInput
                value={(localSettings.systemCommission * 100).toString()}
                onChangeText={(text) => updateSetting("systemCommission", (parseFloat(text) || 10) / 100)}
                keyboardType="numeric"
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="10"
              />
            </View>
          </View>
        </View>

        {/* Game Availability */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">Game Availability</Text>
          
          <View className="space-y-4">
            {Object.entries(localSettings.gameAvailability).map(([game, enabled]) => (
              <View key={game} className="flex-row items-center justify-between">
                <View>
                  <Text className="text-gray-800 font-medium uppercase">{game}</Text>
                  <Text className="text-gray-600 text-sm">
                    {game === "senp" ? "Two-digit lottery (00-99)" :
                     game === "maryaj" ? "Two-digit marriage lottery" :
                     game === "loto3" ? "Three-digit lottery" :
                     game === "loto4" ? "Four-digit lottery" :
                     "Five-digit lottery"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => updateGameAvailability(game, !enabled)}
                  className={`w-12 h-6 rounded-full ${
                    enabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <View className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                    enabled ? "ml-6" : "ml-0.5"
                  }`} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Allowed States */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">Allowed States</Text>
          <Text className="text-gray-600 mb-4">
            Select states where the lottery system is available
          </Text>
          
          <View className="flex-row flex-wrap">
            {availableStates.map(state => (
              <Pressable
                key={state}
                onPress={() => toggleState(state)}
                className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                  localSettings.allowedStates.includes(state)
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text className={`font-medium ${
                  localSettings.allowedStates.includes(state) ? "text-white" : "text-gray-700"
                }`}>
                  {state}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View className="mx-6 mt-6 mb-6 space-y-4">
          <Pressable
            onPress={resetSettings}
            className="bg-gray-500 rounded-xl py-4 px-6"
          >
            <Text className="text-white text-center font-bold text-lg">
              Reset to Defaults
            </Text>
          </Pressable>
          
          {hasChanges && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="#d97706" />
                <Text className="text-yellow-700 font-medium ml-2">
                  You have unsaved changes
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="bg-yellow-100 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Ionicons name="warning" size={32} color="#d97706" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mb-2">Reset Settings</Text>
              <Text className="text-gray-600 text-center">
                Are you sure you want to reset all settings to default values?
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => setShowResetModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-800 text-center font-medium">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={confirmReset}
                className="flex-1 bg-red-600 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-medium">Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      {successMessage !== "" && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center">
              <View className="bg-green-100 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mb-2">Success!</Text>
              <Text className="text-gray-600 text-center">{successMessage}</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}