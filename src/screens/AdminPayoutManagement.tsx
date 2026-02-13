import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, Payout, PayoutMethodType } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { adminAPI, getErrorMessage } from "../api/apiClient";

export default function AdminPayoutManagement() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);
  const vendors = useAppStore(s => s.vendors);
  const payouts = useAppStore(s => s.payouts);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "paid" | "rejected">("all");
  const [loading, setLoading] = useState(false);
  
  const t = (key: string) => getTranslation(key as any, language);

  // Fetch pending payouts from backend on mount
  React.useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true);
      try {
        await adminAPI.getPendingPayouts();
      } catch (e) {
        console.warn('Failed to fetch payouts:', getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, []);
  
  const allPayouts = payouts;
  
  const filteredPayouts = allPayouts.filter(payout => {
    const vendor = vendors.find(v => v.id === payout.vendorId);
    const vendorName = vendor?.displayName || `${vendor?.firstName} ${vendor?.lastName}` || "Unknown";
    
    const matchesSearch = vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payout.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payout.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const getMethodInfo = (method: PayoutMethodType) => {
    switch (method) {
      case "moncash":
        return { name: "MonCash", icon: "wallet", color: "#ef4444" };
      case "natcash":
        return { name: "NatCash", icon: "card", color: "#10b981" };
      case "ach":
        return { name: "ACH Transfer", icon: "logo-paypal", color: "#3b82f6" };
      default:
        return { name: "Unknown", icon: "help-circle", color: "#6b7280" };
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "approved": return "#10b981";
      case "rejected": return "#ef4444"; 
      case "paid": return "#8b5cf6";
      default: return "#6b7280";
    }
  };
  
  const handleApprove = (payout: Payout) => {
    (navigation as any).navigate("AdminPayoutProcessing", { payout });
  };

  const handleProcessPayment = (payout: Payout) => {
    (navigation as any).navigate("AdminPayoutProcessing", { payout });
  };
  
  const handleReject = (payout: Payout) => {
    Alert.alert(
      "Reject Payout",
      `Are you sure you want to reject the payout of $${payout.amount} for ${vendors.find(v => v.id === payout.vendorId)?.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            // In real app, would update the payout status
            Alert.alert("Success", "Payout has been rejected.");
          }
        }
      ]
    );
  };

  const statusCounts = {
    all: allPayouts.length,
    pending: allPayouts.filter(p => p.status === "pending").length,
    approved: allPayouts.filter(p => p.status === "approved").length,
    paid: allPayouts.filter(p => p.status === "paid").length,
    rejected: allPayouts.filter(p => p.status === "rejected").length,
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
            <Text className="text-lg font-bold text-yellow-600">
              GROLOTTO ADMIN
            </Text>
            <Text className="text-2xl font-bold text-gray-800">
              Payout Management
            </Text>
          </View>
          <View className="bg-red-100 px-3 py-1 rounded-full">
            <Text className="text-red-700 font-bold">
              {statusCounts.pending} Pending
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Stats */}
      <View className="bg-white mx-6 mt-6 rounded-2xl p-4 border border-gray-200">
        <Text className="text-lg font-bold text-gray-800 mb-3">Overview</Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              ${allPayouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </Text>
            <Text className="text-gray-600 text-sm">Total Requests</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {statusCounts.pending}
            </Text>
            <Text className="text-gray-600 text-sm">Pending</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {statusCounts.approved + statusCounts.paid}
            </Text>
            <Text className="text-gray-600 text-sm">Processed</Text>
          </View>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="px-6 py-4">
        <View className="bg-white rounded-xl border border-gray-300 mb-4">
          <View className="flex-row items-center px-4 py-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by vendor name or ticket ID..."
              className="flex-1 ml-3 text-gray-800"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-3">
            {[
              { key: "all", label: "All", count: statusCounts.all },
              { key: "pending", label: "Pending", count: statusCounts.pending },
              { key: "approved", label: "Approved", count: statusCounts.approved },
              { key: "paid", label: "Paid", count: statusCounts.paid },
              { key: "rejected", label: "Rejected", count: statusCounts.rejected }
            ].map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setStatusFilter(filter.key as any)}
                className={`px-4 py-2 rounded-full ${
                  statusFilter === filter.key
                    ? "bg-blue-500"
                    : "bg-white border border-gray-300"
                }`}
              >
                <View className="flex-row items-center">
                  <Text
                    className={`font-medium ${
                      statusFilter === filter.key ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {filter.label}
                  </Text>
                  <View className={`ml-2 px-2 py-1 rounded-full ${
                    statusFilter === filter.key ? "bg-blue-600" : "bg-gray-200"
                  }`}>
                    <Text className={`text-xs font-bold ${
                      statusFilter === filter.key ? "text-white" : "text-gray-600"
                    }`}>
                      {filter.count}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Payout List */}
      <ScrollView className="flex-1 px-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Payout Requests ({filteredPayouts.length})
        </Text>
        
        {filteredPayouts.length === 0 ? (
          <View className="bg-white rounded-2xl p-12 items-center border border-gray-200">
            <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-xl font-medium mt-4">
              No payouts found
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              {searchQuery ? "Try adjusting your search" : "No payout requests match the current filter"}
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {filteredPayouts.map((payout) => {
              const vendor = vendors.find(v => v.id === payout.vendorId);
              const methodInfo = getMethodInfo(payout.method);
              
              return (
                <View key={payout.id} className="bg-white rounded-2xl p-4 border border-gray-200">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-800 mb-1">
                        {vendor?.displayName || `${vendor?.firstName} ${vendor?.lastName}` || "Unknown Vendor"}
                      </Text>
                      <Text className="text-gray-600 text-sm mb-1">
                        {vendor?.email}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        Ticket: {payout.id.toUpperCase()}
                      </Text>
                    </View>
                    
                    <View className="items-end">
                      <Text className="text-2xl font-bold text-gray-800 mb-1">
                        ${payout.amount.toFixed(2)}
                      </Text>
                      <View 
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: getStatusColor(payout.status) }}
                      >
                        <Text className="text-white font-medium text-sm capitalize">
                          {payout.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View 
                        className="w-8 h-8 rounded-full items-center justify-center mr-2"
                        style={{ backgroundColor: methodInfo.color }}
                      >
                        <Ionicons name={methodInfo.icon as any} size={16} color="white" />
                      </View>
                      <View>
                        <Text className="text-gray-700 font-medium">
                          {methodInfo.name}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                          Requested {new Date(payout.requestDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {payout.status === "pending" && (
                    <View className="flex-row space-x-3 pt-3 border-t border-gray-200">
                      <Pressable
                        onPress={() => handleReject(payout)}
                        className="flex-1 bg-red-500 rounded-xl py-3 px-4"
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="close" size={16} color="white" />
                          <Text className="text-white font-medium ml-2">Reject</Text>
                        </View>
                      </Pressable>
                      
                      <Pressable
                        onPress={() => handleApprove(payout)}
                        className="flex-1 bg-green-500 rounded-xl py-3 px-4"
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="checkmark" size={16} color="white" />
                          <Text className="text-white font-medium ml-2">Approve</Text>
                        </View>
                      </Pressable>
                    </View>
                  )}

                  {payout.status === "approved" && (
                    <Pressable
                      onPress={() => handleProcessPayment(payout)}
                      className="bg-blue-500 rounded-xl py-3 px-4 mt-3"
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="card" size={16} color="white" />
                        <Text className="text-white font-medium ml-2">Process Payment</Text>
                      </View>
                    </Pressable>
                  )}

                  {(payout.status === "paid" || payout.status === "rejected") && (
                    <View className="bg-gray-50 rounded-xl p-3 mt-3">
                      <Text className="text-gray-600 text-sm">
                        {payout.status === "paid" ? "✓ Payment processed" : "✗ Request rejected"}
                        {payout.processedDate && ` on ${new Date(payout.processedDate).toLocaleDateString()}`}
                      </Text>
                      {payout.notes && (
                        <Text className="text-gray-500 text-xs mt-1">
                          {payout.notes}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}