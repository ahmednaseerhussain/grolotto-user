import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, PaymentMethodType } from "../state/appStore";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";

const PAYMENT_METHODS = [
  {
    type: "debit_card" as PaymentMethodType,
    name: "Debit Card",
    icon: "card" as const,
    color: "#3b82f6",
    description: "Visa, Mastercard, Discover",
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

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
  amount?: number;
}

export default function PaymentModal({ visible, onClose, onPaymentSuccess, amount: propAmount }: PaymentModalProps) {
  const insets = useSafeAreaInsets();
  const currency = useAppStore(s => s.currency);
  const user = useAppStore(s => s.user);
  const processPayment = useAppStore(s => s.processPayment);

  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Set amount from prop if provided
  useEffect(() => {
    if (propAmount !== undefined && propAmount > 0) {
      setAmount(propAmount.toString());
    }
  }, [propAmount, visible]);

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

  const resetForm = () => {
    setAmount("");
    setSelectedMethod(null);
    setCardNumber("");
    setCardExpiry("");
    setCardCVV("");
    setPhoneNumber("");
    setProcessing(false);
    setShowSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const needsCardDetails = selectedMethod === "debit_card";
  const needsPhoneNumber = selectedMethod === "moncash" || selectedMethod === "natcash";
  
  const isValidCardNumber = cardNumber.replace(/\s/g, "").length >= 16;
  const isValidExpiry = cardExpiry.replace(/\D/g, "").length === 4;
  const isValidCVV = cardCVV.length >= 3;
  const isValidPhone = phoneNumber.length >= 8;
  
  const canProceed = amount && parseFloat(amount) > 0 && selectedMethod && 
    (!needsCardDetails || (isValidCardNumber && isValidExpiry && isValidCVV)) &&
    (!needsPhoneNumber || isValidPhone);

  const handlePayment = () => {
    if (!canProceed || !user) return;

    Keyboard.dismiss();
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const transaction = {
        id: Date.now().toString(),
        userId: user.id,
        type: propAmount ? ("bet_payment" as const) : ("deposit" as const),
        amount: parseFloat(amount),
        currency,
        paymentMethod: selectedMethod,
        status: "completed" as const,
        timestamp: Date.now(),
        description: propAmount 
          ? `Bet payment via ${PAYMENT_METHODS.find(m => m.type === selectedMethod)?.name}`
          : `Deposit via ${PAYMENT_METHODS.find(m => m.type === selectedMethod)?.name}`,
      };

      processPayment(transaction);
      setProcessing(false);
      setShowSuccess(true);

      // Close modal and call success callback
      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        handleClose();
      }, 2000);
    }, 1500);
  };

  if (showSuccess) {
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.successContainer}
          >
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={64} color="#ffffff" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>
              Your payment of {getCurrencySymbol()}{parseFloat(amount).toFixed(2)} was processed successfully
            </Text>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <Animated.View 
            entering={SlideInDown.duration(400)}
            style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {propAmount ? "Complete Payment" : "Add Funds"}
              </Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Current Balance */}
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>
                  {propAmount ? "Amount to Pay" : "Current Balance"}
                </Text>
                <Text style={styles.balanceAmount}>
                  {getCurrencySymbol()}{propAmount ? propAmount.toFixed(2) : (user?.balance || 0).toFixed(2)}
                </Text>
              </View>

              {/* Amount Input - Only show if no propAmount */}
              {!propAmount && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Enter Amount</Text>
                  <View style={styles.amountInput}>
                    <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                    <TextInput
                      style={styles.amountInputField}
                      placeholder="0.00"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={setAmount}
                    />
                  </View>

                  {/* Quick Amounts */}
                  <View style={styles.quickAmounts}>
                    {QUICK_AMOUNTS.map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => handleQuickAmount(value)}
                        style={styles.quickAmountButton}
                      >
                        <Text style={styles.quickAmountText}>
                          {getCurrencySymbol()}{value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Payment Methods */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Payment Method</Text>
                
                {PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method.type}
                    onPress={() => setSelectedMethod(method.type)}
                    style={[
                      styles.methodCard,
                      selectedMethod === method.type && styles.methodCardSelected,
                    ]}
                  >
                    <View style={styles.methodInfo}>
                      <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
                        <Ionicons name={method.icon} size={24} color="#ffffff" />
                      </View>
                      <View style={styles.methodDetails}>
                        <Text style={styles.methodName}>{method.name}</Text>
                        <Text style={styles.methodDescription}>{method.description}</Text>
                      </View>
                    </View>
                    <View 
                      style={[
                        styles.radio,
                        selectedMethod === method.type && styles.radioSelected
                      ]}
                    >
                      {selectedMethod === method.type && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Card Details */}
              {needsCardDetails && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
                  <Text style={styles.sectionTitle}>Card Details</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Card Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      maxLength={19}
                      value={cardNumber}
                      onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>Expiry Date</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MM/YY"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        maxLength={5}
                        value={cardExpiry}
                        onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                      />
                    </View>

                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput
                        style={styles.input}
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

                  <View style={styles.secureNote}>
                    <Ionicons name="lock-closed" size={16} color="#10b981" />
                    <Text style={styles.secureNoteText}>
                      Your payment info is secure and encrypted
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Phone Number */}
              {needsPhoneNumber && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {selectedMethod === "moncash" ? "MonCash" : "NatCash"} Phone Number
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="+509 1234 5678"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                  </View>
                </Animated.View>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Pay Button */}
            <View style={styles.footer}>
              <Pressable
                onPress={handlePayment}
                disabled={!canProceed || processing}
                style={[
                  styles.payButton,
                  (!canProceed || processing) && styles.payButtonDisabled,
                ]}
              >
                {processing ? (
                  <Text style={styles.payButtonText}>Processing...</Text>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="#ffffff" />
                    <Text style={styles.payButtonText}>
                      Pay {amount ? `${getCurrencySymbol()}${parseFloat(amount).toFixed(2)}` : ""}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "95%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  balanceHeader: {
    backgroundColor: "#f0fdf4",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#15803d",
    marginBottom: 8,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#15803d",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: 24,
    color: "#6b7280",
    marginRight: 8,
  },
  amountInputField: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
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
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 13,
    color: "#6b7280",
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
  inputContainer: {
    marginBottom: 16,
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
    padding: 14,
    fontSize: 16,
    color: "#1f2937",
  },
  inputRow: {
    flexDirection: "row",
  },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 12,
  },
  secureNoteText: {
    fontSize: 12,
    color: "#15803d",
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
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
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    margin: 40,
    padding: 40,
    borderRadius: 24,
  },
  successIcon: {
    width: 96,
    height: 96,
    backgroundColor: "#10b981",
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
