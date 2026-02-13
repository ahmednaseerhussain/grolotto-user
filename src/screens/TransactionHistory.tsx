import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import Animated, { FadeInDown } from "react-native-reanimated";
import { walletAPI, getErrorMessage } from "../api/apiClient";

export default function TransactionHistory() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const currency = useAppStore(s => s.currency);
  const getTransactionHistory = useAppStore(s => s.getTransactionHistory);
  const [filter, setFilter] = useState<"all" | "deposit" | "bet_payment" | "winning_payout">("all");
  const [apiTransactions, setApiTransactions] = useState<any[]>([]);

  // Fetch real transactions from backend
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await walletAPI.getTransactions(1, 100, filter === 'all' ? undefined : filter);
        if (data?.transactions) setApiTransactions(data.transactions);
      } catch (e) {
        console.warn('Failed to fetch transactions:', getErrorMessage(e));
      }
    };
    fetchTransactions();
  }, [filter]);

  // Use API data if available, fall back to local store
  const localTransactions = user ? getTransactionHistory(user.id) : [];
  const transactions = apiTransactions.length > 0 ? apiTransactions : localTransactions;
  
  const filteredTransactions = filter === "all" 
    ? transactions 
    : transactions.filter(t => t.type === filter);

  const sortedTransactions = [...filteredTransactions].sort((a, b) => b.timestamp - a.timestamp);

  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return "arrow-down-circle";
      case "bet_payment":
        return "arrow-up-circle";
      case "winning_payout":
        return "trophy";
      case "withdrawal":
        return "cash";
      default:
        return "swap-horizontal";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "winning_payout":
        return "#10b981";
      case "bet_payment":
      case "withdrawal":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getTransactionSign = (type: string) => {
    return type === "deposit" || type === "winning_payout" ? "+" : "-";
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case "deposit":
        return "Deposit";
      case "bet_payment":
        return "Bet Payment";
      case "winning_payout":
        return "Winning Payout";
      case "withdrawal":
        return "Withdrawal";
      default:
        return "Transaction";
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMins} min${diffInMins !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "failed":
      case "refunded":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={() => navigation.goBack()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
            </Pressable>
            <Text className="text-xl font-bold text-slate-100">Transaction History</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-4 py-4 gap-2">
        <Pressable
          onPress={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg ${filter === "all" ? "bg-blue-600" : "bg-slate-800"}`}
        >
          <Text className={`font-medium ${filter === "all" ? "text-white" : "text-slate-400"}`}>
            All
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("deposit")}
          className={`px-4 py-2 rounded-lg ${filter === "deposit" ? "bg-blue-600" : "bg-slate-800"}`}
        >
          <Text className={`font-medium ${filter === "deposit" ? "text-white" : "text-slate-400"}`}>
            Deposits
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("bet_payment")}
          className={`px-4 py-2 rounded-lg ${filter === "bet_payment" ? "bg-blue-600" : "bg-slate-800"}`}
        >
          <Text className={`font-medium ${filter === "bet_payment" ? "text-white" : "text-slate-400"}`}>
            Bets
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("winning_payout")}
          className={`px-4 py-2 rounded-lg ${filter === "winning_payout" ? "bg-blue-600" : "bg-slate-800"}`}
        >
          <Text className={`font-medium ${filter === "winning_payout" ? "text-white" : "text-slate-400"}`}>
            Winnings
          </Text>
        </Pressable>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {sortedTransactions.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="receipt-outline" size={64} color="#475569" />
            <Text className="text-slate-400 text-lg font-medium mt-4">No transactions yet</Text>
            <Text className="text-slate-500 text-sm mt-2">
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          sortedTransactions.map((transaction, index) => (
            <Animated.View
              key={transaction.id}
              entering={FadeInDown.duration(300).delay(index * 50)}
              className="bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View 
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: getTransactionColor(transaction.type) + "20" }}
                  >
                    <Ionicons 
                      name={getTransactionIcon(transaction.type) as any} 
                      size={24} 
                      color={getTransactionColor(transaction.type)} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">
                      {getTransactionTitle(transaction.type)}
                    </Text>
                    <Text className="text-slate-400 text-sm mt-1">
                      {transaction.description}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-1">
                      {formatDate(transaction.timestamp)}
                    </Text>
                  </View>
                </View>
                <View className="items-end ml-4">
                  <Text 
                    className="font-bold text-lg"
                    style={{ color: getTransactionColor(transaction.type) }}
                  >
                    {getTransactionSign(transaction.type)}{getCurrencySymbol()}
                    {transaction.amount.toFixed(2)}
                  </Text>
                  <View 
                    className="px-2 py-1 rounded-full mt-1"
                    style={{ backgroundColor: getStatusColor(transaction.status) + "20" }}
                  >
                    <Text 
                      className="text-xs font-medium capitalize"
                      style={{ color: getStatusColor(transaction.status) }}
                    >
                      {transaction.status}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
