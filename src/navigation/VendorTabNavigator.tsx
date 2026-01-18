import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import VendorDashboard from "../screens/VendorDashboard";
import VendorPlayHistory from "../screens/VendorPlayHistory";
import VendorProfile from "../screens/VendorProfile";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

const Tab = createBottomTabNavigator();

export default function VendorTabNavigator() {
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
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 58 + Math.max(insets.bottom, 8),
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "History") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={VendorDashboard}
        options={{
          tabBarLabel: t("dashboard"),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={VendorPlayHistory}
        options={{
          tabBarLabel: t("history"),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={VendorProfile}
        options={{
          tabBarLabel: t("profile"),
        }}
      />
    </Tab.Navigator>
  );
}
