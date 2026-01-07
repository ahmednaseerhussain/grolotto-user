import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "../state/appStore";

export default function DebugScreen() {
  const hasCompletedOnboarding = useAppStore(s => s.hasCompletedOnboarding);
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);
  
  // Reset onboarding state
  const resetOnboarding = () => {
    // Clear the persisted state by logging out and resetting onboarding
    logout();
    // We need to manually reset the onboarding flag
    useAppStore.setState({ hasCompletedOnboarding: false });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-6">
        <Text className="text-2xl font-bold text-center mb-8">Debug Screen</Text>
        
        <View className="bg-gray-100 rounded-xl p-4 mb-6">
          <Text className="font-bold text-lg mb-2">Current App State:</Text>
          <Text>Has Completed Onboarding: {hasCompletedOnboarding ? "Yes" : "No"}</Text>
          <Text>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</Text>
          <Text>User: {user ? user.name : "None"}</Text>
          <Text>User Role: {user ? user.role : "None"}</Text>
        </View>

        <Pressable
          onPress={resetOnboarding}
          className="bg-red-500 rounded-xl py-4 px-6 mb-4"
        >
          <Text className="text-white text-center font-bold">
            Reset App State (Start Over)
          </Text>
        </Pressable>
        
        <Text className="text-gray-600 text-center text-sm">
          This will clear all saved data and restart the onboarding flow
        </Text>
      </View>
    </SafeAreaView>
  );
}