import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Switch, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminAPI, getErrorMessage } from "../api/apiClient";

interface GameType {
  id: string;
  name: string;
  type: "senp" | "maryaj" | "loto3" | "loto4" | "loto5";
  isActive: boolean;
  drawTime: string;
  maxNumber: number;
  minBet: number;
  maxBet: number;
  commission: number;
}

interface StateLottery {
  id: string;
  state: string;
  name: string;
  isActive: boolean;
  drawDays: string[];
  drawTime: string;
}

export default function DrawGameManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [stateLotteries, setStateLotteries] = useState<StateLottery[]>([]);
  const [activeTab, setActiveTab] = useState<"games" | "states">("games");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const settings = await adminAPI.getAppSettings();

      if (settings?.gameTypes && Array.isArray(settings.gameTypes)) {
        setGameTypes(settings.gameTypes);
      } else {
        const defaults: GameType[] = [
          { id: "senp", name: "Senp", type: "senp", isActive: settings?.senp_enabled !== false, drawTime: settings?.senp_drawTime || "20:00", maxNumber: 99, minBet: Number(settings?.senp_minBet) || 1, maxBet: Number(settings?.senp_maxBet) || 100, commission: Number(settings?.senp_commission) || 15 },
          { id: "maryaj", name: "Maryaj", type: "maryaj", isActive: settings?.maryaj_enabled !== false, drawTime: settings?.maryaj_drawTime || "20:00", maxNumber: 99, minBet: Number(settings?.maryaj_minBet) || 2, maxBet: Number(settings?.maryaj_maxBet) || 200, commission: Number(settings?.maryaj_commission) || 20 },
          { id: "loto3", name: "Lotto 3", type: "loto3", isActive: settings?.loto3_enabled !== false, drawTime: settings?.loto3_drawTime || "19:30", maxNumber: 999, minBet: Number(settings?.loto3_minBet) || 1, maxBet: Number(settings?.loto3_maxBet) || 50, commission: Number(settings?.loto3_commission) || 25 },
          { id: "loto4", name: "Lotto 4", type: "loto4", isActive: settings?.loto4_enabled !== false, drawTime: settings?.loto4_drawTime || "19:30", maxNumber: 9999, minBet: Number(settings?.loto4_minBet) || 1, maxBet: Number(settings?.loto4_maxBet) || 25, commission: Number(settings?.loto4_commission) || 30 },
          { id: "loto5", name: "Lotto 5", type: "loto5", isActive: settings?.loto5_enabled !== false, drawTime: settings?.loto5_drawTime || "19:30", maxNumber: 99999, minBet: Number(settings?.loto5_minBet) || 1, maxBet: Number(settings?.loto5_maxBet) || 10, commission: Number(settings?.loto5_commission) || 35 },
        ];
        setGameTypes(defaults);
      }

      if (settings?.stateLotteries && Array.isArray(settings.stateLotteries)) {
        setStateLotteries(settings.stateLotteries);
      } else {
        const defaultStates: StateLottery[] = [
          { id: "NY", state: "NY", name: "New York Lottery", isActive: settings?.NY_enabled !== false, drawDays: settings?.NY_drawDays || ["Mon", "Wed", "Sat"], drawTime: settings?.NY_drawTime || "23:00" },
          { id: "GA", state: "GA", name: "Georgia Lottery", isActive: settings?.GA_enabled !== false, drawDays: settings?.GA_drawDays || ["Tue", "Fri"], drawTime: settings?.GA_drawTime || "23:00" },
          { id: "FL", state: "FL", name: "Florida Lottery", isActive: settings?.FL_enabled !== false, drawDays: settings?.FL_drawDays || ["Wed", "Sat"], drawTime: settings?.FL_drawTime || "23:00" },
          { id: "TX", state: "TX", name: "Texas Lottery", isActive: settings?.TX_enabled !== false, drawDays: settings?.TX_drawDays || ["Mon", "Thu", "Sat"], drawTime: settings?.TX_drawTime || "22:00" },
        ];
        setStateLotteries(defaultStates);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleGameStatus = useCallback(async (gameId: string) => {
    const game = gameTypes.find(g => g.id === gameId);
    if (!game) return;
    try {
      await adminAPI.updateAppSetting(`${game.type}_enabled`, String(!game.isActive));
      setGameTypes(prev => prev.map(g =>
        g.id === gameId ? { ...g, isActive: !g.isActive } : g
      ));
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    }
  }, [gameTypes]);

  const toggleStateStatus = useCallback(async (stateId: string) => {
    const st = stateLotteries.find(s => s.id === stateId);
    if (!st) return;
    try {
      await adminAPI.updateAppSetting(`${st.state}_enabled`, String(!st.isActive));
      setStateLotteries(prev => prev.map(s =>
        s.id === stateId ? { ...s, isActive: !s.isActive } : s
      ));
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    }
  }, [stateLotteries]);

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Draw & Game Management</Text>
        <Pressable className="bg-blue-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Add New</Text>
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        <Pressable
          onPress={() => setActiveTab("games")}
          className={`flex-1 py-4 ${activeTab === "games" ? "border-b-2 border-blue-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "games" ? "text-blue-400" : "text-slate-400"
          }`}>
            Game Types ({gameTypes.filter(g => g.isActive).length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("states")}
          className={`flex-1 py-4 ${activeTab === "states" ? "border-b-2 border-blue-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "states" ? "text-blue-400" : "text-slate-400"
          }`}>
            State Lotteries ({stateLotteries.filter(s => s.isActive).length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#60a5fa" />
        }
      >
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 mt-4">Loading game settings...</Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text className="text-red-400 mt-4 text-center">{error}</Text>
            <Pressable onPress={fetchData} className="mt-4 bg-blue-600 px-6 py-3 rounded-lg">
              <Text className="text-white font-medium">Retry</Text>
            </Pressable>
          </View>
        ) : activeTab === "games" ? (
          /* Game Types Tab */
          <View>
            <Text className="text-slate-300 text-lg font-semibold mb-4">Local Game Types</Text>
            {gameTypes.map((game) => (
              <View key={game.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-slate-100 font-semibold text-lg">{game.name}</Text>
                    <Text className="text-slate-400 text-sm">Draw Time: {game.drawTime}</Text>
                  </View>
                  <Switch
                    value={game.isActive}
                    onValueChange={() => toggleGameStatus(game.id)}
                    trackColor={{ false: "#374151", true: "#3b82f6" }}
                    thumbColor={game.isActive ? "#ffffff" : "#9ca3af"}
                  />
                </View>

                <View className="flex-row justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Max Number</Text>
                    <Text className="text-slate-100 font-medium">{game.maxNumber}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Min Bet</Text>
                    <Text className="text-slate-100 font-medium">${game.minBet}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Max Bet</Text>
                    <Text className="text-slate-100 font-medium">${game.maxBet}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Commission</Text>
                    <Text className="text-yellow-400 font-medium">{game.commission}%</Text>
                  </View>
                </View>

                <View className="flex-row justify-between">
                  <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg mr-2">
                    <Text className="text-white text-center font-medium">Edit Settings</Text>
                  </Pressable>
                  <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                    <Text className="text-slate-300 text-center font-medium">View History</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* State Lotteries Tab */
          <View>
            <Text className="text-slate-300 text-lg font-semibold mb-4">US State Lotteries</Text>
            {stateLotteries.map((state) => (
              <View key={state.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-slate-100 font-semibold text-lg">
                      {state.state} - {state.name}
                    </Text>
                    <Text className="text-slate-400 text-sm">Draw Time: {state.drawTime}</Text>
                  </View>
                  <Switch
                    value={state.isActive}
                    onValueChange={() => toggleStateStatus(state.id)}
                    trackColor={{ false: "#374151", true: "#3b82f6" }}
                    thumbColor={state.isActive ? "#ffffff" : "#9ca3af"}
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-slate-400 text-sm mb-2">Draw Days</Text>
                  <View className="flex-row flex-wrap">
                    {state.drawDays.map((day) => (
                      <View key={day} className="bg-blue-600 px-3 py-1 rounded-full mr-2 mb-1">
                        <Text className="text-white text-sm font-medium">{day}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="flex-row justify-between">
                  <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg mr-2">
                    <Text className="text-white text-center font-medium">Configure</Text>
                  </Pressable>
                  <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                    <Text className="text-slate-300 text-center font-medium">View Results</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Quick Stats */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active Games</Text>
            <Text className="text-green-400 text-xl font-bold">
              {gameTypes.filter(g => g.isActive).length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active States</Text>
            <Text className="text-blue-400 text-xl font-bold">
              {stateLotteries.filter(s => s.isActive).length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Games</Text>
            <Text className="text-slate-100 text-xl font-bold">
              {gameTypes.length + stateLotteries.length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}