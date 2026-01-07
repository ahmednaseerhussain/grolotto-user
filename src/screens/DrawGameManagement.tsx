import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

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

const mockGameTypes: GameType[] = [
  { id: "1", name: "Senp", type: "senp", isActive: true, drawTime: "20:00", maxNumber: 99, minBet: 1, maxBet: 100, commission: 15 },
  { id: "2", name: "Maryaj", type: "maryaj", isActive: true, drawTime: "20:00", maxNumber: 99, minBet: 2, maxBet: 200, commission: 20 },
  { id: "3", name: "Loto 3", type: "loto3", isActive: true, drawTime: "19:30", maxNumber: 999, minBet: 1, maxBet: 50, commission: 25 },
  { id: "4", name: "Loto 4", type: "loto4", isActive: false, drawTime: "19:30", maxNumber: 9999, minBet: 1, maxBet: 25, commission: 30 },
  { id: "5", name: "Loto 5", type: "loto5", isActive: false, drawTime: "19:30", maxNumber: 99999, minBet: 1, maxBet: 10, commission: 35 }
];

const mockStateLotteries: StateLottery[] = [
  { id: "1", state: "NY", name: "New York Lottery", isActive: true, drawDays: ["Mon", "Wed", "Sat"], drawTime: "23:00" },
  { id: "2", state: "GA", name: "Georgia Lottery", isActive: true, drawDays: ["Tue", "Fri"], drawTime: "23:00" },
  { id: "3", state: "FL", name: "Florida Lottery", isActive: true, drawDays: ["Wed", "Sat"], drawTime: "23:00" },
  { id: "4", state: "TX", name: "Texas Lottery", isActive: false, drawDays: ["Mon", "Thu", "Sat"], drawTime: "22:00" }
];

export default function DrawGameManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [gameTypes, setGameTypes] = useState<GameType[]>(mockGameTypes);
  const [stateLotteries, setStateLotteries] = useState<StateLottery[]>(mockStateLotteries);
  const [activeTab, setActiveTab] = useState<"games" | "states">("games");

  const toggleGameStatus = (gameId: string) => {
    setGameTypes(prev => prev.map(game => 
      game.id === gameId ? { ...game, isActive: !game.isActive } : game
    ));
  };

  const toggleStateStatus = (stateId: string) => {
    setStateLotteries(prev => prev.map(state => 
      state.id === stateId ? { ...state, isActive: !state.isActive } : state
    ));
  };

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

      <ScrollView className="flex-1 p-4">
        {activeTab === "games" ? (
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