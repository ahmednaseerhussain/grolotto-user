import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, Platform, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PlayerDashboard from "../screens/PlayerDashboard";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

const Tab = createBottomTabNavigator();

// Placeholder screens for Notifications and Help
const NotificationsScreen = () => {
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center">
        <Ionicons name="notifications-outline" size={64} color="#9ca3af" />
        <Text className="text-gray-600 text-lg mt-4">{t("notifications")}</Text>
        <Text className="text-gray-400 text-sm mt-2">{t("comingSoon")}</Text>
      </View>
    </SafeAreaView>
  );
};

const HelpScreen = () => {
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  return (
  <SafeAreaView className="flex-1 bg-gray-50">
    <View className="bg-white px-6 py-4 border-b border-gray-200">
      <Text className="text-2xl font-bold text-gray-800">{t("helpCenter")}</Text>
      <Text className="text-gray-600">{t("howCanWeHelp")}</Text>
    </View>
    
    <View className="p-6">
      {/* Contact Us Section */}
      <Text className="text-xl font-bold text-gray-800 mb-4">{t("contactUs")}</Text>
      
      <View className="flex-row justify-between mb-6">
        <View className="bg-white rounded-2xl p-4 flex-1 mr-2 border border-gray-200 items-center">
          <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-2">
            <Ionicons name="logo-whatsapp" size={28} color="#10b981" />
          </View>
          <Text className="text-gray-800 font-semibold">WhatsApp</Text>
          <Text className="text-gray-400 text-xs">Chat with us</Text>
        </View>
        
        <View className="bg-white rounded-2xl p-4 flex-1 mx-1 border border-gray-200 items-center">
          <View className="w-14 h-14 bg-blue-100 rounded-full items-center justify-center mb-2">
            <Ionicons name="mail" size={28} color="#3b82f6" />
          </View>
          <Text className="text-gray-800 font-semibold">Email</Text>
          <Text className="text-gray-400 text-xs text-center">support@groloto.com</Text>
        </View>
        
        <View className="bg-white rounded-2xl p-4 flex-1 ml-2 border border-gray-200 items-center">
          <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-2">
            <Ionicons name="call" size={28} color="#10b981" />
          </View>
          <Text className="text-gray-800 font-semibold">Phone</Text>
          <Text className="text-gray-400 text-xs">+1 (555) 123-4567</Text>
        </View>
      </View>
      
      {/* FAQ Section */}
      <Text className="text-xl font-bold text-gray-800 mb-4">{t("faq")}</Text>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">How do I place a bet?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">What payment methods are accepted?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">How do I withdraw my winnings?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">What are the different game types?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">When are results published?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
    </View>
  </SafeAreaView>
  );
};

export default function PlayerTabNavigator() {
  const insets = useSafeAreaInsets();
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 2,
          borderTopColor: "#e5e7eb",
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 58 + Math.max(insets.bottom, 8),
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "HomeTab") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "NotificationsTab") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "MyBetTab") {
            iconName = focused ? "ticket" : "ticket-outline";
          } else if (route.name === "HelpTab") {
            iconName = focused ? "help-circle" : "help-circle-outline";
          } else if (route.name === "SettingsTab") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={PlayerDashboard}
        options={{
          tabBarLabel: t("dashboard"),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t("notifications"),
        }}
      />
      <Tab.Screen
        name="MyBetTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: t("history"),
        }}
      />
      <Tab.Screen
        name="HelpTab"
        component={HelpScreen}
        options={{
          tabBarLabel: t("helpCenter"),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t("settings"),
        }}
      />
    </Tab.Navigator>
  );
}
