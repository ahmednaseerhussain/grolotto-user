import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppStore, Payout, PayoutMethodType } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { adminAPI, getErrorMessage } from "../api/apiClient";

interface RouteParams {
  payout: Payout;
}

export default function AdminPayoutProcessing() {
  const navigation = useNavigation();
  const route = useRoute();
  const { payout } = route.params as RouteParams;
  
  const language = useAppStore(s => s.language);
  const vendors = useAppStore(s => s.vendors);
  const updatePayout = useAppStore(s => s.updatePayout);
  
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  
  const t = (key: string) => getTranslation(key as any, language);
  
  const vendor = vendors.find(v => v.id === payout.vendorId);
  
  const getPaymentMethodInfo = (method: PayoutMethodType) => {
    switch (method) {
      case "moncash":
        return {
          name: "MonCash",
          icon: "wallet",
          color: "#ef4444",
          description: "Instant transfer to MonCash wallet",
          processingTime: "Instant",
        };
      default:
        return {
          name: "MonCash",
          icon: "wallet",
          color: "#ef4444",
          description: "Instant transfer to MonCash wallet",
          processingTime: "Instant",
        };
    }
  };
  
  const methodInfo = getPaymentMethodInfo(payout.method);
  
  const handleProcessPayout = async () => {
    if (!transferReference.trim()) {
      Alert.alert("Error", "Please enter a transfer reference number");
      return;
    }
    
    setProcessing(true);
    
    try {
      // Process payout via backend API
      await adminAPI.processVendorPayout(payout.id, {
        action: 'approved',
        notes: notes.trim() || undefined,
        transferReference: transferReference.trim(),
      });
      
      // Generate confirmation code if not provided
      const finalConfirmationCode = confirmationCode.trim() || 
        `TXN-${Date.now().toString().slice(-8).toUpperCase()}`;
      
      // Update payout status
      const updatedPayout: Payout = {
        ...payout,
        status: "paid",
        processedDate: Date.now(),
        notes: notes.trim() || `Processed successfully. Reference: ${transferReference}`,
        transferReference,
        confirmationCode: finalConfirmationCode,
      };
      
      updatePayout(updatedPayout);
      
      // Update vendor balance
      const updatedVendor = {
        ...vendor!,
        availableBalance: vendor!.availableBalance - payout.amount,
      };
      
      // Add success notification
      Alert.alert(
        "Payout Processed Successfully!",
        `Payment of $${payout.amount} has been sent to ${vendor?.displayName || vendor?.firstName} via ${methodInfo.name}.\n\nReference: ${transferReference}\nConfirmation: ${finalConfirmationCode}`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
      
    } catch (error) {
      Alert.alert("Processing Error", "Failed to process payout. Please try again.");
      console.error("Payout processing error:", error);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleRejectPayout = () => {
    Alert.alert(
      "Reject Payout",
      "Are you sure you want to reject this payout request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            const updatedPayout: Payout = {
              ...payout,
              status: "rejected",
              processedDate: Date.now(),
              notes: notes.trim() || "Payout rejected by administrator",
            };
            
            updatePayout(updatedPayout);
            navigation.goBack();
          }
        }
      ]
    );
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
              Process Payout
            </Text>
          </View>
          <View className="bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-700 font-medium text-sm">
              ${payout.amount.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Payout Summary */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <View className="flex-row items-center mb-4">
              <View className={`w-12 h-12 rounded-full items-center justify-center`} style={{ backgroundColor: methodInfo.color }}>
                <Ionicons name={methodInfo.icon as any} size={24} color="white" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-xl font-bold text-gray-800">
                  {methodInfo.name} Transfer
                </Text>
                <Text className="text-gray-600">
                  {methodInfo.description}
                </Text>
              </View>
            </View>
            
            <View className="bg-gray-50 rounded-xl p-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Vendor:</Text>
                <Text className="text-gray-800 font-medium">
                  {vendor?.displayName || `${vendor?.firstName} ${vendor?.lastName}`}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Amount:</Text>
                <Text className="text-gray-800 font-bold text-lg">
                  ${payout.amount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Requested:</Text>
                <Text className="text-gray-800">
                  {new Date(payout.requestDate).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Processing Time:</Text>
                <Text className="text-gray-800">
                  {methodInfo.processingTime}
                </Text>
              </View>
            </View>
          </View>

          {/* Vendor Information */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Vendor Details
            </Text>
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Business Name:</Text>
                <Text className="text-gray-800 font-medium">
                  {vendor?.businessName || "N/A"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Email:</Text>
                <Text className="text-gray-800">
                  {vendor?.email}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Phone:</Text>
                <Text className="text-gray-800">
                  {vendor?.phone}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Available Balance:</Text>
                <Text className="text-gray-800 font-bold">
                  ${vendor?.availableBalance.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transfer Details Form */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Transfer Details
            </Text>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Transfer Reference Number *
              </Text>
              <TextInput
                value={transferReference}
                onChangeText={setTransferReference}
                placeholder="Enter transfer reference (e.g., TXN123456789)"
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
                placeholderTextColor="#9ca3af"
                editable={!processing}
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Confirmation Code (Optional)
              </Text>
              <TextInput
                value={confirmationCode}
                onChangeText={setConfirmationCode}
                placeholder="Auto-generated if empty"
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
                placeholderTextColor="#9ca3af"
                editable={!processing}
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Processing Notes
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about the transfer..."
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-800 h-20"
                placeholderTextColor="#9ca3af"
                textAlignVertical="top"
                editable={!processing}
              />
            </View>
          </View>

          {/* Security Verification */}
          <View className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="warning" size={20} color="#d97706" />
              <View className="flex-1 ml-3">
                <Text className="text-yellow-800 font-bold mb-2">
                  Security Verification Required
                </Text>
                <Text className="text-yellow-700 text-sm">
                  • Verify vendor identity before processing{"\n"}
                  • Confirm payment method details{"\n"}
                  • Ensure sufficient funds in system{"\n"}
                  • Document transaction reference
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <Pressable
              onPress={handleProcessPayout}
              disabled={processing || !transferReference.trim()}
              className={`rounded-2xl py-4 px-6 ${
                processing || !transferReference.trim()
                  ? 'bg-gray-400'
                  : 'bg-green-500'
              }`}
            >
              <View className="flex-row items-center justify-center">
                {processing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                )}
                <Text className="text-white text-center font-bold text-lg ml-2">
                  {processing ? "Processing..." : "Process Payment"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleRejectPayout}
              disabled={processing}
              className={`border-2 border-red-500 rounded-2xl py-4 px-6 ${
                processing ? 'opacity-50' : ''
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="close-circle" size={24} color="#ef4444" />
                <Text className="text-red-500 text-center font-bold text-lg ml-2">
                  Reject Payout
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Processing Info */}
          <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-800 font-bold mb-2">
                  Processing Information
                </Text>
                <Text className="text-blue-700 text-sm">
                  Once processed, this payout cannot be reversed. The vendor will receive a notification and the funds will be deducted from their available balance.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}