import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { lotteryAPI, getErrorMessage } from "../api/apiClient";

interface LotteryRound {
  id: string;
  drawState: string;
  drawDate: string;
  drawTime: string;
  status: "open" | "closed" | "completed";
  winningNumbers: Record<string, number[]> | null;
  totalBets: number;
  totalPayouts: number;
  totalTickets: number;
  publishedAt: string | null;
}

const GAME_TYPES = [
  { key: "senp", label: "Senp", digits: 1, description: "1 number (0-99)" },
  { key: "maryaj", label: "Maryaj", digits: 2, description: "2 numbers (0-99)" },
  { key: "loto3", label: "Loto 3", digits: 3, description: "3 digits (0-9)" },
  { key: "loto4", label: "Loto 4", digits: 4, description: "4 digits (0-9)" },
  { key: "loto5", label: "Loto 5", digits: 5, description: "5 digits (0-9)" },
];

const STATE_FLAGS: Record<string, string> = {
  NY: "🗽", FL: "🏖️", GA: "🍑", TX: "🤠", PA: "🔔", CT: "🍂", TN: "🎸", NJ: "🏙️",
};

export default function ResultPublishing() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [rounds, setRounds] = useState<LotteryRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"open" | "completed">("open");
  const [selectedRound, setSelectedRound] = useState<LotteryRound | null>(null);
  const [winningNumbers, setWinningNumbers] = useState<Record<string, string>>({});

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const response = await lotteryAPI.getLotteryRounds();
      const data = Array.isArray(response) ? response : response.data || [];
      setRounds(data as LotteryRound[]);
    } catch (error) {
      console.error("Failed to load rounds:", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const openRounds = rounds.filter(r => r.status === "open" || r.status === "closed");
  const completedRounds = rounds.filter(r => r.status === "completed");

  const handleGenerateRandom = async () => {
    try {
      const randomNums = await lotteryAPI.generateRandomNumbers();
      const mapped: Record<string, string> = {};
      for (const [gameType, nums] of Object.entries(randomNums)) {
        mapped[gameType] = (nums as number[]).join("-");
      }
      setWinningNumbers(mapped);
    } catch (error) {
      Alert.alert("Error", "Failed to generate random numbers: " + getErrorMessage(error));
    }
  };

  const handlePublish = async () => {
    if (!selectedRound) return;

    // Validate at least one game type has winning numbers
    const validEntries: Record<string, number[]> = {};
    for (const [gameType, numStr] of Object.entries(winningNumbers)) {
      if (numStr && numStr.trim()) {
        const nums = numStr.split("-").map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        if (nums.length > 0) {
          validEntries[gameType] = nums;
        }
      }
    }

    if (Object.keys(validEntries).length === 0) {
      Alert.alert("Error", "Please enter winning numbers for at least one game type.");
      return;
    }

    Alert.alert(
      "Confirm Publish",
      `Publish results for ${selectedRound.drawState} round?\n\nThis will:\n• Check all ${selectedRound.totalTickets} tickets against winning numbers\n• Calculate multiplier-based payouts\n• Deduct payouts from vendor balances\n• Charge admin commission (10%) to vendors\n• Credit winner wallets\n• Send notifications\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          style: "destructive",
          onPress: async () => {
            try {
              setPublishing(true);
              const result = await lotteryAPI.publishResults(
                selectedRound.drawState,
                validEntries,
                selectedRound.drawDate
              );
              Alert.alert(
                "Results Published! 🎉",
                `State: ${selectedRound.drawState}\nTickets checked: ${result.totalTickets || 0}\nWinners: ${result.winnerCount || 0}\nTotal payouts: $${(result.totalPayouts || 0).toFixed(2)}\nAdmin commission: $${(result.totalAdminCommission || 0).toFixed(2)}`,
                [{ text: "OK" }]
              );
              setSelectedRound(null);
              setWinningNumbers({});
              await fetchRounds();
            } catch (error) {
              Alert.alert("Publish Failed", getErrorMessage(error));
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-slate-400 mt-4">Loading rounds...</Text>
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
        <Pressable onPress={fetchRounds} className="bg-slate-700 px-3 py-2 rounded-lg">
          <Ionicons name="refresh" size={20} color="#10b981" />
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        <Pressable
          onPress={() => setSelectedTab("open")}
          className={`flex-1 py-4 ${selectedTab === "open" ? "border-b-2 border-green-500" : ""}`}
        >
          <Text className={`text-center font-medium ${selectedTab === "open" ? "text-green-400" : "text-slate-400"}`}>
            Open Rounds ({openRounds.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab("completed")}
          className={`flex-1 py-4 ${selectedTab === "completed" ? "border-b-2 border-green-500" : ""}`}
        >
          <Text className={`text-center font-medium ${selectedTab === "completed" ? "text-green-400" : "text-slate-400"}`}>
            Completed ({completedRounds.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Selected Round — Publish Form */}
        {selectedRound && (
          <View className="bg-slate-800 rounded-xl p-4 mb-6 border-2 border-green-500">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <Text className="text-2xl mr-2">{STATE_FLAGS[selectedRound.drawState] || "🎯"}</Text>
                <View className="flex-1">
                  <Text className="text-slate-100 font-bold text-lg">
                    {selectedRound.drawState} — Publish Results
                  </Text>
                  <Text className="text-slate-400 text-sm">
                    {selectedRound.drawDate} • {selectedRound.totalTickets} tickets • ${(selectedRound.totalBets || 0).toFixed(2)} total bets
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => { setSelectedRound(null); setWinningNumbers({}); }}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </Pressable>
            </View>

            {/* Generate Random Numbers */}
            <Pressable
              onPress={handleGenerateRandom}
              className="bg-purple-600 py-3 rounded-lg mb-4 flex-row items-center justify-center"
            >
              <Ionicons name="dice" size={20} color="white" />
              <Text className="text-white font-medium ml-2">Generate Random Numbers</Text>
            </Pressable>

            {/* Winning Numbers Inputs */}
            {GAME_TYPES.map(game => (
              <View key={game.key} className="mb-3">
                <Text className="text-slate-300 text-sm mb-1">
                  {game.label} ({game.description})
                </Text>
                <TextInput
                  placeholder={`e.g. ${game.digits === 1 ? "42" : game.digits === 2 ? "12-67" : Array.from({length: game.digits}, (_, i) => i+1).join("-")}`}
                  placeholderTextColor="#64748b"
                  value={winningNumbers[game.key] || ""}
                  onChangeText={(text) => setWinningNumbers(prev => ({ ...prev, [game.key]: text }))}
                  keyboardType="numeric"
                  className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
                />
              </View>
            ))}

            {/* Publish Button */}
            <Pressable
              onPress={handlePublish}
              disabled={publishing}
              className={`py-4 rounded-lg mt-2 flex-row items-center justify-center ${publishing ? "bg-gray-600" : "bg-green-600"}`}
            >
              {publishing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Publish Results</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Round Cards */}
        {selectedTab === "open" && openRounds.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="calendar-outline" size={64} color="#64748b" />
            <Text className="text-slate-400 text-lg mt-4">No open rounds</Text>
            <Text className="text-slate-500 text-center mt-2">
              Rounds are created automatically when players place bets.
            </Text>
          </View>
        )}

        {selectedTab === "completed" && completedRounds.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="trophy-outline" size={64} color="#64748b" />
            <Text className="text-slate-400 text-lg mt-4">No completed rounds</Text>
            <Text className="text-slate-500 text-center mt-2">
              Publish results for open rounds to see them here.
            </Text>
          </View>
        )}

        {(selectedTab === "open" ? openRounds : completedRounds).map((round) => (
          <View key={round.id} className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
            {/* Round Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">{STATE_FLAGS[round.drawState] || "🎯"}</Text>
                <View>
                  <Text className="text-slate-100 font-semibold text-lg">{round.drawState}</Text>
                  <Text className="text-slate-400 text-sm">{round.drawDate} • {round.drawTime || "midday"}</Text>
                </View>
              </View>
              <View className={`px-3 py-1 rounded-full ${
                round.status === "completed" ? "bg-green-600" : round.status === "closed" ? "bg-yellow-600" : "bg-blue-600"
              }`}>
                <Text className="text-white text-xs font-medium capitalize">{round.status}</Text>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row bg-slate-700/50 rounded-lg p-3 mb-3">
              <View className="flex-1 items-center">
                <Text className="text-slate-400 text-xs">Tickets</Text>
                <Text className="text-slate-100 font-bold text-lg">{round.totalTickets || 0}</Text>
              </View>
              <View className="flex-1 items-center border-l border-slate-600">
                <Text className="text-slate-400 text-xs">Total Bets</Text>
                <Text className="text-green-400 font-bold text-lg">${(round.totalBets || 0).toFixed(2)}</Text>
              </View>
              {round.status === "completed" && (
                <View className="flex-1 items-center border-l border-slate-600">
                  <Text className="text-slate-400 text-xs">Payouts</Text>
                  <Text className="text-yellow-400 font-bold text-lg">${(round.totalPayouts || 0).toFixed(2)}</Text>
                </View>
              )}
            </View>

            {/* Winning Numbers (for completed rounds) */}
            {round.status === "completed" && round.winningNumbers && (
              <View className="bg-slate-700 rounded-lg p-3 mb-3">
                <Text className="text-slate-400 text-xs mb-2">Winning Numbers</Text>
                {Object.entries(round.winningNumbers).map(([gameType, nums]) => (
                  <View key={gameType} className="flex-row items-center mb-1">
                    <Text className="text-slate-300 font-medium w-20 capitalize">{gameType}:</Text>
                    <View className="flex-row">
                      {(nums as number[]).map((n, i) => (
                        <View key={i} className="bg-green-600 w-8 h-8 rounded-full items-center justify-center mx-1">
                          <Text className="text-white font-bold text-sm">{n}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Publish Button (for open/closed rounds) */}
            {round.status !== "completed" && (
              <Pressable
                onPress={() => {
                  setSelectedRound(round);
                  setWinningNumbers({});
                }}
                className="bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="trophy" size={18} color="white" />
                <Text className="text-white font-medium ml-2">
                  {round.totalTickets > 0 ? `Publish Results (${round.totalTickets} tickets)` : "Publish Results"}
                </Text>
              </Pressable>
            )}

            {/* Published date */}
            {round.publishedAt && (
              <Text className="text-slate-500 text-xs mt-2 text-center">
                Published: {new Date(round.publishedAt).toLocaleString()}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}