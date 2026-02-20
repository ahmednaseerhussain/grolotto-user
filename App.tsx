import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreens from "./src/screens/OnboardingScreens";
import { useAppStore } from "./src/state/appStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const hasCompletedOnboarding = useAppStore(s => s.hasCompletedOnboarding);
  const fetchAppSettings = useAppStore(s => s.fetchAppSettings);

  // Fetch app settings on startup
  useEffect(() => {
    fetchAppSettings();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SplashScreen onComplete={handleSplashComplete} />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // After splash, show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <OnboardingScreens />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Finally show main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
