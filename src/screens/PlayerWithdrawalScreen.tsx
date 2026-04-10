import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { walletAPI, getErrorMessage } from "../api/apiClient";
import { getTranslation } from "../utils/translations";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

export default function PlayerWithdrawalScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const currency = useAppStore(s => s.currency);
    const language = useAppStore(s => s.language);
    const t = (key: string) => getTranslation(key as any, language);

    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<'moncash' | 'cashapp' | 'paypal' | 'bank_transfer'>(currency === 'HTG' ? 'moncash' : 'bank_transfer');
    const [moncashPhone, setMoncashPhone] = useState("");
    const [cashappTag, setCashappTag] = useState("");
    const [paypalEmail, setPaypalEmail] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountHolderName, setAccountHolderName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [routingNumber, setRoutingNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [walletData, setWalletData] = useState<{ balanceUsd: number; balanceHtg: number }>({ balanceUsd: 0, balanceHtg: 0 });

    useEffect(() => {
        walletAPI.getWallet().then(res => {
            if (res) setWalletData({ balanceUsd: res.balanceUsd || 0, balanceHtg: res.balanceHtg || 0 });
        }).catch(() => { });
    }, []);

    const balance = currency === "HTG" ? walletData.balanceHtg : walletData.balanceUsd;

    const currencySymbol = currency === "HTG" ? "G" : "$";
    const minAmount = currency === "HTG" ? 500 : 5;
    const maxAmount = currency === "HTG" ? 250000 : 5000;

    const formatCurrency = (amt: number) => {
        return `${currencySymbol}${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const canSubmit = parseFloat(amount) > 0 && (
        method === 'moncash'
            ? moncashPhone.replace(/[\s-]/g, '').length >= 8
            : method === 'cashapp'
                ? cashappTag.trim().length >= 2
                : method === 'paypal'
                    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)
                    : (bankName.trim() && accountHolderName.trim() && accountNumber.trim())
    );

    const handleSubmit = async () => {
        if (!canSubmit) return;
        const amt = parseFloat(amount);
        if (amt > balance) {
            Alert.alert(t("error") || "Error", t("insufficientBalance") || "Insufficient balance");
            return;
        }
        if (amt < minAmount) {
            Alert.alert(t("error") || "Error", `Minimum withdrawal: ${formatCurrency(minAmount)}`);
            return;
        }
        if (amt > maxAmount) {
            Alert.alert(t("error") || "Error", `Maximum withdrawal: ${formatCurrency(maxAmount)}`);
            return;
        }
        setProcessing(true);
        try {
            const base = { amount: amt, currency, notes } as const;
            if (method === 'moncash') {
                await walletAPI.requestWithdrawal({ ...base, method: 'moncash', moncashPhone });
            } else if (method === 'cashapp') {
                await walletAPI.requestWithdrawal({ ...base, method: 'cashapp', cashappTag });
            } else if (method === 'paypal') {
                await walletAPI.requestWithdrawal({ ...base, method: 'paypal', paypalEmail });
            } else {
                await walletAPI.requestWithdrawal({ ...base, method: 'bank_transfer', bankName, accountHolderName, accountNumber, routingNumber });
            }
            setShowSuccess(true);
        } catch (err: any) {
            Alert.alert(t("error") || "Error", getErrorMessage(err) || "Failed to submit withdrawal request");
        } finally {
            setProcessing(false);
        }
    };

    if (showSuccess) {
        return (
            <View style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#22c55e', width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        <Ionicons name="checkmark-circle" size={56} color="#fff" />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' }}>
                        {t("withdrawalSubmitted") || "Withdrawal Request Submitted!"}
                    </Text>
                    <Text style={{ fontSize: 16, color: '#4b5563', marginBottom: 4, textAlign: 'center' }}>
                        {formatCurrency(parseFloat(amount))} {t("withdrawalRequested") || "withdrawal has been requested."}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24, textAlign: 'center' }}>
                        {method === 'moncash'
                            ? (t("adminWillProcessMoncash") || "The admin will review and process your withdrawal via MonCash.")
                            : (t("adminWillProcess") || "The admin will review and process your withdrawal via bank transfer.")}
                    </Text>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={{ backgroundColor: '#f59e0b', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                            {t("backToDashboard") || "Back to Dashboard"}
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f9fafb' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                    <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </Pressable>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                        {t("withdrawal") || "Withdrawal"}
                    </Text>
                </View>

                {/* Balance Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginHorizontal: 16, marginTop: 16 }}>
                    <View style={{ backgroundColor: '#f59e0b', borderRadius: 16, padding: 20, shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                                {t("availableBalance") || "Available Balance"}
                            </Text>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{currency}</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff' }}>
                            {formatCurrency(balance)}
                        </Text>
                    </View>
                </Animated.View>

                {/* Amount Input */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginHorizontal: 16, marginTop: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                        {t("withdrawalAmount") || "Withdrawal Amount"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 14 }}>
                        <Text style={{ fontSize: 22, color: '#9ca3af', marginRight: 8 }}>{currencySymbol}</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor="#d1d5db"
                            keyboardType="decimal-pad"
                            style={{ flex: 1, fontSize: 22, fontWeight: '700', color: '#111827' }}
                        />
                    </View>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        {t("available") || "Available"}: {formatCurrency(balance)} · Min: {formatCurrency(minAmount)} · Max: {formatCurrency(maxAmount)}
                    </Text>
                </Animated.View>

                {/* Payment Method Selector */}
                <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginHorizontal: 16, marginTop: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                        {t("paymentMethod") || "Payment Method"}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {currency === 'HTG' && (
                            <Pressable
                                onPress={() => setMethod('moncash')}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: method === 'moncash' ? '#f59e0b' : '#e5e7eb',
                                    backgroundColor: method === 'moncash' ? '#fef3c7' : '#fff',
                                }}
                            >
                                <Ionicons name="phone-portrait" size={18} color={method === 'moncash' ? '#d97706' : '#6b7280'} />
                                <Text style={{ marginLeft: 6, fontWeight: '700', color: method === 'moncash' ? '#92400e' : '#6b7280' }}>MonCash</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={() => setMethod('bank_transfer')}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: method === 'bank_transfer' ? '#3b82f6' : '#e5e7eb',
                                backgroundColor: method === 'bank_transfer' ? '#eff6ff' : '#fff',
                            }}
                        >
                            <Ionicons name="business" size={18} color={method === 'bank_transfer' ? '#2563eb' : '#6b7280'} />
                            <Text style={{ marginLeft: 6, fontWeight: '700', color: method === 'bank_transfer' ? '#1e40af' : '#6b7280' }}>Bank Transfer</Text>
                        </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <Pressable
                            onPress={() => setMethod('cashapp')}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: method === 'cashapp' ? '#00D632' : '#e5e7eb',
                                backgroundColor: method === 'cashapp' ? '#e6faea' : '#fff',
                            }}
                        >
                            <Ionicons name="logo-usd" size={18} color={method === 'cashapp' ? '#00A825' : '#6b7280'} />
                            <Text style={{ marginLeft: 6, fontWeight: '700', color: method === 'cashapp' ? '#00732a' : '#6b7280' }}>Cash App</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setMethod('paypal')}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: method === 'paypal' ? '#0070ba' : '#e5e7eb',
                                backgroundColor: method === 'paypal' ? '#e8f4fc' : '#fff',
                            }}
                        >
                            <Ionicons name="logo-paypal" size={18} color={method === 'paypal' ? '#003087' : '#6b7280'} />
                            <Text style={{ marginLeft: 6, fontWeight: '700', color: method === 'paypal' ? '#003087' : '#6b7280' }}>PayPal</Text>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* MonCash Details */}
                {method === 'moncash' && (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="phone-portrait" size={20} color="#d97706" />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>
                                MonCash Details
                            </Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                {t("moncashPhone") || "MonCash Phone Number"}
                            </Text>
                            <TextInput
                                value={moncashPhone}
                                onChangeText={setMoncashPhone}
                                placeholder="+509 XXXX XXXX"
                                placeholderTextColor="#d1d5db"
                                keyboardType="phone-pad"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>
                    </Animated.View>
                )}

                {/* CashApp Details */}
                {method === 'cashapp' && (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="logo-usd" size={20} color="#00A825" />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>
                                Cash App Details
                            </Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                $Cashtag
                            </Text>
                            <TextInput
                                value={cashappTag}
                                onChangeText={setCashappTag}
                                placeholder="$yourtag"
                                placeholderTextColor="#d1d5db"
                                autoCapitalize="none"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>
                    </Animated.View>
                )}

                {/* PayPal Details */}
                {method === 'paypal' && (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="logo-paypal" size={20} color="#003087" />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>
                                PayPal Details
                            </Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                PayPal Email
                            </Text>
                            <TextInput
                                value={paypalEmail}
                                onChangeText={setPaypalEmail}
                                placeholder="your@email.com"
                                placeholderTextColor="#d1d5db"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>
                    </Animated.View>
                )}

                {/* Bank Details */}
                {method === 'bank_transfer' && (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="business" size={20} color="#d97706" />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>
                                {t("bankDetails") || "Bank Details"}
                            </Text>
                        </View>

                        {/* Bank Name */}
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                {t("bankName") || "Bank Name"}
                            </Text>
                            <TextInput
                                value={bankName}
                                onChangeText={setBankName}
                                placeholder="e.g. Sogebank, BNC, Unibank"
                                placeholderTextColor="#d1d5db"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>

                        {/* Account Holder Name */}
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                {t("accountHolderName") || "Account Holder Name"}
                            </Text>
                            <TextInput
                                value={accountHolderName}
                                onChangeText={setAccountHolderName}
                                placeholder="Full name on bank account"
                                placeholderTextColor="#d1d5db"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>

                        {/* Account Number */}
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                {t("accountNumber") || "Account Number"}
                            </Text>
                            <TextInput
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                placeholder="Bank account number"
                                placeholderTextColor="#d1d5db"
                                keyboardType="number-pad"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>

                        {/* Routing Number (optional) */}
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                {t("routingNumber") || "Routing Number"} ({t("optional") || "optional"})
                            </Text>
                            <TextInput
                                value={routingNumber}
                                onChangeText={setRoutingNumber}
                                placeholder="Routing/transit number"
                                placeholderTextColor="#d1d5db"
                                keyboardType="number-pad"
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' }}
                            />
                        </View>

                        {/* Notes (optional) */}
                        <View>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                {t("additionalNotes") || "Additional Notes"} ({t("optional") || "optional"})
                            </Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Any special instructions"
                                placeholderTextColor="#d1d5db"
                                multiline
                                style={{ backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', minHeight: 60, textAlignVertical: 'top' }}
                            />
                        </View>
                    </Animated.View>
                )}

                {/* Submit Button */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ marginHorizontal: 16, marginTop: 20 }}>
                    <Pressable
                        onPress={handleSubmit}
                        disabled={!canSubmit || processing}
                        style={{
                            backgroundColor: canSubmit && !processing ? '#f59e0b' : '#d1d5db',
                            borderRadius: 14,
                            paddingVertical: 16,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                    >
                        {processing ? (
                            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                        ) : (
                            <Ionicons name="arrow-down-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                        )}
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                            {processing ? (t("processing") || "Processing...") : (t("submitWithdrawalRequest") || "Submit Withdrawal Request")}
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* Info */}
                <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#eff6ff', borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons name="help-circle" size={20} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 4 }}>
                                {t("howItWorks") || "How It Works"}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#1d4ed8', lineHeight: 18 }}>
                                {`• ${t("withdrawStep1") || "Submit your withdrawal request with bank details"}\n• ${t("withdrawStep2") || "Admin reviews and approves the request"}\n• ${t("withdrawStep3") || "Funds are transferred directly to your bank account"}\n• ${t("withdrawStep4") || "Processing typically takes 1-3 business days"}`}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
