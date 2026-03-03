import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Share, Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { giftCardAPI, walletAPI, getErrorMessage } from "../api/apiClient";
import { getTranslation } from "../utils/translations";

const HTG_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const USD_AMOUNTS = [5, 10, 25, 50, 100];

type Tab = "buy" | "redeem" | "history";

interface GiftCard {
  id: number;
  code: string;
  amount: number;
  currency: string;
  status: string;
  recipientName?: string;
  message?: string;
  purchasedAt: string;
  redeemedAt?: string;
  expiresAt: string;
}

export default function GiftCardScreen() {
  const navigation = useNavigation();
  const user = useAppStore((s) => s.user);
  const currency = useAppStore((s) => s.currency);
  const language = useAppStore((s) => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  const [activeTab, setActiveTab] = useState<Tab>("buy");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<GiftCard | null>(null);
  const [redeemResult, setRedeemResult] = useState<{ amount: number; currency: string } | null>(null);
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [balance, setBalance] = useState(0);

  const amounts = currency === "HTG" ? HTG_AMOUNTS : USD_AMOUNTS;
  const symbol = currency === "HTG" ? "G" : "$";

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  const fetchBalance = async () => {
    try {
      const w = await walletAPI.getWallet();
      if (w) {
        const b = currency === "HTG" ? (w.data?.balanceHtg ?? w.balanceHtg ?? 0) : (w.data?.balanceUsd ?? w.balanceUsd ?? 0);
        setBalance(parseFloat(b) || 0);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await giftCardAPI.getMyCards();
      const cards = res?.data || res?.cards || (Array.isArray(res) ? res : []);
      setMyCards(cards);
    } catch (e) {
      Alert.alert("Error", "Failed to load gift card history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedAmount) {
      Alert.alert("Select Amount", "Please choose a gift card amount");
      return;
    }
    if (selectedAmount > balance) {
      Alert.alert("Insufficient Balance", `You need ${symbol}${selectedAmount} but only have ${symbol}${balance.toFixed(2)}`);
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Buy a ${symbol}${selectedAmount} gift card?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: async () => {
            setProcessing(true);
            try {
              const res = await giftCardAPI.purchase({
                amount: selectedAmount,
                currency,
                recipientName: recipientName.trim() || undefined,
                message: giftMessage.trim() || undefined,
              });
              const card = res?.data || res;
              setPurchasedCard(card);
              fetchBalance();
              setSelectedAmount(null);
              setRecipientName("");
              setGiftMessage("");
            } catch (e: any) {
              const msg = e?.response?.data?.error || getErrorMessage(e) || "Failed to purchase";
              Alert.alert("Purchase Failed", msg);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      Alert.alert("Enter Code", "Please enter a gift card code");
      return;
    }
    setProcessing(true);
    try {
      const res = await giftCardAPI.redeem(redeemCode.trim().toUpperCase());
      const result = res?.data || res;
      setRedeemResult({ amount: result.amount, currency: result.currency || currency });
      fetchBalance();
      setRedeemCode("");
    } catch (e: any) {
      const code = e?.response?.data?.code;
      const msg = e?.response?.data?.error || e?.response?.data?.message;
      if (code === "INVALID_CODE") Alert.alert("Invalid Code", "This gift card code is not valid.");
      else if (code === "ALREADY_REDEEMED") Alert.alert("Already Redeemed", "This gift card has already been used.");
      else if (code === "EXPIRED") Alert.alert("Expired", "This gift card has expired.");
      else if (code === "SELF_REDEEM") Alert.alert("Cannot Redeem", "You cannot redeem your own gift card.");
      else Alert.alert("Redeem Failed", msg || "Failed to redeem gift card. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleShare = async (code: string) => {
    try {
      await Share.share({
        message: `🎁 Here's your GroLotto Gift Card!\nCode: ${code}\n\nRedeem it on the GroLotto app!`,
        title: "GroLotto Gift Card",
      });
    } catch {}
  };

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    Alert.alert("Copied!", "Gift card code copied to clipboard");
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "active") return "#10b981";
    if (status === "redeemed") return "#6b7280";
    if (status === "expired") return "#ef4444";
    return "#6b7280";
  };

  // ─── Success screen after purchase ─────────────────
  if (purchasedCard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => { setPurchasedCard(null); navigation.goBack(); }}>
            <Ionicons name="close" size={24} color="#f1f5f9" />
          </Pressable>
          <Text style={styles.headerTitle}>Gift Card Purchased!</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Success icon */}
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Purchase Successful!</Text>
          <Text style={styles.successSub}>Share this code with your recipient</Text>

          {/* Card visual */}
          <View style={styles.giftCardVisual}>
            <View style={styles.giftCardHeader}>
              <Ionicons name="gift" size={32} color="#ffffff" />
              <Text style={styles.giftCardBrand}>GROLOTTO</Text>
            </View>
            <Text style={styles.giftCardAmount}>
              {symbol}{purchasedCard.amount}
            </Text>
            {purchasedCard.recipientName && (
              <Text style={styles.giftCardRecipient}>For: {purchasedCard.recipientName}</Text>
            )}
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>GIFT CARD CODE</Text>
              <Text style={styles.codeText}>{purchasedCard.code}</Text>
            </View>
            <Text style={styles.expiryText}>
              Expires: {formatDate(purchasedCard.expiresAt)}
            </Text>
          </View>

          {purchasedCard.message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Message</Text>
              <Text style={styles.messageText}>{purchasedCard.message}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={styles.shareRow}>
            <Pressable style={[styles.shareBtn, { backgroundColor: "#3b82f6" }]} onPress={() => handleShare(purchasedCard.code)}>
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
            <Pressable style={[styles.shareBtn, { backgroundColor: "#6b7280" }]} onPress={() => handleCopy(purchasedCard.code)}>
              <Ionicons name="copy" size={20} color="#fff" />
              <Text style={styles.shareBtnText}>Copy Code</Text>
            </Pressable>
          </View>

          <Pressable style={styles.doneButton} onPress={() => setPurchasedCard(null)}>
            <Text style={styles.doneText}>Buy Another</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Success screen after redeem ─────────────────
  if (redeemResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => { setRedeemResult(null); navigation.goBack(); }}>
            <Ionicons name="close" size={24} color="#f1f5f9" />
          </Pressable>
          <Text style={styles.headerTitle}>Redeemed!</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Gift Card Redeemed!</Text>
          <Text style={styles.successSub}>Added to your wallet</Text>

          <View style={styles.redeemResultBox}>
            <Text style={styles.redeemAmountLabel}>Amount Added</Text>
            <Text style={styles.redeemAmount}>
              {redeemResult.currency === "HTG" ? "G" : "$"}{redeemResult.amount}
            </Text>
          </View>

          <Pressable style={styles.doneButton} onPress={() => setRedeemResult(null)}>
            <Text style={styles.doneText}>Redeem Another</Text>
          </Pressable>
          <Pressable style={[styles.doneButton, { backgroundColor: "#334155", marginTop: 8 }]} onPress={() => { setRedeemResult(null); navigation.goBack(); }}>
            <Text style={[styles.doneText, { color: "#f1f5f9" }]}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#f1f5f9" />
        </Pressable>
        <Text style={styles.headerTitle}>Gift Cards</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Balance chip */}
      <View style={styles.balanceRow}>
        <Ionicons name="wallet-outline" size={16} color="#94a3b8" />
        <Text style={styles.balanceText}>
          Balance: {symbol}{balance.toFixed(2)} {currency}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["buy", "redeem", "history"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

        {/* ─── BUY TAB ─── */}
        {activeTab === "buy" && (
          <View>
            <Text style={styles.sectionTitle}>Select Amount</Text>
            <View style={styles.amountGrid}>
              {amounts.map((amt) => (
                <Pressable
                  key={amt}
                  style={[styles.amountChip, selectedAmount === amt && styles.amountChipSelected]}
                  onPress={() => setSelectedAmount(amt)}
                >
                  <Text style={[styles.amountText, selectedAmount === amt && styles.amountTextSelected]}>
                    {symbol}{amt}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recipient (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Recipient's name"
              placeholderTextColor="#9ca3af"
              value={recipientName}
              onChangeText={setRecipientName}
            />

            <Text style={styles.sectionTitle}>Message (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Add a personal message..."
              placeholderTextColor="#9ca3af"
              value={giftMessage}
              onChangeText={setGiftMessage}
              multiline
            />

            <Pressable
              style={[styles.primaryButton, (!selectedAmount || processing) && { opacity: 0.5 }]}
              onPress={handlePurchase}
              disabled={!selectedAmount || processing}
            >
              <Ionicons name="gift" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {processing ? "Processing..." : `Buy Gift Card${selectedAmount ? ` (${symbol}${selectedAmount})` : ""}`}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── REDEEM TAB ─── */}
        {activeTab === "redeem" && (
          <View>
            <View style={styles.redeemHero}>
              <Ionicons name="ticket" size={48} color="#ec4899" />
              <Text style={styles.redeemHeroTitle}>Redeem a Gift Card</Text>
              <Text style={styles.redeemHeroSub}>Enter your gift card code to add funds to your wallet</Text>
            </View>

            <Text style={styles.sectionTitle}>Gift Card Code</Text>
            <TextInput
              style={[styles.input, { textTransform: "uppercase", letterSpacing: 2, fontSize: 18, textAlign: "center" }]}
              placeholder="XXXX-XXXX-XXXX"
              placeholderTextColor="#9ca3af"
              value={redeemCode}
              onChangeText={(v) => setRedeemCode(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={20}
            />

            <Pressable
              style={[styles.primaryButton, { backgroundColor: "#ec4899" }, (!redeemCode.trim() || processing) && { opacity: 0.5 }]}
              onPress={handleRedeem}
              disabled={!redeemCode.trim() || processing}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {processing ? "Redeeming..." : "Redeem Gift Card"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── HISTORY TAB ─── */}
        {activeTab === "history" && (
          <View>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>My Gift Cards</Text>
              <Pressable onPress={fetchHistory}>
                <Ionicons name="refresh" size={20} color="#94a3b8" />
              </Pressable>
            </View>

            {loadingHistory ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : myCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="gift-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No gift cards yet</Text>
                <Text style={styles.emptySub}>Purchase a gift card to get started</Text>
                <Pressable style={styles.primaryButton} onPress={() => setActiveTab("buy")}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Buy a Gift Card</Text>
                </Pressable>
              </View>
            ) : (
              myCards.map((card) => (
                <View key={card.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyCode}>{card.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(card.status) + "20" }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(card.status) }]}>
                        {card.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyAmount}>
                    {card.currency === "HTG" ? "G" : "$"}{card.amount} {card.currency}
                  </Text>
                  {card.recipientName && (
                    <Text style={styles.historyMeta}>
                      <Text style={{ fontWeight: "600" }}>For:</Text> {card.recipientName}
                    </Text>
                  )}
                  <View style={styles.historyDates}>
                    <Text style={styles.historyMeta}>Purchased: {formatDate(card.purchasedAt)}</Text>
                    {card.redeemedAt && <Text style={styles.historyMeta}>Redeemed: {formatDate(card.redeemedAt)}</Text>}
                    <Text style={styles.historyMeta}>Expires: {formatDate(card.expiresAt)}</Text>
                  </View>
                  {card.status === "active" && (
                    <View style={styles.historyActions}>
                      <Pressable style={styles.historyBtn} onPress={() => handleCopy(card.code)}>
                        <Ionicons name="copy-outline" size={16} color="#3b82f6" />
                        <Text style={styles.historyBtnText}>Copy</Text>
                      </Pressable>
                      <Pressable style={styles.historyBtn} onPress={() => handleShare(card.code)}>
                        <Ionicons name="share-social-outline" size={16} color="#10b981" />
                        <Text style={[styles.historyBtnText, { color: "#10b981" }]}>Share</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#1e293b",
    borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#f1f5f9" },
  balanceRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(16,185,129,0.1)", paddingVertical: 8, gap: 6,
  },
  balanceText: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
  tabs: { flexDirection: "row", backgroundColor: "#1e293b", borderBottomWidth: 1, borderBottomColor: "#334155" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#ec4899" },
  tabText: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  tabTextActive: { color: "#ec4899", fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#f1f5f9", marginBottom: 10, marginTop: 16 },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amountChip: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    borderWidth: 2, borderColor: "#334155", backgroundColor: "#1e293b",
  },
  amountChipSelected: { borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)" },
  amountText: { fontSize: 16, fontWeight: "600", color: "#f1f5f9" },
  amountTextSelected: { color: "#ec4899" },
  input: {
    backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: "#f1f5f9",
  },
  primaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#ec4899", paddingVertical: 16, borderRadius: 14, marginTop: 20, gap: 8,
  },
  primaryButtonText: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  successIcon: { alignItems: "center", marginTop: 20, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#f1f5f9", textAlign: "center" },
  successSub: { fontSize: 15, color: "#94a3b8", textAlign: "center", marginTop: 4, marginBottom: 24 },
  giftCardVisual: {
    backgroundColor: "#f97316", borderRadius: 20, padding: 24, marginBottom: 16,
    shadowColor: "#f97316", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  giftCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  giftCardBrand: { fontSize: 18, fontWeight: "800", color: "#ffffff", letterSpacing: 2 },
  giftCardAmount: { fontSize: 40, fontWeight: "800", color: "#ffffff", marginBottom: 8 },
  giftCardRecipient: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginBottom: 12 },
  codeBox: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 12, padding: 12, marginBottom: 8, alignItems: "center" },
  codeLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: 2, marginBottom: 4 },
  codeText: { fontSize: 22, fontWeight: "700", color: "#ffffff", letterSpacing: 3 },
  expiryText: { fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "right" },
  messageBox: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  messageLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 4, fontWeight: "600" },
  messageText: { fontSize: 15, color: "#f1f5f9" },
  shareRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8 },
  shareBtnText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  doneButton: {
    backgroundColor: "#ec4899", paddingVertical: 14, borderRadius: 12,
    alignItems: "center", marginTop: 4,
  },
  doneText: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  redeemHero: { alignItems: "center", paddingVertical: 20, marginBottom: 8 },
  redeemHeroTitle: { fontSize: 22, fontWeight: "700", color: "#f1f5f9", marginTop: 12 },
  redeemHeroSub: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginTop: 4, paddingHorizontal: 20 },
  redeemResultBox: {
    backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 20, padding: 32, alignItems: "center",
    borderWidth: 2, borderColor: "#10b981", marginVertical: 24, width: "100%",
  },
  redeemAmountLabel: { fontSize: 14, color: "#94a3b8", marginBottom: 4 },
  redeemAmount: { fontSize: 48, fontWeight: "800", color: "#10b981" },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  loadingText: { textAlign: "center", color: "#94a3b8", marginTop: 20 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#f1f5f9" },
  emptySub: { fontSize: 14, color: "#94a3b8", marginBottom: 8 },
  historyCard: {
    backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#334155",
  },
  historyCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyCode: { fontSize: 16, fontWeight: "700", color: "#f1f5f9", letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
  historyAmount: { fontSize: 22, fontWeight: "700", color: "#f1f5f9", marginBottom: 8 },
  historyMeta: { fontSize: 13, color: "#94a3b8", marginBottom: 2 },
  historyDates: { marginTop: 4, marginBottom: 8 },
  historyActions: { flexDirection: "row", gap: 10 },
  historyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(59,130,246,0.1)" },
  historyBtnText: { fontSize: 13, color: "#3b82f6", fontWeight: "500" },
});
