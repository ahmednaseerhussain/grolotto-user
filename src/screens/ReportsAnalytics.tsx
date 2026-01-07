import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface RevenueData {
  date: string;
  revenue: number;
  bets: number;
  payouts: number;
  profit: number;
}

interface GameStats {
  gameType: string;
  totalBets: number;
  totalRevenue: number;
  totalPayouts: number;
  profit: number;
  playerCount: number;
}

const mockRevenueData: RevenueData[] = [
  { date: "2024-03-15", revenue: 12500, bets: 245, payouts: 8750, profit: 3750 },
  { date: "2024-03-14", revenue: 15200, bets: 298, payouts: 10640, profit: 4560 },
  { date: "2024-03-13", revenue: 9800, bets: 189, payouts: 6860, profit: 2940 },
  { date: "2024-03-12", revenue: 18300, bets: 356, payouts: 12810, profit: 5490 },
  { date: "2024-03-11", revenue: 11900, bets: 234, payouts: 8330, profit: 3570 },
  { date: "2024-03-10", revenue: 14600, bets: 287, payouts: 10220, profit: 4380 },
  { date: "2024-03-09", revenue: 16800, bets: 324, payouts: 11760, profit: 5040 }
];

const mockGameStats: GameStats[] = [
  { gameType: "Senp", totalBets: 1250, totalRevenue: 25000, totalPayouts: 17500, profit: 7500, playerCount: 145 },
  { gameType: "Maryaj", totalBets: 890, totalRevenue: 35600, totalPayouts: 24920, profit: 10680, playerCount: 98 },
  { gameType: "Loto 3", totalBets: 567, totalRevenue: 17010, totalPayouts: 11907, profit: 5103, playerCount: 78 },
  { gameType: "NY Lottery", totalBets: 234, totalRevenue: 46800, totalPayouts: 32760, profit: 14040, playerCount: 156 },
  { gameType: "GA Lottery", totalBets: 189, totalRevenue: 37800, totalPayouts: 26460, profit: 11340, playerCount: 123 }
];

export default function ReportsAnalytics() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [activeTab, setActiveTab] = useState<"overview" | "games" | "players">("overview");

  const totalRevenue = mockRevenueData.reduce((sum, day) => sum + day.revenue, 0);
  const totalBets = mockRevenueData.reduce((sum, day) => sum + day.bets, 0);
  const totalPayouts = mockRevenueData.reduce((sum, day) => sum + day.payouts, 0);
  const totalProfit = mockRevenueData.reduce((sum, day) => sum + day.profit, 0);

  const maxRevenue = Math.max(...mockRevenueData.map(d => d.revenue));

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Reports & Analytics</Text>
        <Pressable className="bg-blue-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Export PDF</Text>
        </Pressable>
      </View>

      {/* Period Selector */}
      <View className="flex-row bg-slate-800 border-b border-slate-700 px-4 py-3">
        {["7d", "30d", "90d"].map((period) => (
          <Pressable
            key={period}
            onPress={() => setSelectedPeriod(period as any)}
            className={`px-4 py-2 rounded-full mr-3 ${
              selectedPeriod === period ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <Text className={`font-medium ${
              selectedPeriod === period ? "text-white" : "text-slate-300"
            }`}>
              Last {period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "90 Days"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        {["overview", "games", "players"].map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 ${activeTab === tab ? "border-b-2 border-blue-500" : ""}`}
          >
            <Text className={`text-center font-medium capitalize ${
              activeTab === tab ? "text-blue-400" : "text-slate-400"
            }`}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="flex-1 p-4">
        {activeTab === "overview" && (
          <View>
            {/* Key Metrics */}
            <View className="grid grid-cols-2 gap-4 mb-6">
              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="trending-up" size={24} color="#10b981" />
                  <Text className="text-green-400 text-sm font-medium">+12.5%</Text>
                </View>
                <Text className="text-slate-400 text-sm mb-1">Total Revenue</Text>
                <Text className="text-slate-100 text-2xl font-bold">${totalRevenue.toLocaleString()}</Text>
              </View>

              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="receipt" size={24} color="#3b82f6" />
                  <Text className="text-blue-400 text-sm font-medium">+8.3%</Text>
                </View>
                <Text className="text-slate-400 text-sm mb-1">Total Bets</Text>
                <Text className="text-slate-100 text-2xl font-bold">{totalBets.toLocaleString()}</Text>
              </View>

              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="cash" size={24} color="#f59e0b" />
                  <Text className="text-yellow-400 text-sm font-medium">-5.2%</Text>
                </View>
                <Text className="text-slate-400 text-sm mb-1">Total Payouts</Text>
                <Text className="text-slate-100 text-2xl font-bold">${totalPayouts.toLocaleString()}</Text>
              </View>

              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="wallet" size={24} color="#10b981" />
                  <Text className="text-green-400 text-sm font-medium">+18.7%</Text>
                </View>
                <Text className="text-slate-400 text-sm mb-1">Net Profit</Text>
                <Text className="text-slate-100 text-2xl font-bold">${totalProfit.toLocaleString()}</Text>
              </View>
            </View>

            {/* Revenue Chart */}
            <View className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
              <Text className="text-slate-100 text-lg font-semibold mb-4">Daily Revenue</Text>
              <View className="h-40 justify-end">
                <View className="flex-row items-end justify-between h-32">
                  {mockRevenueData.map((day, index) => (
                    <View key={index} className="flex-1 mx-1 items-center">
                      <View 
                        className="bg-blue-500 w-full rounded-t"
                        style={{
                          height: (day.revenue / maxRevenue) * 120
                        }}
                      />
                      <Text className="text-slate-400 text-xs mt-2 transform -rotate-45">
                        {day.date.split('-')[2]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Daily Breakdown */}
            <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <Text className="text-slate-100 text-lg font-semibold mb-4">Daily Breakdown</Text>
              {mockRevenueData.slice(0, 5).map((day) => (
                <View key={day.date} className="flex-row justify-between items-center py-3 border-b border-slate-700 last:border-b-0">
                  <Text className="text-slate-300">{day.date}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-slate-400 text-sm mr-4">{day.bets} bets</Text>
                    <Text className="text-green-400 font-medium">${day.profit.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === "games" && (
          <View>
            <Text className="text-slate-100 text-lg font-semibold mb-4">Game Performance</Text>
            {mockGameStats.map((game) => (
              <View key={game.gameType} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-slate-100 font-semibold text-lg">{game.gameType}</Text>
                  <Text className="text-green-400 font-bold">${game.profit.toLocaleString()}</Text>
                </View>

                <View className="flex-row justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Revenue</Text>
                    <Text className="text-slate-100 font-medium">${game.totalRevenue.toLocaleString()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Bets</Text>
                    <Text className="text-slate-100 font-medium">{game.totalBets.toLocaleString()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-sm mb-1">Players</Text>
                    <Text className="text-slate-100 font-medium">{game.playerCount}</Text>
                  </View>
                </View>

                <View className="bg-slate-700 rounded-lg p-2">
                  <View className="flex-row justify-between text-xs">
                    <Text className="text-slate-400">Payout Rate</Text>
                    <Text className="text-yellow-400">
                      {((game.totalPayouts / game.totalRevenue) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === "players" && (
          <View>
            <Text className="text-slate-100 text-lg font-semibold mb-4">Player Analytics</Text>
            
            <View className="grid grid-cols-2 gap-4 mb-6">
              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <Text className="text-slate-400 text-sm mb-1">Active Players</Text>
                <Text className="text-slate-100 text-2xl font-bold">1,247</Text>
                <Text className="text-green-400 text-sm">+23 this week</Text>
              </View>

              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <Text className="text-slate-400 text-sm mb-1">New Signups</Text>
                <Text className="text-slate-100 text-2xl font-bold">89</Text>
                <Text className="text-blue-400 text-sm">This week</Text>
              </View>

              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <Text className="text-slate-400 text-sm mb-1">Avg Bet Size</Text>
                <Text className="text-slate-100 text-2xl font-bold">$12.50</Text>
                <Text className="text-yellow-400 text-sm">+$1.20</Text>
              </View>

              <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <Text className="text-slate-400 text-sm mb-1">Retention Rate</Text>
                <Text className="text-slate-100 text-2xl font-bold">78.5%</Text>
                <Text className="text-green-400 text-sm">30-day</Text>
              </View>
            </View>

            <View className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <Text className="text-slate-100 text-lg font-semibold mb-4">Top Players (by Revenue)</Text>
              {["Jean Baptiste", "Marie Claire", "Pierre Louis", "Sophie Duval", "Michel Jean"].map((name, index) => (
                <View key={name} className="flex-row justify-between items-center py-3 border-b border-slate-700 last:border-b-0">
                  <View className="flex-row items-center">
                    <View className="bg-blue-600 w-8 h-8 rounded-full items-center justify-center mr-3">
                      <Text className="text-white text-sm font-bold">{index + 1}</Text>
                    </View>
                    <Text className="text-slate-300">{name}</Text>
                  </View>
                  <Text className="text-green-400 font-medium">${(2500 - index * 300).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Export Options */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <Pressable className="flex-1 bg-green-600 py-3 rounded-lg mr-2">
            <Text className="text-white text-center font-medium">Export Excel</Text>
          </Pressable>
          <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg ml-2">
            <Text className="text-white text-center font-medium">Email Report</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}