import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { 
  subscribeToDraws, 
  createDraw, 
  updateDraw 
} from "../api/firebase-service";

interface DrawResult {
  id: string;
  gameType: string;
  drawDate: string;
  drawTime: string;
  winningNumbers: string;
  status: "published" | "pending" | "draft";
  publishedAt?: string;
  jackpot?: number;
}

const mockResults: DrawResult[] = [];

export default function ResultPublishing() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"today" | "pending" | "history">("today");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [newResult, setNewResult] = useState({
    gameType: "",
    winningNumbers: "",
    jackpot: ""
  });

  // Subscribe to real-time Firebase draws
  useEffect(() => {
    const unsubscribe = subscribeToDraws((draws) => {
      setResults(draws as DrawResult[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const publishResult = async (resultId: string) => {
    try {
      await updateDraw(resultId, { 
        status: "published", 
        publishedAt: new Date().toISOString() 
      });
      setSuccessMessage("Result published and notifications sent!");
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error) {
      setErrorMessage("Failed to publish result. Please try again.");
    }
  };

  const createNewResult = async () => {
    if (!newResult.gameType || !newResult.winningNumbers) {
      setErrorMessage("Please fill in game type and winning numbers");
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }

    try {
      const drawId = `draw-${Date.now()}`;
      const today = new Date().toISOString().split("T")[0];
      const currentTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const drawData = {
        id: drawId,
        gameType: newResult.gameType,
        drawDate: today,
        date: new Date().toISOString(),
        drawTime: currentTime,
        winningNumbers: newResult.winningNumbers,
        jackpot: newResult.jackpot ? parseInt(newResult.jackpot) : 0,
        status: "published",
        publishedAt: new Date().toISOString()
      };

      console.log("[ResultPublishing] Creating draw with data:", JSON.stringify(drawData, null, 2));
      await createDraw(drawData);
      console.log("[ResultPublishing] Draw created successfully!");

      setSuccessMessage("Result published successfully!");
      setNewResult({ gameType: "", winningNumbers: "", jackpot: "" });
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error) {
      console.error("[ResultPublishing] Error creating draw:", error);
      setErrorMessage(`Failed to create result: ${(error as any)?.message || 'Unknown error'}`);
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  const getStatusColor = (status: DrawResult["status"]) => {
    switch (status) {
      case "published": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "draft": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const filteredResults = results.filter(result => {
    const today = new Date().toISOString().split("T")[0];
    switch (selectedTab) {
      case "today": return result.drawDate === today;
      case "pending": return result.status === "pending" || result.status === "draft";
      case "history": return result.status === "published";
      default: return true;
    }
  });

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-slate-400 mt-4">Loading results...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Result Publishing</Text>
        <Pressable className="bg-green-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Quick Add</Text>
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        {["today", "pending", "history"].map(tab => (
          <Pressable
            key={tab}
            onPress={() => setSelectedTab(tab as any)}
            className={`flex-1 py-4 ${selectedTab === tab ? "border-b-2 border-green-500" : ""}`}
          >
            <Text className={`text-center font-medium capitalize ${
              selectedTab === tab ? "text-green-400" : "text-slate-400"
            }`}>
              {tab} ({tab === "today" ? results.filter(r => r.drawDate === new Date().toISOString().split("T")[0]).length 
                   : tab === "pending" ? results.filter(r => r.status !== "published").length
                   : results.filter(r => r.status === "published").length})
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Quick Add Form */}
        {selectedTab === "today" && (
          <View className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
            <Text className="text-slate-100 font-semibold text-lg mb-4">Quick Add Result</Text>
            
            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Game Type</Text>
              <TextInput
                placeholder="e.g., Senp, Maryaj, Loto 3"
                placeholderTextColor="#64748b"
                value={newResult.gameType}
                onChangeText={(text) => setNewResult(prev => ({ ...prev, gameType: text }))}
                className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Winning Numbers</Text>
              <TextInput
                placeholder="e.g., 45 or 23-67 or 147"
                placeholderTextColor="#64748b"
                value={newResult.winningNumbers}
                onChangeText={(text) => setNewResult(prev => ({ ...prev, winningNumbers: text }))}
                className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Jackpot Amount ($)</Text>
              <TextInput
                placeholder="e.g., 2500"
                placeholderTextColor="#64748b"
                value={newResult.jackpot}
                onChangeText={(text) => setNewResult(prev => ({ ...prev, jackpot: text }))}
                keyboardType="numeric"
                className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="flex-row justify-between">
              <Pressable className="flex-1 bg-slate-600 py-3 rounded-lg mr-2">
                <Text className="text-slate-300 text-center font-medium">Save Draft</Text>
              </Pressable>
              <Pressable 
                onPress={createNewResult}
                className="flex-1 bg-green-600 py-3 rounded-lg ml-2"
              >
                <Text className="text-white text-center font-medium">Publish Now</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Results List */}
        {filteredResults.map((result) => (
          <View key={result.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
            {/* Result Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-slate-100 font-semibold text-lg">{result.gameType}</Text>
                <Text className="text-slate-400 text-sm">{result.drawDate} at {result.drawTime}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${getStatusColor(result.status)}`}>
                <Text className="text-white text-xs font-medium capitalize">{result.status}</Text>
              </View>
            </View>

            {/* Winning Numbers */}
            <View className="bg-slate-700 rounded-lg p-4 mb-4">
              <Text className="text-slate-400 text-sm mb-2">Winning Numbers</Text>
              <Text className="text-white text-3xl font-bold text-center tracking-wider">
                {result.winningNumbers}
              </Text>
            </View>

            {/* Details */}
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-slate-400 text-sm mb-1">Jackpot</Text>
                <Text className="text-green-400 font-semibold text-lg">
                  ${result.jackpot?.toLocaleString() || "0"}
                </Text>
              </View>
              {result.publishedAt && (
                <View>
                  <Text className="text-slate-400 text-sm mb-1">Published</Text>
                  <Text className="text-slate-100">{result.publishedAt}</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-between">
              {result.status !== "published" ? (
                <Pressable 
                  onPress={() => publishResult(result.id)}
                  className="flex-1 bg-green-600 py-3 rounded-lg mr-2"
                >
                  <Text className="text-white text-center font-medium">Publish & Notify</Text>
                </Pressable>
              ) : (
                <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg mr-2">
                  <Text className="text-white text-center font-medium">Resend Notifications</Text>
                </Pressable>
              )}
              
              <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                <Text className="text-slate-300 text-center font-medium">Edit</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {filteredResults.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="calendar-outline" size={64} color="#64748b" />
            <Text className="text-slate-400 text-lg mt-4">No results found</Text>
            <Text className="text-slate-500 text-center mt-2">
              {selectedTab === "today" && "No draws scheduled for today"}
              {selectedTab === "pending" && "No pending results to publish"}
              {selectedTab === "history" && "No published results yet"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg mr-2">
            <Text className="text-white text-center font-medium">Upload Draw Slip</Text>
          </Pressable>
          <Pressable className="flex-1 bg-purple-600 py-3 rounded-lg ml-2">
            <Text className="text-white text-center font-medium">Batch Import</Text>
          </Pressable>
        </View>
      </View>

      {/* Success Modal */}
      {successMessage !== "" && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-green-500">
            <View className="items-center">
              <View className="bg-green-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              </View>
              <Text className="text-xl font-bold text-slate-100 mb-2">Success!</Text>
              <Text className="text-slate-400 text-center">{successMessage}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Error Modal */}
      {errorMessage !== "" && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-red-500">
            <View className="items-center mb-4">
              <View className="bg-red-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Ionicons name="alert-circle" size={32} color="#ef4444" />
              </View>
              <Text className="text-xl font-bold text-slate-100 mb-2">Error</Text>
              <Text className="text-slate-400 text-center">{errorMessage}</Text>
            </View>
            <Pressable 
              onPress={() => setErrorMessage("")}
              className="bg-red-600 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-medium">OK</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}