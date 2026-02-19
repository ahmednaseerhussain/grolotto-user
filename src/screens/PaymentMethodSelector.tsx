import React, { useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, PaymentMethodType } from "../state/appStore";
import { paymentAPI, getErrorMessage } from "../api/apiClient";

interface PaymentMethodSelectorProps {
  visible: boolean;
  amount: number;
  onClose: () => void;
  onPaymentComplete: (method: PaymentMethodType) => void;
}

const PAYMENT_METHODS = [
  {
    type: "moncash" as PaymentMethodType,
    name: "MonCash",
    icon: "wallet" as const,
    color: "#ef4444",
    description: "Digicel mobile money",
    processingTime: "Instant",
  },
];

export default function PaymentMethodSelector({ 
  visible, 
  amount, 
  onClose, 
  onPaymentComplete 
}: PaymentMethodSelectorProps) {
  const currency = useAppStore(s => s.currency);
  const user = useAppStore(s => s.user);
  const processPayment = useAppStore(s => s.processPayment);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  const handlePayment = async () => {
    if (!selectedMethod || !user) return;

    setProcessing(true);

    try {
      // Create payment intent via backend
      await paymentAPI.createPaymentIntent(amount, currency);

      // Create transaction record
      const transaction = {
        id: Date.now().toString(),
        userId: user.id,
        type: "bet_payment" as const,
        amount,
        currency,
        paymentMethod: selectedMethod,
        status: "completed" as const,
        timestamp: Date.now(),
        description: `Bet payment via ${PAYMENT_METHODS.find(m => m.type === selectedMethod)?.name}`,
      };

      processPayment(transaction);
      onPaymentComplete(selectedMethod);
    } catch (err) {
      Alert.alert("Payment Failed", getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const needsPhoneNumber = selectedMethod === "moncash";
  const canProceed = selectedMethod && (!needsPhoneNumber || phoneNumber.length >= 8);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Payment Method</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          {/* Amount Summary */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount to Pay</Text>
            <Text style={styles.amountValue}>
              {getCurrencySymbol()}{amount.toFixed(2)}
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Payment Methods */}
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>
            
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method.type}
                style={[
                  styles.methodCard,
                  selectedMethod === method.type && styles.methodCardSelected,
                ]}
                onPress={() => setSelectedMethod(method.type)}
              >
                <View style={styles.methodInfo}>
                  <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
                    <Ionicons name={method.icon} size={24} color="#ffffff" />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                    <Text style={styles.methodTime}>⚡ {method.processingTime}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radio,
                  selectedMethod === method.type && styles.radioSelected
                ]}>
                  {selectedMethod === method.type && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </Pressable>
            ))}

            {/* Payment Details Input */}
            {needsPhoneNumber && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  MonCash Phone Number
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="+509 1234 5678"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            )}
          </ScrollView>

          {/* Payment Button */}
          <View style={styles.footer}>
            <Pressable
              style={[
                styles.payButton,
                (!canProceed || processing) && styles.payButtonDisabled,
              ]}
              onPress={handlePayment}
              disabled={!canProceed || processing}
            >
              {processing ? (
                <Text style={styles.payButtonText}>Processing...</Text>
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#ffffff" />
                  <Text style={styles.payButtonText}>
                    Pay {getCurrencySymbol()}{amount.toFixed(2)}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  amountCard: {
    backgroundColor: "#f0fdf4",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  amountLabel: {
    fontSize: 14,
    color: "#15803d",
    marginBottom: 8,
    fontWeight: "500",
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#15803d",
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  methodInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  methodTime: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#3b82f6",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  inputSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
  },
  secureNote: {
    fontSize: 12,
    color: "#10b981",
    marginTop: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  payButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
});