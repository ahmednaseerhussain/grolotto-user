import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminAPI, getErrorMessage } from "../api/apiClient";

interface Player {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  status: "active" | "suspended" | "pending";
  joinDate: string;
  totalBets: number;
  totalWinnings: number;
}

export default function PlayerManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "active" | "suspended" | "pending">("all");

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers(1, 50, "player");
      setPlayers((response.data || response) as Player[]);
    } catch (error) {
      console.error("Failed to load players:", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === "all" || player.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handlePlayerAction = async (playerId: string, action: "suspend" | "activate" | "delete") => {
    try {
      if (action === "suspend") {
        await adminAPI.suspendUser(playerId);
      } else if (action === "activate") {
        await adminAPI.activateUser(playerId);
      } else if (action === "delete") {
        await adminAPI.suspendUser(playerId);
      }
      await fetchPlayers();
    } catch (error) {
      console.error("Failed to update player:", getErrorMessage(error));
    }
  };

  const getStatusColor = (status: Player["status"]) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "suspended": return "bg-red-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 mt-4">Loading players...</Text>
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
        <Text className="text-xl font-bold text-slate-100 flex-1">Player Management</Text>
        <View className="bg-blue-600 px-3 py-1 rounded-full">
          <Text className="text-white text-sm font-medium">{filteredPlayers.length}</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="p-4 bg-slate-800 border-b border-slate-700">
        <View className="flex-row items-center bg-slate-700 rounded-lg px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search players..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-100"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["all", "active", "suspended", "pending"].map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter as any)}
              className={`px-4 py-2 rounded-full mr-3 ${
                selectedFilter === filter ? "bg-blue-600" : "bg-slate-700"
              }`}
            >
              <Text className={`font-medium capitalize ${
                selectedFilter === filter ? "text-white" : "text-slate-300"
              }`}>
                {filter} ({filter === "all" ? players.length : players.filter(p => p.status === filter).length})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Players List */}
      <ScrollView className="flex-1 p-4">
        {filteredPlayers.map((player) => (
          <View key={player.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
            {/* Player Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-100 font-semibold text-lg">{player.name}</Text>
                  <Text className="text-slate-400 text-sm">{player.email}</Text>
                </View>
              </View>
              <View className={`px-3 py-1 rounded-full ${getStatusColor(player.status)}`}>
                <Text className="text-white text-xs font-medium capitalize">{player.status}</Text>
              </View>
            </View>

            {/* Player Details */}
            <View className="flex-row justify-between mb-4">
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Balance</Text>
                <Text className="text-slate-100 font-semibold">${player.balance.toFixed(2)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Total Bets</Text>
                <Text className="text-slate-100 font-semibold">{player.totalBets}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Winnings</Text>
                <Text className="text-green-400 font-semibold">${player.totalWinnings.toFixed(2)}</Text>
              </View>
            </View>

            {/* Contact Info */}
            <View className="flex-row justify-between mb-4">
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Phone</Text>
                <Text className="text-slate-100">{player.phone}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-1">Joined</Text>
                <Text className="text-slate-100">{player.joinDate}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-between">
              <Pressable 
                onPress={() => handlePlayerAction(player.id, player.status === "active" ? "suspend" : "activate")}
                className={`flex-1 py-3 rounded-lg mr-2 ${
                  player.status === "active" ? "bg-red-600" : "bg-green-600"
                }`}
              >
                <Text className="text-white text-center font-medium">
                  {player.status === "active" ? "Suspend" : "Activate"}
                </Text>
              </Pressable>
              
              <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                <Text className="text-slate-300 text-center font-medium">View Details</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Summary Stats */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Players</Text>
            <Text className="text-slate-100 text-xl font-bold">{players.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active</Text>
            <Text className="text-green-400 text-xl font-bold">
              {players.filter(p => p.status === "active").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Suspended</Text>
            <Text className="text-red-400 text-xl font-bold">
              {players.filter(p => p.status === "suspended").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Balance</Text>
            <Text className="text-blue-400 text-xl font-bold">
              ${players.reduce((sum, p) => sum + p.balance, 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}