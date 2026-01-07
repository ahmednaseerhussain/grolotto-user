import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface PaymentRequest {
  id: string;
  playerName: string;
  playerEmail: string;
  amount: number;
  gameType: string;
  winningNumbers: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected" | "completed";
  paymentMethod: "bank" | "mobile" | "cash";
  notes?: string;
}

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "payout" | "commission";
  amount: number;
  playerName: string;
  date: string;
  status: "completed" | "pending" | "failed";
  paymentMethod: string;
}

const mockPaymentRequests: PaymentRequest[] = [
  {
    id: "1",
    playerName: "Jean Baptiste",
    playerEmail: "jean@email.com",
    amount: 1250.00,
    gameType: "Senp",
    winningNumbers: "45",
    requestDate: "2024-03-15",
    status: "pending",
    paymentMethod: "bank"
  },
  {
    id: "2",
    playerName: "Marie Claire", 
    playerEmail: "marie@email.com",
    amount: 3500.00,
    gameType: "Maryaj",
    winningNumbers: "23-67",
    requestDate: "2024-03-15",
    status: "approved",
    paymentMethod: "mobile"
  },
  {
    id: "3",
    playerName: "Pierre Louis",
    playerEmail: "pierre@email.com",
    amount: 750.50,
    gameType: "Loto 3",
    winningNumbers: "147",
    requestDate: "2024-03-14",
    status: "completed",
    paymentMethod: "cash"
  }
];

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "payout",
    amount: 1250.00,
    playerName: "Jean Baptiste",
    date: "2024-03-15",
    status: "completed",
    paymentMethod: "Bank Transfer"
  },
  {
    id: "2",
    type: "commission",
    amount: 125.50,
    playerName: "GROLOTTO Commission",
    date: "2024-03-15",
    status: "completed",
    paymentMethod: "System"
  },
  {
    id: "3",
    type: "deposit",
    amount: 50.00,
    playerName: "Marie Claire",
    date: "2024-03-15",
    status: "pending",
    paymentMethod: "MonCash"
  }
];

export default function PaymentManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(mockPaymentRequests);
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [activeTab, setActiveTab] = useState<"requests" | "transactions">("requests");
  const [searchQuery, setSearchQuery] = useState("");

  const approvePayment = (requestId: string) => {
    setPaymentRequests(prev => prev.map(request =>
      request.id === requestId 
        ? { ...request, status: "approved" as const }
        : request
    ));
  };

  const rejectPayment = (requestId: string) => {
    setPaymentRequests(prev => prev.map(request =>
      request.id === requestId 
        ? { ...request, status: "rejected" as const }
        : request
    ));
  };

  const markAsCompleted = (requestId: string) => {
    setPaymentRequests(prev => prev.map(request =>
      request.id === requestId 
        ? { ...request, status: "completed" as const }
        : request
    ));
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
    request.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.playerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(transaction =>
    transaction.playerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <ScrollView className="flex-1 p-4">
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
                      className="flex-1 bg-red-600 py-3 rounded-lg mr-2"
                    >
                      <Text className="text-white text-center font-medium">Reject</Text>
                    </Pressable>
                    
                    <Pressable 
                      onPress={() => approvePayment(request.id)}
                      className="flex-1 bg-green-600 py-3 rounded-lg ml-2"
                    >
                      <Text className="text-white text-center font-medium">Approve</Text>
                    </Pressable>
                  </View>
                )}

                {request.status === "approved" && (
                  <Pressable 
                    onPress={() => markAsCompleted(request.id)}
                    className="bg-blue-600 py-3 rounded-lg"
                  >
                    <Text className="text-white text-center font-medium">Mark as Paid</Text>
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