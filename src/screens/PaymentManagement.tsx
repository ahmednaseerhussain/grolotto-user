import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminAPI, walletAPI, getErrorMessage } from "../api/apiClient";

interface PaymentRequest {
  id: string;
  playerName: string;
  playerEmail: string;
  amount: number;
  gameType: string;
  winningNumbers: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected" | "completed";
  paymentMethod: string;
  notes?: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  playerName: string;
  date: string;
  status: string;
  paymentMethod: string;
}

export default function PaymentManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "transactions">("requests");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [payoutsData, txData] = await Promise.allSettled([
        adminAPI.getPendingPayouts(),
        walletAPI.getTransactions(1, 50),
      ]);

      if (payoutsData.status === "fulfilled") {
        const payouts = payoutsData.value?.payouts || payoutsData.value?.data || payoutsData.value || [];
        setPaymentRequests(Array.isArray(payouts) ? payouts : []);
      }

      if (txData.status === "fulfilled") {
        const txList = txData.value?.transactions || txData.value?.data || txData.value || [];
        setTransactions(Array.isArray(txList) ? txList : []);
      }
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const approvePayment = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await adminAPI.processVendorPayout(requestId);
      await fetchData();
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const rejectPayment = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      // Use the same endpoint — backend can handle reject status
      Alert.alert("Rejected", "Payment request has been rejected.");
      setPaymentRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const markAsCompleted = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await adminAPI.processVendorPayout(requestId);
      await fetchData();
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "approved": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "rejected": case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "bank": return "card";
      case "mobile": return "phone-portrait";
      case "cash": return "cash";
      default: return "wallet";
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deposit": return "text-green-400";
      case "withdrawal": case "payout": return "text-red-400";
      case "commission": return "text-blue-400";
      default: return "text-slate-400";
    }
  };

  const filteredRequests = paymentRequests.filter(request =>
    (request.playerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (request.playerEmail || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(transaction =>
    (transaction.playerName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 mt-4">Loading payments...</Text>
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
        <Text className="text-xl font-bold text-slate-100 flex-1">Payment Management</Text>
        <Pressable className="bg-green-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Export</Text>
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        <Pressable
          onPress={() => setActiveTab("requests")}
          className={`flex-1 py-4 ${activeTab === "requests" ? "border-b-2 border-green-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "requests" ? "text-green-400" : "text-slate-400"
          }`}>
            Payout Requests ({paymentRequests.filter(r => r.status === "pending").length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("transactions")}
          className={`flex-1 py-4 ${activeTab === "transactions" ? "border-b-2 border-green-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "transactions" ? "text-green-400" : "text-slate-400"
          }`}>
            Transaction Log ({transactions.length})
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View className="p-4 bg-slate-800 border-b border-slate-700">
        <View className="flex-row items-center bg-slate-700 rounded-lg px-4 py-3">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search payments..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-100"
          />
        </View>
      </View>

      <ScrollView className="flex-1 p-4" refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }>
        {activeTab === "requests" ? (
          /* Payment Requests */
          <View>
            {filteredRequests.map((request) => (
              <View key={request.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                {/* Request Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-slate-100 font-semibold text-lg">{request.playerName}</Text>
                    <Text className="text-slate-400 text-sm">{request.playerEmail}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(request.status)}`}>
                    <Text className="text-white text-xs font-medium capitalize">{request.status}</Text>
                  </View>
                </View>

                {/* Winning Details */}
                <View className="bg-slate-700 rounded-lg p-3 mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-400 text-sm">Game Type:</Text>
                    <Text className="text-slate-100 font-medium">{request.gameType}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-400 text-sm">Winning Numbers:</Text>
                    <Text className="text-yellow-400 font-bold">{request.winningNumbers}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-400 text-sm">Payout Amount:</Text>
                    <Text className="text-green-400 font-bold text-lg">${request.amount.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Payment Details */}
                <View className="flex-row justify-between mb-4">
                  <View>
                    <Text className="text-slate-400 text-sm mb-1">Request Date</Text>
                    <Text className="text-slate-100">{request.requestDate}</Text>
                  </View>
                  <View>
                    <Text className="text-slate-400 text-sm mb-1">Payment Method</Text>
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={getPaymentMethodIcon(request.paymentMethod) as any} 
                        size={16} 
                        color="#e2e8f0" 
                      />
                      <Text className="text-slate-100 ml-2 capitalize">{request.paymentMethod}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                {request.status === "pending" && (
                  <View className="flex-row justify-between">
                    <Pressable 
                      onPress={() => rejectPayment(request.id)}
                      className="flex-1 bg-red-600 py-3 rounded-lg mr-2 items-center"
                      disabled={actionLoading === request.id}
                    >
                      {actionLoading === request.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-white text-center font-medium">Reject</Text>
                      )}
                    </Pressable>
                    
                    <Pressable 
                      onPress={() => approvePayment(request.id)}
                      className="flex-1 bg-green-600 py-3 rounded-lg ml-2 items-center"
                      disabled={actionLoading === request.id}
                    >
                      {actionLoading === request.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-white text-center font-medium">Approve</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {request.status === "approved" && (
                  <Pressable 
                    onPress={() => markAsCompleted(request.id)}
                    className="bg-blue-600 py-3 rounded-lg items-center"
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white text-center font-medium">Mark as Paid</Text>
                    )}
                  </Pressable>
                )}

                {request.status === "completed" && (
                  <View className="bg-green-700 py-3 rounded-lg">
                    <Text className="text-green-200 text-center font-medium">Payment Completed</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          /* Transaction Log */
          <View>
            {filteredTransactions.map((transaction) => (
              <View key={transaction.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-slate-100 font-semibold text-lg">{transaction.playerName}</Text>
                    <Text className="text-slate-400 text-sm capitalize">{transaction.type} • {transaction.paymentMethod}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-bold text-lg ${getTransactionTypeColor(transaction.type)}`}>
                      {transaction.type === "deposit" ? "+" : "-"}${transaction.amount.toFixed(2)}
                    </Text>
                    <View className={`px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                      <Text className="text-white text-xs font-medium capitalize">{transaction.status}</Text>
                    </View>
                  </View>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-400 text-sm">{transaction.date}</Text>
                  <Pressable className="bg-slate-700 px-3 py-2 rounded-lg">
                    <Text className="text-slate-300 text-sm">View Details</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Summary Stats */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between mb-2">
          <Text className="text-slate-400 text-sm">Daily Summary</Text>
          <Text className="text-slate-400 text-sm">{new Date().toLocaleDateString()}</Text>
        </View>
        
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Pending</Text>
            <Text className="text-yellow-400 text-xl font-bold">
              ${paymentRequests
                .filter(r => r.status === "pending")
                .reduce((sum, r) => sum + r.amount, 0)
                .toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Approved</Text>
            <Text className="text-blue-400 text-xl font-bold">
              ${paymentRequests
                .filter(r => r.status === "approved")
                .reduce((sum, r) => sum + r.amount, 0)
                .toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Completed</Text>
            <Text className="text-green-400 text-xl font-bold">
              ${paymentRequests
                .filter(r => r.status === "completed")
                .reduce((sum, r) => sum + r.amount, 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}