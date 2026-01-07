import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../state/appStore";

export default function ModernAdminLogin() {
  const setUser = useAppStore(s => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);

    // Admin credentials - multiple options for flexibility
    const validCredentials = [
      { email: "admin@groloto.com", password: "admin123" },
      { email: "admin", password: "admin123" },
      { email: "groloto", password: "admin" },
    ];

    const isValidLogin = validCredentials.some(
      cred => cred.email === email.trim() && cred.password === password.trim()
    );

    if (isValidLogin) {
      setTimeout(() => {
        setUser({
          id: "admin_master",
          email: "admin@groloto.com",
          name: "GROLOTTO Administrator",
          role: "admin",
          isVerified: true,
        });
        setIsLoading(false);
        Alert.alert("Welcome", "Access granted to GROLOTTO Admin Panel");
      }, 1500);
    } else {
      setIsLoading(false);
      Alert.alert(
        "Access Denied", 
        "Invalid credentials. Contact system administrator.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  const quickFill = () => {
    setEmail("admin@groloto.com");
    setPassword("admin123");
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <View className="items-center mb-12">
          <View className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-6 mb-6 shadow-2xl">
            <Ionicons name="shield-checkmark" size={48} color="white" />
          </View>
          <Text className="text-4xl font-black text-white mb-2 tracking-wide">
            GROLOTTO
          </Text>
          <Text className="text-xl font-bold text-blue-400 mb-2">
            ADMIN PANEL
          </Text>
          <Text className="text-gray-400 text-center">
            Secure Administrative Access Portal
          </Text>
        </View>

        {/* Login Form */}
        <View className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-2xl">
          <Text className="text-2xl font-bold text-white mb-6 text-center">
            Administrator Sign In
          </Text>
          
          {/* Email/Username Input */}
          <View className="mb-6">
            <Text className="text-gray-300 font-medium mb-2">Email / Username</Text>
            <View className="bg-slate-700/50 border border-slate-600 rounded-2xl px-4 py-4 flex-row items-center">
              <Ionicons name="person" size={20} color="#94a3b8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@groloto.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 ml-3 text-white text-base"
                style={{ fontSize: 16 }}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-gray-300 font-medium mb-2">Password</Text>
            <View className="bg-slate-700/50 border border-slate-600 rounded-2xl px-4 py-4 flex-row items-center">
              <Ionicons name="lock-closed" size={20} color="#94a3b8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                className="flex-1 ml-3 text-white text-base"
                style={{ fontSize: 16 }}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="p-1"
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#94a3b8" 
                />
              </Pressable>
            </View>
          </View>

          {/* Quick Fill Helper */}
          <Pressable
            onPress={quickFill}
            className="bg-slate-700 rounded-xl p-3 mb-6 border border-slate-600"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-blue-400 font-medium text-sm">Demo Credentials</Text>
                <Text className="text-gray-400 text-xs">Click to auto-fill login</Text>
              </View>
              <Ionicons name="flash" size={20} color="#3b82f6" />
            </View>
          </Pressable>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            className={`rounded-2xl py-4 px-6 ${
              isLoading 
                ? "bg-slate-600" 
                : "bg-gradient-to-r from-blue-600 to-purple-600"
            } shadow-lg`}
          >
            <View className="flex-row items-center justify-center">
              {isLoading && (
                <View className="mr-3">
                  <Ionicons name="sync" size={20} color="white" />
                </View>
              )}
              <Text className="text-white font-bold text-lg">
                {isLoading ? "Authenticating..." : "Sign In"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Security Notice */}
        <View className="mt-8 bg-red-900/30 border border-red-600/50 rounded-2xl p-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text className="text-red-400 font-bold ml-2">Security Notice</Text>
          </View>
          <Text className="text-red-300/90 text-sm">
            This is a restricted administrative area. All access attempts are logged 
            and monitored. Unauthorized access is strictly prohibited.
          </Text>
        </View>

        {/* Version Info */}
        <Text className="text-gray-500 text-center mt-6 text-sm">
          GROLOTTO Admin Panel v2.0 • Secure Lottery Management
        </Text>
      </View>
    </SafeAreaView>
  );
}