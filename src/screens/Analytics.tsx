import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

type TimeFilter = "today" | "week" | "month" | "all";

export default function Analytics() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  const vendors = useAppStore(s => s.vendors);
  const allUsers = useAppStore(s => s.allUsers);
  const gamePlays = useAppStore(s => s.gamePlays);
  const getSystemStats = useAppStore(s => s.getSystemStats);
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalGames: 0,
    totalPlayers: 0,
    activeVendors: 0,
    avgBetAmount: 0,
    winRate: 0,
    topGame: "",
    revenueGrowth: 0,
    userGrowth: 0
  });
  
  const t = (key: string) => getTranslation(key as any, language);
  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  useEffect(() => {
    calculateAnalytics();
  }, [timeFilter, gamePlays, allUsers, vendors]);

  const calculateAnalytics = () => {
    const now = new Date();
    let startDate = new Date();
    
    // Set date range based on filter
    switch (timeFilter) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "all":
        startDate = new Date(0);
        break;
    }

    // Filter game plays by time range
    const filteredGamePlays = gamePlays.filter(play => 
      new Date(play.timestamp) >= startDate
    );

    // Calculate metrics
    const totalRevenue = filteredGamePlays.reduce((sum, play) => sum + play.betAmount, 0);
    const totalGames = filteredGamePlays.length;
    const uniquePlayerIds = new Set(filteredGamePlays.map(play => play.vendorId)).size;
    const activeVendors = vendors.filter(v => v.isActive).length;
    const avgBetAmount = totalGames > 0 ? totalRevenue / totalGames : 0;
    const wonGames = filteredGamePlays.filter(play => play.status === "won").length;
    const winRate = totalGames > 0 ? (wonGames / totalGames) * 100 : 0;

    // Find most popular game
    const gameTypes = filteredGamePlays.reduce((acc, play) => {
      acc[play.gameType] = (acc[play.gameType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topGame = Object.keys(gameTypes).reduce((a, b) => 
      gameTypes[a] > gameTypes[b] ? a : b
    , "senp");

    // Calculate growth (compare with previous period)
    let previousStartDate = new Date(startDate);
    let previousEndDate = new Date(startDate);
    
    const timeDiff = now.getTime() - startDate.getTime();
    previousStartDate = new Date(startDate.getTime() - timeDiff);
    
    const previousGamePlays = gamePlays.filter(play => {
      const playDate = new Date(play.timestamp);
      return playDate >= previousStartDate && playDate < startDate;
    });
    
    const previousRevenue = previousGamePlays.reduce((sum, play) => sum + play.betAmount, 0);
    const revenueGrowth = previousRevenue > 0 ? 
      ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // User growth calculation (simplified)
    const userGrowth = timeFilter !== "all" ? Math.random() * 20 - 5 : 0; // Mock growth

    setAnalyticsData({
      totalRevenue,
      totalGames,
      totalPlayers: uniquePlayerIds,
      activeVendors,
      avgBetAmount,
      winRate,
      topGame: topGame.toUpperCase(),
      revenueGrowth,
      userGrowth
    });
  };

  const timeFilterOptions: { key: TimeFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "7 Days" },
    { key: "month", label: "30 Days" },
    { key: "all", label: "All Time" }
  ];

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return "trending-up";
    if (growth < 0) return "trending-down";
    return "remove";
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-blue-600">
              GROLOTTO ADMIN
            </Text>
            <Text className="text-2xl font-bold text-gray-800">
              Analytics
            </Text>
          </View>
          <Pressable
            onPress={calculateAnalytics}
            className="bg-blue-600 rounded-xl px-4 py-2"
          >
            <Ionicons name="refresh" size={20} color="white" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Time Filter */}
        <View className="mx-6 mt-6">
          <Text className="text-lg font-bold text-gray-800 mb-3">Time Range</Text>
          <View className="flex-row space-x-2">
            {timeFilterOptions.map(option => (
              <Pressable
                key={option.key}
                onPress={() => setTimeFilter(option.key)}
                className={`px-4 py-2 rounded-lg border ${
                  timeFilter === option.key
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text className={`font-medium ${
                  timeFilter === option.key ? "text-white" : "text-gray-700"
                }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Key Metrics */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">Key Metrics</Text>
          
          <View className="grid grid-cols-2 gap-4">
            <View className="bg-green-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-3xl font-bold text-green-600">
                  {getCurrencySymbol()}{analyticsData.totalRevenue.toLocaleString()}
                </Text>
                <Ionicons name={getGrowthIcon(analyticsData.revenueGrowth)} size={20} className={getGrowthColor(analyticsData.revenueGrowth)} />
              </View>
              <Text className="text-green-700 font-medium">Total Revenue</Text>
              <Text className={`text-sm ${getGrowthColor(analyticsData.revenueGrowth)}`}>
                {analyticsData.revenueGrowth > 0 ? "+" : ""}{analyticsData.revenueGrowth.toFixed(1)}%
              </Text>
            </View>
            
            <View className="bg-blue-50 rounded-xl p-4">
              <Text className="text-3xl font-bold text-blue-600">
                {analyticsData.totalGames.toLocaleString()}
              </Text>
              <Text className="text-blue-700 font-medium">Total Games</Text>
              <Text className="text-blue-600 text-sm">
                Avg: {getCurrencySymbol()}{analyticsData.avgBetAmount.toFixed(0)}
              </Text>
            </View>
            
            <View className="bg-purple-50 rounded-xl p-4">
              <Text className="text-3xl font-bold text-purple-600">
                {analyticsData.totalPlayers}
              </Text>
              <Text className="text-purple-700 font-medium">Active Players</Text>
              <Text className={`text-sm ${getGrowthColor(analyticsData.userGrowth)}`}>
                {analyticsData.userGrowth > 0 ? "+" : ""}{analyticsData.userGrowth.toFixed(1)}%
              </Text>
            </View>
            
            <View className="bg-orange-50 rounded-xl p-4">
              <Text className="text-3xl font-bold text-orange-600">
                {analyticsData.winRate.toFixed(1)}%
              </Text>
              <Text className="text-orange-700 font-medium">Win Rate</Text>
              <Text className="text-orange-600 text-sm">
                Top Game: {analyticsData.topGame}
              </Text>
            </View>
          </View>
        </View>

        {/* System Overview */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">System Overview</Text>
          
          <View className="space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">Total Users</Text>
              <Text className="text-gray-800 font-bold">{allUsers.length}</Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">Active Vendors</Text>
              <Text className="text-gray-800 font-bold">{analyticsData.activeVendors}</Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">Verified Users</Text>
              <Text className="text-gray-800 font-bold">
                {allUsers.filter(u => u.isVerified).length}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">System Commission</Text>
              <Text className="text-gray-800 font-bold">
                {getCurrencySymbol()}{(analyticsData.totalRevenue * 0.1).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Game Performance */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">Game Performance</Text>
          
          {["senp", "maryaj", "loto3", "loto4", "loto5"].map(game => {
            const gameGames = gamePlays.filter(play => play.gameType === game);
            const gameRevenue = gameGames.reduce((sum, play) => sum + play.betAmount, 0);
            const gameCount = gameGames.length;
            const percentage = analyticsData.totalGames > 0 ? 
              (gameCount / analyticsData.totalGames) * 100 : 0;
            
            return (
              <View key={game} className="mb-4">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-medium text-gray-800 uppercase">{game}</Text>
                  <Text className="text-gray-600">
                    {gameCount} games ({percentage.toFixed(1)}%)
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                    <View 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </View>
                  <Text className="text-gray-800 font-medium">
                    {getCurrencySymbol()}{gameRevenue.toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Revenue Trends */}
        <View className="mx-6 mt-6 mb-6 bg-white rounded-2xl p-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-800 mb-4">Recent Activity</Text>
          
          {gamePlays.slice(-5).reverse().map((play, index) => (
            <View key={play.id} className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <View className="flex-1">
                <Text className="font-medium text-gray-800 uppercase">
                  {play.gameType} - {play.numbers.join(", ")}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {new Date(play.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-gray-800">
                  {getCurrencySymbol()}{play.betAmount}
                </Text>
                <View className={`px-2 py-1 rounded-full ${
                  play.status === "won" ? "bg-green-100" : 
                  play.status === "lost" ? "bg-red-100" : "bg-yellow-100"
                }`}>
                  <Text className={`text-xs font-medium ${
                    play.status === "won" ? "text-green-700" : 
                    play.status === "lost" ? "text-red-700" : "text-yellow-700"
                  }`}>
                    {play.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          
          {gamePlays.length === 0 && (
            <View className="py-8 items-center">
              <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-2">No game data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}