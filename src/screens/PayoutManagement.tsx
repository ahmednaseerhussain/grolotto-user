import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore, PayoutMethodType } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { vendorAPI, getErrorMessage } from "../api/apiClient";

const PAYOUT_METHODS_BASE = [
  { 
    key: "moncash" as PayoutMethodType, 
    name: "MonCash", 
    icon: "wallet", 
    color: "#ef4444",
    descriptionKey: "instantTransferMonCash",
    fee: "2%",
    minAmount: 10,
  },
];

export default function PayoutManagement() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const payouts = useAppStore(s => s.payouts);
  const requestPayout = useAppStore(s => s.requestPayout);
  const currency = useAppStore(s => s.currency);
  const setCurrency = useAppStore(s => s.setCurrency);
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  
  const PAYOUT_METHODS = PAYOUT_METHODS_BASE.map(m => ({ ...m, description: t(m.descriptionKey) }));
  
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethodType | null>(null);
  const [amount, setAmount] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [withdrawalCurrency, setWithdrawalCurrency] = useState<"HTG" | "USD">(currency);
  
  const currentVendor = vendors.find(v => v.userId === user?.id);
  const vendorPayouts = payouts.filter(p => p.vendorId === currentVendor?.id);
  
  // Currency formatting and conversion
  const formatCurrency = (amount: number, targetCurrency: "HTG" | "USD" = withdrawalCurrency) => {
    const symbol = targetCurrency === "HTG" ? "G" : "$";
    const rate = targetCurrency === "HTG" ? 150 : 1; // Approximate HTG to USD rate
    const convertedAmount = amount * rate;
    return `${symbol}${convertedAmount.toFixed(2)}`;
  };
  
  const convertAmount = (amount: number, from: "HTG" | "USD", to: "HTG" | "USD") => {
    if (from === to) return amount;
    if (from === "USD" && to === "HTG") return amount * 150;
    if (from === "HTG" && to === "USD") return amount / 150;
    return amount;
  };
  
  if (!currentVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>{t("vendorNotFound")}</Text>
      </SafeAreaView>
    );
  }

  const availableBalance = currentVendor.availableBalance;
  const pendingAmount = vendorPayouts
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleRequestPayout = () => {
    if (!selectedMethod || !amount) {
      Alert.alert(t("error"), t("selectMethodAndAmount"));
      return;
    }

    const requestAmount = parseFloat(amount);
    const method = PAYOUT_METHODS.find(m => m.key === selectedMethod)!;
    
    // Convert amount to USD for validation (since balance is stored in USD)
    const requestAmountUSD = withdrawalCurrency === "HTG" ? requestAmount / 150 : requestAmount;
    const minAmountUSD = method.minAmount;
    
    if (requestAmountUSD < minAmountUSD) {
      const minAmountDisplay = withdrawalCurrency === "HTG" ? `G${(minAmountUSD * 150).toFixed(2)}` : `$${minAmountUSD}`;
      Alert.alert(t("error"), `${t("minimumAmount")}: ${minAmountDisplay}`);
      return;
    }

    if (requestAmountUSD > availableBalance) {
      Alert.alert(t("error"), t("insufficientBalance"));
      return;
    }

    requestPayout(currentVendor.id, requestAmountUSD, selectedMethod);
    
    // Submit payout request to backend
    vendorAPI.requestPayout({
      amount: requestAmountUSD,
      method: selectedMethod,
      currency: withdrawalCurrency,
    }).catch(err => {
      Alert.alert(t("error"), getErrorMessage(err));
    });

    const amountDisplay = formatCurrency(requestAmount, withdrawalCurrency);
    Alert.alert(
      t("withdrawalSubmitted"), 
      `${t("withdrawalSubmittedMsg").replace("{amount}", amountDisplay).replace("{method}", method.name)}`,
      [{ text: "OK", onPress: () => {
        setShowRequestForm(false);
        setAmount("");
        setSelectedMethod(null);
      }}]
    );
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return t("pending");
      case "approved": return t("approved");
      case "rejected": return t("rejectedStatus");
      case "paid": return t("paidStatus");
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("withdrawals")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Balance Overview */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceHeaderLeft}>
                <Ionicons name="wallet" size={24} color="#10b981" />
                <Text style={styles.balanceTitle}>{t("availableBalance")}</Text>
              </View>
              
              {/* Currency Toggle */}
              <View style={styles.currencyToggleContainer}>
                <Pressable 
                  style={[
                    styles.currencyToggleButton,
                    withdrawalCurrency === "HTG" && styles.currencyToggleButtonActive
                  ]}
                  onPress={() => setWithdrawalCurrency("HTG")}
                >
                  <Text style={[
                    styles.currencyToggleText,
                    withdrawalCurrency === "HTG" && styles.currencyToggleTextActive
                  ]}>HTG</Text>
                </Pressable>
                <Pressable 
                  style={[
                    styles.currencyToggleButton,
                    withdrawalCurrency === "USD" && styles.currencyToggleButtonActive
                  ]}
                  onPress={() => setWithdrawalCurrency("USD")}
                >
                  <Text style={[
                    styles.currencyToggleText,
                    withdrawalCurrency === "USD" && styles.currencyToggleTextActive
                  ]}>USD</Text>
                </Pressable>
              </View>
            </View>
            
            <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
            
            <View style={styles.balanceDetails}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>{t("pendingAmount")}</Text>
                <Text style={styles.balancePending}>{formatCurrency(pendingAmount)}</Text>
              </View>
              
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>{t("totalEarned")}</Text>
                <Text style={styles.balanceTotal}>{formatCurrency(currentVendor.totalRevenue)}</Text>
              </View>
            </View>

            <Pressable 
              style={[styles.requestButton, availableBalance <= 0 && styles.requestButtonDisabled]}
              onPress={() => setShowRequestForm(true)}
              disabled={availableBalance <= 0}
            >
              <Ionicons name="arrow-down" size={20} color="#ffffff" />
              <Text style={styles.requestButtonText}>{t("requestWithdrawal")}</Text>
            </Pressable>
          </View>

          {/* Request Form */}
          {showRequestForm && (
            <View style={styles.requestForm}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{t("newWithdrawal")}</Text>
                <Pressable 
                  style={styles.closeButton}
                  onPress={() => setShowRequestForm(false)}
                >
                  <Ionicons name="close" size={20} color="#6b7280" />
                </Pressable>
              </View>

              {/* Amount Input */}
              <View style={styles.amountSection}>
                <View style={styles.amountHeader}>
                  <Text style={styles.amountLabel}>{t("amountToWithdraw")}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyInfoText}>
                      {withdrawalCurrency === "HTG" ? t("haitianGourdes") : t("usDollars")}
                    </Text>
                  </View>
                </View>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>
                    {withdrawalCurrency === "HTG" ? "G" : "$"}
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.availableContainer}>
                  <Text style={styles.availableText}>
                    {t("available")}: {formatCurrency(availableBalance)}
                  </Text>
                  {withdrawalCurrency === "HTG" && (
                    <Text style={styles.conversionText}>
                      ≈ ${availableBalance.toFixed(2)} USD
                    </Text>
                  )}
                  {withdrawalCurrency === "USD" && (
                    <Text style={styles.conversionText}>
                      ≈ G{(availableBalance * 150).toFixed(2)} HTG
                    </Text>
                  )}
                </View>
              </View>

              {/* Payment Methods */}
              <View style={styles.methodsSection}>
                <Text style={styles.methodsTitle}>{t("paymentMethod")}</Text>
                
                {PAYOUT_METHODS.map((method) => {
                  const isSelected = selectedMethod === method.key;
                  const requestAmount = parseFloat(amount) || 0;
                  const requestAmountUSD = withdrawalCurrency === "HTG" ? requestAmount / 150 : requestAmount;
                  const canSelect = requestAmountUSD >= method.minAmount;
                  const minAmountDisplay = withdrawalCurrency === "HTG" ? 
                    `G${(method.minAmount * 150).toFixed(0)}` : 
                    `$${method.minAmount}`;
                  
                  return (
                    <Pressable
                      key={method.key}
                      style={[
                        styles.methodCard,
                        isSelected && styles.methodCardSelected,
                        !canSelect && requestAmount > 0 && styles.methodCardDisabled,
                      ]}
                      onPress={() => setSelectedMethod(method.key)}
                      disabled={!canSelect && requestAmount > 0}
                    >
                      <View style={styles.methodInfo}>
                        <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
                          <Ionicons name={method.icon as any} size={20} color="#ffffff" />
                        </View>
                        
                        <View style={styles.methodDetails}>
                          <Text style={styles.methodName}>{method.name}</Text>
                          <Text style={styles.methodDescription}>{method.description}</Text>
                          <View style={styles.methodStats}>
                            <Text style={styles.methodFee}>{t("fees")}: {method.fee}</Text>
                            <Text style={styles.methodMin}>{t("minimum")}: {minAmountDisplay}</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.methodRadio, isSelected && styles.methodRadioSelected]}>
                        {isSelected && <View style={styles.methodRadioInner} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Submit Button */}
              <Pressable 
                style={[
                  styles.submitButton, 
                  (!selectedMethod || !amount) && styles.submitButtonDisabled
                ]}
                onPress={handleRequestPayout}
                disabled={!selectedMethod || !amount}
              >
                <Ionicons name="send" size={16} color="#ffffff" />
                <Text style={styles.submitButtonText}>{t("submitRequest")}</Text>
              </Pressable>
            </View>
          )}

          {/* Payout History */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>{t("withdrawalHistory")}</Text>
            
            {vendorPayouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>{t("noWithdrawals")}</Text>
                <Text style={styles.emptyStateSubtext}>
                  {t("withdrawalRequestsAppearHere")}
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {vendorPayouts
                  .sort((a, b) => b.requestDate - a.requestDate)
                  .map((payout) => {
                    const method = PAYOUT_METHODS.find(m => m.key === payout.method)!;
                    
                    return (
                      <View key={payout.id} style={styles.payoutCard}>
                        <View style={styles.payoutHeader}>
                          <View style={styles.payoutMethod}>
                            <View style={[styles.payoutMethodIcon, { backgroundColor: method.color }]}>
                              <Ionicons name={method.icon as any} size={16} color="#ffffff" />
                            </View>
                            <Text style={styles.payoutMethodName}>{method.name}</Text>
                          </View>
                          
                          <View style={styles.payoutAmount}>
                            <Text style={styles.payoutAmountText}>
                              {formatCurrency(payout.amount)}
                            </Text>
                            <View style={[styles.payoutStatus, { backgroundColor: getStatusColor(payout.status) }]}>
                              <Text style={styles.payoutStatusText}>{getStatusText(payout.status)}</Text>
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.payoutDetails}>
                          <Text style={styles.payoutDate}>
                            {t("requested")}: {new Date(payout.requestDate).toLocaleDateString()}
                          </Text>
                          {payout.processedDate && (
                            <Text style={styles.payoutDate}>
                              {t("processed")}: {new Date(payout.processedDate).toLocaleDateString()}
                            </Text>
                          )}
                          {payout.notes && (
                            <Text style={styles.payoutNotes}>{payout.notes}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>

          {/* Help Section */}
          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <Ionicons name="help-circle" size={20} color="#3b82f6" />
              <Text style={styles.helpTitle}>{t("helpAndFAQ")}</Text>
            </View>
            <Text style={styles.helpText}>
              {t("helpWithdrawalText")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  balanceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  balanceItem: {
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  balancePending: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f59e0b",
  },
  balanceTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  requestButton: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 8,
  },
  requestForm: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  amountSection: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6b7280",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
  },
  availableText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "right",
  },
  methodsSection: {
    marginBottom: 24,
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  methodInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  methodStats: {
    flexDirection: "row",
    gap: 12,
  },
  methodFee: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "500",
  },
  methodMin: {
    fontSize: 11,
    color: "#6b7280",
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  methodRadioSelected: {
    borderColor: "#3b82f6",
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b82f6",
  },
  submitButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 8,
  },
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  historyList: {
    gap: 12,
  },
  payoutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  payoutMethod: {
    flexDirection: "row",
    alignItems: "center",
  },
  payoutMethodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  payoutMethodName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  payoutAmount: {
    alignItems: "flex-end",
  },
  payoutAmountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  payoutStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  payoutStatusText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#ffffff",
  },
  payoutDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  payoutDate: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  payoutNotes: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    fontStyle: "italic",
  },
  helpCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
  balanceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    padding: 2,
  },
  currencyToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  currencyToggleButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currencyToggleText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  currencyToggleTextActive: {
    color: "#1f2937",
    fontWeight: "600",
  },
  amountHeader: {
    marginBottom: 8,
  },
  currencyInfo: {
    marginTop: 2,
  },
  currencyInfoText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  availableContainer: {
    marginTop: 8,
  },
  conversionText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
});