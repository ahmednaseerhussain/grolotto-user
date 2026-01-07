import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdminNavigator from "./src/navigation/AdminNavigator";
import AdminLogin from "./src/screens/AdminLogin";
import { useAppStore } from "./src/state/appStore";

export default function AdminApp() {
  const [isLoading, setIsLoading] = useState(true);
  const user = useAppStore(s => s.user);

  // Simulate loading the app state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading splash
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={80} color="#3b82f6" />
            </View>
            <Text style={styles.loadingTitle}>GroLoto Admin</Text>
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
          </View>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show admin login if not authenticated or not admin
  const isAuthenticated = user && user.role === "admin";

  if (!isAuthenticated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AdminLogin />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show admin dashboard if authenticated
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AdminNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    backgroundColor: "#dbeafe",
    padding: 30,
    borderRadius: 60,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
  },
});