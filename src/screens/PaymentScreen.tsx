import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, PaymentMethodType } from "../state/appStore";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { paymentAPI, getErrorMessage } from "../api/apiClient";

const PAYMENT_METHODS = [
  {
    type: "debit_card" as PaymentMethodType,
    name: "Debit Card",
    icon: "card" as const,
    color: "#3b82f6",
    description: "Visa, Mastercard, Discover",
  },
  {
    type: "gift_card" as PaymentMethodType,
    name: "Gift Card",
    icon: "gift" as const,
    color: "#8b5cf6",
    description: "Prepaid gift cards",
  },
  {
    type: "cashapp" as PaymentMethodType,
    name: "CashApp",
    icon: "logo-usd" as const,
    color: "#00d54b",
    description: "Cash App payments",
  },
  {
    type: "moncash" as PaymentMethodType,
    name: "MonCash",
    icon: "wallet" as const,
    color: "#ef4444",
    description: "Haiti mobile money",
  },
  {
    type: "natcash" as PaymentMethodType,
    name: "NatCash",
    icon: "cash" as const,
    color: "#10b981",
    description: "National payment system",
  },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currency = useAppStore(s => s.currency);
  const user = useAppStore(s => s.user);
  const processPayment = useAppStore(s => s.processPayment);

  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardCurrency, setGiftCardCurrency] = useState<"USD" | "HTG">(currency);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(" ") : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const needsCardDetails = selectedMethod === "debit_card";
  const needsPhoneNumber = selectedMethod === "moncash" || selectedMethod === "natcash" || selectedMethod === "cashapp";
  const needsGiftCard = selectedMethod === "gift_card";
  
  const isValidCardNumber = cardNumber.replace(/\s/g, "").length >= 16;
  const isValidExpiry = cardExpiry.replace(/\D/g, "").length === 4;
  const isValidCVV = cardCVV.length >= 3;
  const isValidPhone = phoneNumber.length >= 8;
  const isValidGiftCard = giftCardCode.length >= 12 && giftCardCurrency === currency;
  
  const canProceed = amount && parseFloat(amount) > 0 && selectedMethod && 
    (!needsCardDetails || (isValidCardNumber && isValidExpiry && isValidCVV)) &&
    (!needsPhoneNumber || isValidPhone) &&
    (!needsGiftCard || isValidGiftCard);

  const handlePayment = async () => {
    if (!canProceed || !user) return;

    setProcessing(true);

    try {
      // Create real payment intent via backend
      const paymentResult = await paymentAPI.createPaymentIntent(
        parseFloat(amount),
        currency
      );

      // If payment intent created, process locally for wallet update
      const transaction = {
        id: paymentResult.transactionId || Date.now().toString(),
        userId: user.id,
        type: "deposit" as const,
        amount: parseFloat(amount),
        currency,
        paymentMethod: selectedMethod,
        status: "completed" as const,
        timestamp: Date.now(),
        description: `Deposit via ${PAYMENT_METHODS.find(m => m.type === selectedMethod)?.name}`,
      };

      processPayment(transaction);
      setProcessing(false);
      setShowSuccess(true);

      // Reset form and go back after success
      setTimeout(() => {
        setShowSuccess(false);
        setAmount("");
        setSelectedMethod(null);
        setCardNumber("");
        setCardExpiry("");
        setCardCVV("");
        setPhoneNumber("");
        navigation.goBack();
      }, 2000);
    } catch (error) {
      setProcessing(false);
      const { Alert } = require("react-native");
      Alert.alert("Payment Failed", getErrorMessage(error));
    }
  };

  if (showSuccess) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <Animated.View 
          entering={FadeIn.duration(300)}
          className="items-center px-8"
        >
          <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark" size={64} color="#ffffff" />
          </View>
          <Text className="text-3xl font-bold text-white mb-3">Success!</Text>
          <Text className="text-lg text-slate-300 text-center">
            Your payment of {getCurrencySymbol()}{parseFloat(amount).toFixed(2)} was processed successfully
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-900"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 py-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-100 flex-1">Make Payment</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <Animated.View 
          entering={FadeInUp.duration(400).delay(100)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mt-6 mb-6"
        >
          <Text className="text-slate-200 text-sm mb-2">Current Balance</Text>
          <Text className="text-white text-4xl font-bold">
            {getCurrencySymbol()}{(user?.balance || 0).toFixed(2)}
          </Text>
        </Animated.View>

        {/* Amount Input */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} className="mb-6">
          <Text className="text-slate-300 font-semibold text-base mb-3">Enter Amount</Text>
          <View className="bg-slate-800 rounded-xl border-2 border-slate-700 px-4 py-4 flex-row items-center">
            <Text className="text-slate-400 text-2xl mr-2">{getCurrencySymbol()}</Text>
            <TextInput
              className="flex-1 text-white text-2xl font-semibold"
              placeholder="0.00"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Quick Amounts */}
          <View className="flex-row flex-wrap mt-4 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <Pressable
                key={value}
                onPress={() => handleQuickAmount(value)}
                className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              >
                <Text className="text-slate-300 font-medium">
                  {getCurrencySymbol()}{value}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Payment Methods */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} className="mb-6">
          <Text className="text-slate-300 font-semibold text-base mb-3">Select Payment Method</Text>
          
          {PAYMENT_METHODS.map((method) => (
            <Pressable
              key={method.type}
              onPress={() => setSelectedMethod(method.type)}
              className={`bg-slate-800 rounded-xl p-4 mb-3 border-2 ${
                selectedMethod === method.type ? "border-blue-500" : "border-slate-700"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View 
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: method.color }}
                  >
                    <Ionicons name={method.icon} size={24} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">{method.name}</Text>
                    <Text className="text-slate-400 text-sm">{method.description}</Text>
                  </View>
                </View>
                <View 
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedMethod === method.type ? "border-blue-500" : "border-slate-600"
                  }`}
                >
                  {selectedMethod === method.type && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </Animated.View>

        {/* Card Details */}
        {needsCardDetails && (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
            <Text className="text-slate-300 font-semibold text-base mb-3">Card Details</Text>
            
            <View className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-3">
              <Text className="text-slate-400 text-sm mb-2">Card Number</Text>
              <TextInput
                className="text-white text-base"
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                maxLength={19}
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              />
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-4">
                <Text className="text-slate-400 text-sm mb-2">Expiry Date</Text>
                <TextInput
                  className="text-white text-base"
                  placeholder="MM/YY"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  maxLength={5}
                  value={cardExpiry}
                  onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                />
              </View>

              <View className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-4">
                <Text className="text-slate-400 text-sm mb-2">CVV</Text>
                <TextInput
                  className="text-white text-base"
                  placeholder="123"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  value={cardCVV}
                  onChangeText={setCardCVV}
                />
              </View>
            </View>

            <View className="flex-row items-center bg-green-900/20 border border-green-700 rounded-lg px-3 py-2">
              <Ionicons name="lock-closed" size={16} color="#10b981" />
              <Text className="text-green-400 text-xs ml-2 flex-1">
                Your payment info is secure and encrypted
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Phone Number */}
        {needsPhoneNumber && (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
            <Text className="text-slate-300 font-semibold text-base mb-3">
              {selectedMethod === "cashapp" ? "CashApp Tag" : selectedMethod === "moncash" ? "MonCash" : "NatCash"} {selectedMethod === "cashapp" ? "" : "Phone Number"}
            </Text>
            <View className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-4">
              <TextInput
                className="text-white text-base"
                placeholder={selectedMethod === "cashapp" ? "$yourtag" : "+509 1234 5678"}
                placeholderTextColor="#64748b"
                keyboardType={selectedMethod === "cashapp" ? "default" : "phone-pad"}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </Animated.View>
        )}

        {/* Gift Card Details */}
        {needsGiftCard && (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
            <Text className="text-slate-300 font-semibold text-base mb-3">Gift Card Details</Text>
            
            <View className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-3">
              <Text className="text-slate-400 text-sm mb-2">Gift Card Code</Text>
              <TextInput
                className="text-white text-base"
                placeholder="Enter 16-digit code"
                placeholderTextColor="#64748b"
                keyboardType="default"
                maxLength={20}
                value={giftCardCode}
                onChangeText={setGiftCardCode}
                autoCapitalize="characters"
              />
            </View>

            <View className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-3">
              <Text className="text-slate-400 text-sm mb-2">Gift Card Currency</Text>
              <Text className="text-white text-base font-semibold">{giftCardCurrency}</Text>
            </View>

            {giftCardCurrency !== currency && (
              <View className="flex-row items-center bg-red-900/20 border border-red-700 rounded-lg px-3 py-2">
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text className="text-red-400 text-xs ml-2 flex-1">
                  Gift card currency ({giftCardCurrency}) doesn't match your wallet currency ({currency}). Only {currency} gift cards can be added to your {currency} wallet.
                </Text>
              </View>
            )}
            
            {giftCardCurrency === currency && (
              <View className="flex-row items-center bg-green-900/20 border border-green-700 rounded-lg px-3 py-2">
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text className="text-green-400 text-xs ml-2 flex-1">
                  Gift card currency matches your wallet
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Payment Summary */}
        {amount && parseFloat(amount) > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700">
            <Text className="text-slate-400 text-sm mb-3">Payment Summary</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-300">Amount</Text>
              <Text className="text-white font-semibold">
                {getCurrencySymbol()}{parseFloat(amount).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-300">Processing Fee</Text>
              <Text className="text-white font-semibold">{getCurrencySymbol()}0.00</Text>
            </View>
            <View className="h-px bg-slate-700 my-2" />
            <View className="flex-row justify-between">
              <Text className="text-white font-bold text-base">Total</Text>
              <Text className="text-green-400 font-bold text-lg">
                {getCurrencySymbol()}{parseFloat(amount).toFixed(2)}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Pay Button */}
      <View className="p-4 border-t border-slate-700" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handlePayment}
          disabled={!canProceed || processing}
          className={`rounded-xl py-4 flex-row items-center justify-center ${
            canProceed && !processing ? "bg-green-600" : "bg-slate-700"
          }`}
        >
          {processing ? (
            <Text className="text-white font-bold text-lg">Processing...</Text>
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">
                Pay {amount ? `${getCurrencySymbol()}${parseFloat(amount).toFixed(2)}` : ""}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
