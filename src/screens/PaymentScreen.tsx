import React, { useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Linking, Alert, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, PaymentMethodType } from "../state/appStore";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { paymentAPI, walletAPI, getErrorMessage } from "../api/apiClient";

const ALL_PAYMENT_METHODS = [
  {
    type: "moncash" as PaymentMethodType,
    name: "MonCash",
    icon: "wallet" as const,
    color: "#ef4444",
    description: "Digicel mobile money",
    currencies: ["HTG"],
  },
  {
    type: "paypal" as PaymentMethodType,
    name: "PayPal",
    icon: "logo-paypal" as const,
    color: "#0070ba",
    description: "Pay with PayPal",
    currencies: ["USD"],
  },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currency = useAppStore(s => s.currency);
  const user = useAppStore(s => s.user);
  const processPayment = useAppStore(s => s.processPayment);

  // Filter payment methods by currency
  const PAYMENT_METHODS = ALL_PAYMENT_METHODS.filter(m => m.currencies.includes(currency));

  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const needsPhoneNumber = selectedMethod === "moncash";
  const isValidPhone = phoneNumber.length >= 8;
  const canProceed = amount && parseFloat(amount) > 0 && selectedMethod && 
    (!needsPhoneNumber || isValidPhone);

  const handlePayment = async () => {
    if (!canProceed || !user) return;
    setProcessing(true);
    try {
      if (selectedMethod === 'paypal') {
        // PayPal flow
        const ppResult = await paymentAPI.createPayPalOrder(parseFloat(amount), 'USD');
        const approveUrl = ppResult?.approveUrl || ppResult?.data?.approveUrl;
        const orderId = ppResult?.orderId || ppResult?.data?.orderId;

        if (approveUrl) {
          await Linking.openURL(approveUrl);
        }

        // Wait for user to return from PayPal
        const waitForReturn = () => new Promise<void>((resolve) => {
          const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') { sub.remove(); resolve(); }
          });
          setTimeout(() => { sub.remove(); resolve(); }, 8000);
        });
        await waitForReturn();

        // Poll capture endpoint
        let captured = false;
        for (let attempt = 0; attempt < 12; attempt++) {
          try {
            const capRes = await paymentAPI.capturePayPalOrder(orderId);
            const status = capRes?.status || capRes?.data?.status;
            if (status === 'COMPLETED' || status === 'credited' || status === 'already_processed') {
              captured = true;
              break;
            }
          } catch { /* keep polling */ }
          await new Promise(r => setTimeout(r, 5000));
        }

        if (captured) {
          try {
            const wallet = await walletAPI.getWallet();
            const bal = currency === 'HTG' ? wallet.balanceHtg : wallet.balanceUsd;
            useAppStore.getState().updateUser({ ...user, balance: bal || 0 });
          } catch {}
          setProcessing(false);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setAmount("");
            setSelectedMethod(null);
            navigation.goBack();
          }, 2000);
        } else {
          setProcessing(false);
          Alert.alert("Payment Pending", "Your PayPal payment is being processed. Pull down to refresh your balance.");
        }
        return;
      }

      // MonCash flow
      const paymentResult = await paymentAPI.createPaymentIntent(
        parseFloat(amount),
        currency
      );

      // Open MonCash gateway for user to authorize payment
      if (paymentResult.paymentUrl) {
        await Linking.openURL(paymentResult.paymentUrl);
      }

      // Wait for user to return from MonCash, then poll for verification
      // Listen for app returning to foreground
      const waitForReturn = () => new Promise<void>((resolve) => {
        const sub = AppState.addEventListener('change', (state) => {
          if (state === 'active') { sub.remove(); resolve(); }
        });
        // Also resolve after 5s if AppState doesn't fire (e.g. in-app browser)
        setTimeout(() => { sub.remove(); resolve(); }, 5000);
      });
      await waitForReturn();

      // Poll the verify endpoint (user may take a moment to complete)
      let verification: any = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          verification = await paymentAPI.verifyPayment(paymentResult.orderId, '');
          if (verification?.status === 'credited' || verification?.status === 'already_processed') break;
        } catch { /* keep polling */ }
        await new Promise(r => setTimeout(r, 3000));
      }

      if (verification && (verification.status === 'credited' || verification.status === 'already_processed')) {
        // Refresh wallet from server to get accurate balance
        try {
          const wallet = await walletAPI.getWallet();
          const bal = currency === 'HTG' ? wallet.balanceHtg : wallet.balanceUsd;
          useAppStore.getState().updateUser({ ...user, balance: bal || 0 });
        } catch { /* fallback: leave balance as-is */ }

        setProcessing(false);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAmount("");
          setSelectedMethod(null);
          setPhoneNumber("");
          navigation.goBack();
        }, 2000);
      } else {
        setProcessing(false);
        Alert.alert("Payment Pending", "Your payment is being processed. Pull down to refresh your balance.");
      }
    } catch (error) {
      setProcessing(false);
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

        {/* Phone Number */}
        {needsPhoneNumber && (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
            <Text className="text-slate-300 font-semibold text-base mb-3">
              MonCash Phone Number
            </Text>
            <View className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-4">
              <TextInput
                className="text-white text-base"
                placeholder="+509 1234 5678"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
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
