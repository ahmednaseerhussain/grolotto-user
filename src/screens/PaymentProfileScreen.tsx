import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, PaymentMethodType, PayoutMethodType } from "../state/appStore";

type TabType = "deposit" | "payout";

interface AddPaymentModalProps {
  visible: boolean;
  type: "deposit" | "payout";
  onClose: () => void;
  onAdd: (data: any) => void;
}

const AddPaymentModal = ({ visible, type, onClose, onAdd }: AddPaymentModalProps) => {
  const [selectedType, setSelectedType] = useState<PaymentMethodType | PayoutMethodType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const depositMethods = [
    { type: "moncash" as PaymentMethodType, name: "MonCash", icon: "wallet" as const, color: "#ef4444" },
  ];

  const payoutMethods = [
    { type: "moncash" as PayoutMethodType, name: "MonCash", icon: "wallet" as const, color: "#ef4444" },
  ];

  const methods = type === "deposit" ? depositMethods : payoutMethods;

  const handleAdd = () => {
    if (!selectedType || !displayName.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const methodData: any = {
      id: Date.now().toString(),
      type: selectedType,
      displayName: displayName.trim(),
      isDefault: false,
    };

    if (selectedType === "moncash") {
      if (!phoneNumber || phoneNumber.length < 8) {
        Alert.alert("Error", "Please enter a valid phone number");
        return;
      }
      methodData.phoneNumber = phoneNumber;
    }

    onAdd(methodData);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedType(null);
    setDisplayName("");
    setPhoneNumber("");
  };

  const needsPhoneNumber = selectedType === "moncash";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          {/* Header */}
          <View className="flex-row justify-between items-center p-5 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">
              Add {type === "deposit" ? "Payment" : "Payout"} Method
            </Text>
            <Pressable onPress={() => { resetForm(); onClose(); }} className="p-1">
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
            {/* Method Selection */}
            <Text className="text-base font-semibold text-gray-700 mt-5 mb-4">
              Select Method Type
            </Text>

            {methods.map((method) => (
              <Pressable
                key={method.type}
                className={`flex-row items-center justify-between border-2 rounded-2xl p-4 mb-3 ${
                  selectedType === method.type ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
                }`}
                onPress={() => setSelectedType(method.type)}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: method.color }}>
                    <Ionicons name={method.icon} size={24} color="#ffffff" />
                  </View>
                  <Text className="text-base font-semibold text-gray-900">{method.name}</Text>
                </View>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  selectedType === method.type ? "border-blue-500" : "border-gray-300"
                }`}>
                  {selectedType === method.type && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
              </Pressable>
            ))}

            {/* Display Name */}
            {selectedType && (
              <View className="mt-5 mb-5">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Display Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="border-2 border-gray-200 rounded-xl p-4 text-base text-gray-900 bg-gray-50"
                  placeholder="e.g., My Main Card, MonCash Personal"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            )}

            {/* Phone Number */}
            {needsPhoneNumber && (
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="border-2 border-gray-200 rounded-xl p-4 text-base text-gray-900 bg-gray-50"
                  placeholder="+509 1234 5678"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            )}
          </ScrollView>

          {/* Add Button */}
          <View className="p-5 border-t border-gray-200">
            <Pressable
              className={`bg-green-600 rounded-2xl p-5 items-center ${
                !selectedType || !displayName.trim() ? "opacity-50" : ""
              }`}
              onPress={handleAdd}
              disabled={!selectedType || !displayName.trim()}
            >
              <Text className="text-white text-lg font-bold">Add Payment Method</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PaymentMethodCard = ({
  method,
  onSetDefault,
  onRemove,
  isDeposit,
}: {
  method: any;
  onSetDefault: () => void;
  onRemove: () => void;
  isDeposit: boolean;
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "moncash":
        return { name: "wallet" as const, color: "#ef4444" };
      default:
        return { name: "wallet" as const, color: "#6b7280" };
    }
  };

  const icon = getIcon(method.type);

  const getMethodDetails = () => {
    if (method.phoneNumber) {
      return method.phoneNumber;
    }
    return "";
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: icon.color }}>
            <Ionicons name={icon.name} size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{method.displayName}</Text>
            <Text className="text-sm text-gray-500">{getMethodDetails()}</Text>
          </View>
        </View>
        {method.isDefault && (
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-700 text-xs font-semibold">Default</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2">
        {!method.isDefault && (
          <Pressable
            className="flex-1 bg-blue-50 py-3 rounded-xl items-center"
            onPress={onSetDefault}
          >
            <Text className="text-blue-600 font-semibold">Set as Default</Text>
          </Pressable>
        )}
        <Pressable
          className="flex-1 bg-red-50 py-3 rounded-xl items-center"
          onPress={() => {
            Alert.alert(
              "Remove Payment Method",
              `Are you sure you want to remove "${method.displayName}"?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: onRemove }
              ]
            );
          }}
        >
          <Text className="text-red-600 font-semibold">Remove</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function PaymentProfileScreen() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const addPaymentMethod = useAppStore(s => s.addPaymentMethod);
  const removePaymentMethod = useAppStore(s => s.removePaymentMethod);
  const setDefaultPaymentMethod = useAppStore(s => s.setDefaultPaymentMethod);
  const addPayoutMethod = useAppStore(s => s.addPayoutMethod);
  const removePayoutMethod = useAppStore(s => s.removePayoutMethod);
  const setDefaultPayoutMethod = useAppStore(s => s.setDefaultPayoutMethod);

  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [showAddModal, setShowAddModal] = useState(false);

  const paymentMethods = user?.paymentMethods || [];
  const payoutMethods = user?.payoutMethods || [];

  const handleAddMethod = (methodData: any) => {
    if (!user) return;

    if (activeTab === "deposit") {
      addPaymentMethod(user.id, methodData);
      Alert.alert("Success", "Payment method added successfully!");
    } else {
      addPayoutMethod(user.id, methodData);
      Alert.alert("Success", "Payout method added successfully!");
    }
  };

  const handleSetDefault = (methodId: string) => {
    if (!user) return;

    if (activeTab === "deposit") {
      setDefaultPaymentMethod(user.id, methodId);
      Alert.alert("Success", "Default payment method updated!");
    } else {
      setDefaultPayoutMethod(user.id, methodId);
      Alert.alert("Success", "Default payout method updated!");
    }
  };

  const handleRemove = (methodId: string) => {
    if (!user) return;

    if (activeTab === "deposit") {
      removePaymentMethod(user.id, methodId);
      Alert.alert("Success", "Payment method removed!");
    } else {
      removePayoutMethod(user.id, methodId);
      Alert.alert("Success", "Payout method removed!");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900 flex-1 text-center">
            Payment Methods
          </Text>
          <View className="w-6" />
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-white border-b border-gray-200">
        <Pressable
          className={`flex-1 py-4 ${activeTab === "deposit" ? "border-b-2 border-green-500" : ""}`}
          onPress={() => setActiveTab("deposit")}
        >
          <Text className={`text-center font-semibold ${
            activeTab === "deposit" ? "text-green-600" : "text-gray-500"
          }`}>
            💳 Deposit Methods
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-4 ${activeTab === "payout" ? "border-b-2 border-green-500" : ""}`}
          onPress={() => setActiveTab("payout")}
        >
          <Text className={`text-center font-semibold ${
            activeTab === "payout" ? "text-green-600" : "text-gray-500"
          }`}>
            💰 Payout Methods
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 p-5">
        {/* Info Card */}
        <View className="bg-blue-50 rounded-2xl p-4 mb-5 border border-blue-200">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-900 font-semibold mb-1">
                {activeTab === "deposit" ? "About Deposit Methods" : "About Payout Methods"}
              </Text>
              <Text className="text-blue-700 text-sm leading-5">
                {activeTab === "deposit"
                  ? "Add MonCash as your payment method to quickly recharge your wallet and place bets."
                  : "Add MonCash as your payout method to receive your winnings."}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods List */}
        {activeTab === "deposit" ? (
          paymentMethods.length === 0 ? (
            <View className="items-center py-10">
              <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center mb-4">
                <Ionicons name="card-outline" size={40} color="#9ca3af" />
              </View>
              <Text className="text-gray-900 font-semibold text-lg mb-2">No Payment Methods</Text>
              <Text className="text-gray-500 text-center mb-6 px-8">
                Add a payment method to start depositing funds into your wallet
              </Text>
            </View>
          ) : (
            paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onSetDefault={() => handleSetDefault(method.id)}
                onRemove={() => handleRemove(method.id)}
                isDeposit={true}
              />
            ))
          )
        ) : (
          payoutMethods.length === 0 ? (
            <View className="items-center py-10">
              <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center mb-4">
                <Ionicons name="cash-outline" size={40} color="#9ca3af" />
              </View>
              <Text className="text-gray-900 font-semibold text-lg mb-2">No Payout Methods</Text>
              <Text className="text-gray-500 text-center mb-6 px-8">
                Add a payout method to receive your winnings when you win
              </Text>
            </View>
          ) : (
            payoutMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onSetDefault={() => handleSetDefault(method.id)}
                onRemove={() => handleRemove(method.id)}
                isDeposit={false}
              />
            ))
          )
        )}
      </ScrollView>

      {/* Add Button */}
      <View className="p-5 bg-white border-t border-gray-200">
        <Pressable
          className="bg-green-600 rounded-2xl py-4 flex-row items-center justify-center"
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
          <Text className="text-white text-lg font-bold ml-2">
            Add {activeTab === "deposit" ? "Payment" : "Payout"} Method
          </Text>
        </Pressable>
      </View>

      {/* Add Modal */}
      <AddPaymentModal
        visible={showAddModal}
        type={activeTab}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMethod}
      />
    </SafeAreaView>
  );
}
