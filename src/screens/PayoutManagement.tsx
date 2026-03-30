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
    icon: "phone-portrait",
    color: "#ef4444",
    descriptionKey: "moncashDesc",
    fee: "0%",
    minAmount: 500,
    currencies: ["HTG"] as string[],
  },
  {
    key: "bank_transfer" as PayoutMethodType,
    name: "Bank Transfer",
    icon: "business",
    color: "#3b82f6",
    descriptionKey: "bankTransferDesc",
    fee: "1%",
    minAmount: 10,
    currencies: ["USD", "HTG"] as string[],
  },
  {
    key: "paypal" as PayoutMethodType,
    name: "PayPal",
    icon: "globe",
    color: "#16a34a",
    descriptionKey: "paypalDesc",
    fee: "2.5%",
    minAmount: 5,
    currencies: ["USD"] as string[],
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

  const PAYOUT_METHODS = PAYOUT_METHODS_BASE
    .filter(m => m.currencies.includes(withdrawalCurrency))
    .map(m => ({ ...m, description: t(m.descriptionKey) }));

  const [selectedMethod, setSelectedMethod] = useState<PayoutMethodType | null>(
    withdrawalCurrency === "HTG" ? "moncash" as PayoutMethodType : "bank_transfer"
  );
  const [amount, setAmount] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankRoutingNumber, setBankRoutingNumber] = useState("");
  const [moncashPhone, setMoncashPhone] = useState("");

  const currentVendor = vendors.find(v => v.userId === user?.id);
  const vendorPayouts = payouts.filter(p => p.vendorId === currentVendor?.id);
  const withdrawalCurrency = ((currentVendor as any)?.operatingCurrency || currency) as "HTG" | "USD";

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
    const isMoncash = selectedMethod === 'moncash';

    if (isMoncash) {
      if (!amount || !moncashPhone.trim() || moncashPhone.trim().length < 8) {
        Alert.alert(t("error"), "Please enter amount and a valid MonCash phone number");
        return;
      }
    } else {
      if (!amount || !bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim()) {
        Alert.alert(t("error"), t("fillBankDetails") || "Please fill in bank details and amount");
        return;
      }
    }

    const requestAmount = parseFloat(amount);

    // Convert amount to USD for validation (since balance is stored in USD)
    const requestAmountUSD = withdrawalCurrency === "HTG" ? requestAmount / 150 : requestAmount;
    const minAmountUSD = 10;

    if (requestAmountUSD < minAmountUSD) {
      const minAmountDisplay = withdrawalCurrency === "HTG" ? `G${(minAmountUSD * 150).toFixed(2)}` : `$${minAmountUSD}`;
      Alert.alert(t("error"), `${t("minimumAmount")}: ${minAmountDisplay}`);
      return;
    }

    if (requestAmountUSD > availableBalance) {
      Alert.alert(t("error"), t("insufficientBalance"));
      return;
    }

    requestPayout(currentVendor.id, requestAmountUSD, (selectedMethod || "bank_transfer") as PayoutMethodType);

    // Submit payout request to backend
    vendorAPI.requestPayout({
      amount: requestAmountUSD,
      method: selectedMethod || "bank_transfer",
      currency: withdrawalCurrency,
      ...(isMoncash ? { moncashPhone } : { bankName, bankAccountName, bankAccountNumber, bankRoutingNumber }),
    } as any).catch(err => {
      Alert.alert(t("error"), getErrorMessage(err));
    });

    const methodLabel = isMoncash ? 'MonCash' : selectedMethod === 'paypal' ? 'PayPal' : 'Bank Transfer';
    const amountDisplay = formatCurrency(requestAmount, withdrawalCurrency);
    Alert.alert(
      t("withdrawalSubmitted"),
      `${(t("withdrawalSubmittedMsg") || "Withdrawal of {amount} via {method} submitted").replace("{amount}", amountDisplay).replace("{method}", methodLabel)}`,
      [{
        text: "OK", onPress: () => {
          setShowRequestForm(false);
          setAmount("");
          setBankName("");
          setBankAccountName("");
          setBankAccountNumber("");
          setBankRoutingNumber("");
          setMoncashPhone("");
        }
      }]
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

              {/* Currency Badge */}
              <View style={[styles.currencyToggleButton, styles.currencyToggleButtonActive]}>
                <Text style={[styles.currencyToggleText, styles.currencyToggleTextActive]}>{withdrawalCurrency}</Text>
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

                {/* Bank Transfer - Always Selected */}
                <View style={[styles.methodCard, styles.methodCardSelected]}>
                  <View style={styles.methodInfo}>
                    <View style={[styles.methodIcon, { backgroundColor: "#3b82f6" }]}>
                      <Ionicons name="business" size={20} color="#ffffff" />
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodName}>Bank Transfer</Text>
                      <Text style={styles.methodDescription}>{t("bankTransferDesc") || "Transfer to your bank account"}</Text>
                      <View style={styles.methodStats}>
                        <Text style={styles.methodFee}>{t("fees")}: 1%</Text>
                        <Text style={styles.methodMin}>{t("minimum")}: {withdrawalCurrency === "HTG" ? "G1,500" : "$10"}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Bank Details — bank_transfer only */}
                {selectedMethod === 'bank_transfer' && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <View>
                      <Text style={styles.amountLabel}>{t("bankName") || "Bank Name"}</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={bankName}
                        onChangeText={setBankName}
                        placeholder="e.g. Sogebank, BNC, Unibank"
                      />
                    </View>
                    <View>
                      <Text style={styles.amountLabel}>{t("accountHolderName") || "Account Holder Name"}</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={bankAccountName}
                        onChangeText={setBankAccountName}
                        placeholder="Full name on account"
                      />
                    </View>
                    <View>
                      <Text style={styles.amountLabel}>{t("accountNumber") || "Account Number"}</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={bankAccountNumber}
                        onChangeText={setBankAccountNumber}
                        placeholder="Bank account number"
                      />
                    </View>
                    <View>
                      <Text style={styles.amountLabel}>{t("routingNumber") || "Routing Number (optional)"}</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={bankRoutingNumber}
                        onChangeText={setBankRoutingNumber}
                        placeholder="Routing/transit number"
                      />
                    </View>
                  </View>
                )}

                {/* MonCash Details — moncash only */}
                {selectedMethod === 'moncash' && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <View>
                      <Text style={styles.amountLabel}>MonCash Phone Number</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={moncashPhone}
                        onChangeText={setMoncashPhone}
                        placeholder="+509 XXXX XXXX"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                )}

                {/* PayPal Details — paypal only */}
                {selectedMethod === 'paypal' && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <View>
                      <Text style={styles.amountLabel}>PayPal Email</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={bankAccountName}
                        onChangeText={setBankAccountName}
                        placeholder="your@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <Pressable
                style={[
                  styles.submitButton,
                  (!amount || (selectedMethod === 'moncash' ? !moncashPhone.trim() : (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim()))) && styles.submitButtonDisabled
                ]}
                onPress={handleRequestPayout}
                disabled={!amount || (selectedMethod === 'moncash' ? !moncashPhone.trim() : (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim()))}
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