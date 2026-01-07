import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface AppSetting {
  id: string;
  title: string;
  description: string;
  type: "toggle" | "text" | "number";
  value: boolean | string | number;
  category: "features" | "security" | "maintenance" | "notifications";
  icon: string;
}

const mockSettings: AppSetting[] = [
  {
    id: "maintenance_mode",
    title: "Maintenance Mode",
    description: "Temporarily disable app access for all users",
    type: "toggle",
    value: false,
    category: "maintenance",
    icon: "construct"
  },
  {
    id: "allow_new_registrations",
    title: "New User Registration",
    description: "Allow new players to create accounts",
    type: "toggle",
    value: true,
    category: "features",
    icon: "person-add"
  },
  {
    id: "enable_dream_dictionary",
    title: "Tchala Dream Dictionary",
    description: "Enable dream number lookup feature",
    type: "toggle", 
    value: true,
    category: "features",
    icon: "library"
  },
  {
    id: "max_bet_amount",
    title: "Maximum Bet Amount",
    description: "Global maximum bet limit per transaction",
    type: "number",
    value: 500,
    category: "security",
    icon: "shield-checkmark"
  },
  {
    id: "min_bet_amount",
    title: "Minimum Bet Amount",
    description: "Global minimum bet limit per transaction",
    type: "number",
    value: 1,
    category: "security",
    icon: "shield"
  },
  {
    id: "enable_push_notifications",
    title: "Push Notifications",
    description: "Send result announcements and promotions",
    type: "toggle",
    value: true,
    category: "notifications",
    icon: "notifications"
  },
  {
    id: "auto_publish_results",
    title: "Auto-Publish Results",
    description: "Automatically publish lottery results when available",
    type: "toggle",
    value: false,
    category: "features",
    icon: "timer"
  },
  {
    id: "enable_ip_blocking",
    title: "IP Address Blocking",
    description: "Block suspicious IP addresses automatically",
    type: "toggle",
    value: true,
    category: "security",
    icon: "ban"
  },
  {
    id: "daily_betting_limit",
    title: "Daily Betting Limit",
    description: "Maximum total bets per player per day",
    type: "number",
    value: 1000,
    category: "security",
    icon: "calendar"
  },
  {
    id: "maintenance_message",
    title: "Maintenance Message",
    description: "Message shown during maintenance mode",
    type: "text",
    value: "GROLOTTO is temporarily unavailable for maintenance. Please try again later.",
    category: "maintenance",
    icon: "chatbox"
  }
];

const categories = [
  { key: "features", name: "Features", color: "bg-blue-600", icon: "apps" },
  { key: "security", name: "Security", color: "bg-red-600", icon: "shield-checkmark" },
  { key: "maintenance", name: "Maintenance", color: "bg-yellow-600", icon: "construct" },
  { key: "notifications", name: "Notifications", color: "bg-purple-600", icon: "notifications" }
];

export default function GlobalAppSettings() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSetting[]>(mockSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateSetting = (settingId: string, newValue: boolean | string | number) => {
    setSettings(prev => prev.map(setting =>
      setting.id === settingId ? { ...setting, value: newValue } : setting
    ));
    setHasUnsavedChanges(true);
  };

  const saveChanges = () => {
    // Here you would save to your backend
    setHasUnsavedChanges(false);
  };

  const filteredSettings = selectedCategory === "all" 
    ? settings 
    : settings.filter(s => s.category === selectedCategory);



  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.key === category);
    return cat?.color || "bg-gray-600";
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Global App Settings</Text>
        {hasUnsavedChanges && (
          <Pressable onPress={saveChanges} className="bg-green-600 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">Save Changes</Text>
          </Pressable>
        )}
      </View>

      {/* Category Filter */}
      <View className="p-4 bg-slate-800 border-b border-slate-700">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full mr-3 ${
              selectedCategory === "all" ? "bg-slate-600" : "bg-slate-700"
            }`}
          >
            <Text className={`font-medium ${
              selectedCategory === "all" ? "text-white" : "text-slate-300"
            }`}>
              All Settings ({settings.length})
            </Text>
          </Pressable>
          
          {categories.map((category) => (
            <Pressable
              key={category.key}
              onPress={() => setSelectedCategory(category.key)}
              className={`px-4 py-2 rounded-full mr-3 ${
                selectedCategory === category.key ? category.color : "bg-slate-700"
              }`}
            >
              <Text className={`font-medium ${
                selectedCategory === category.key ? "text-white" : "text-slate-300"
              }`}>
                {category.name} ({settings.filter(s => s.category === category.key).length})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Critical Maintenance Warning */}
        {settings.find(s => s.id === "maintenance_mode")?.value && (
          <View className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning" size={24} color="#ef4444" />
              <Text className="text-red-400 font-bold text-lg ml-2">Maintenance Mode Active</Text>
            </View>
            <Text className="text-red-300">
              The app is currently in maintenance mode. All users are blocked from accessing the application.
            </Text>
          </View>
        )}

        {/* Settings List */}
        {filteredSettings.map((setting) => (
          <View key={setting.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getCategoryColor(setting.category)}`}>
                  <Ionicons name={setting.icon as any} size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-100 font-semibold text-lg">{setting.title}</Text>
                  <Text className="text-slate-400 text-sm">{setting.description}</Text>
                </View>
              </View>

              {/* Setting Control */}
              {setting.type === "toggle" && (
                <Switch
                  value={setting.value as boolean}
                  onValueChange={(value) => updateSetting(setting.id, value)}
                  trackColor={{ false: "#374151", true: "#3b82f6" }}
                  thumbColor={setting.value ? "#ffffff" : "#9ca3af"}
                />
              )}
            </View>

            {/* Text and Number Inputs */}
            {setting.type === "text" && (
              <TextInput
                value={setting.value as string}
                onChangeText={(text) => updateSetting(setting.id, text)}
                multiline
                className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600 mt-3"
                placeholder="Enter text..."
                placeholderTextColor="#64748b"
              />
            )}

            {setting.type === "number" && (
              <View className="mt-3">
                <TextInput
                  value={String(setting.value)}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    updateSetting(setting.id, num);
                  }}
                  keyboardType="numeric"
                  className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
                  placeholder="Enter number..."
                  placeholderTextColor="#64748b"
                />
              </View>
            )}

            {/* Setting Category Badge */}
            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row items-center">
                <View className={`px-3 py-1 rounded-full ${getCategoryColor(setting.category)}`}>
                  <Text className="text-white text-xs font-medium capitalize">
                    {setting.category}
                  </Text>
                </View>
              </View>

              {/* Quick Actions for Critical Settings */}
              {(setting.id === "maintenance_mode" || setting.id === "allow_new_registrations") && (
                <Pressable 
                  onPress={() => updateSetting(setting.id, !(setting.value as boolean))}
                  className={`px-4 py-2 rounded-lg ${
                    setting.value ? "bg-red-600" : "bg-green-600"
                  }`}
                >
                  <Text className="text-white text-sm font-medium">
                    {setting.value ? "Disable" : "Enable"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {filteredSettings.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="settings-outline" size={64} color="#64748b" />
            <Text className="text-slate-400 text-lg mt-4">No settings found</Text>
            <Text className="text-slate-500 text-center mt-2">
              Try selecting a different category
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Settings Summary */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-slate-400 text-sm">System Status</Text>
          {hasUnsavedChanges && (
            <Text className="text-yellow-400 text-sm">• Unsaved Changes</Text>
          )}
        </View>
        
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Maintenance</Text>
            <Text className={`text-xl font-bold ${
              settings.find(s => s.id === "maintenance_mode")?.value ? "text-red-400" : "text-green-400"
            }`}>
              {settings.find(s => s.id === "maintenance_mode")?.value ? "ON" : "OFF"}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">New Signups</Text>
            <Text className={`text-xl font-bold ${
              settings.find(s => s.id === "allow_new_registrations")?.value ? "text-green-400" : "text-red-400"
            }`}>
              {settings.find(s => s.id === "allow_new_registrations")?.value ? "ON" : "OFF"}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Max Bet</Text>
            <Text className="text-slate-100 text-xl font-bold">
              ${settings.find(s => s.id === "max_bet_amount")?.value}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}