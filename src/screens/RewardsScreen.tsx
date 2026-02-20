import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { rewardsAPI, getErrorMessage } from "../api/apiClient";

interface Reward {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: "available" | "claimed" | "expired";
  expiresAt: string | null;
  claimedAt: string | null;
  createdAt: string;
}

const rewardIconMap: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  welcome_bonus: { icon: "gift", color: "#f59e0b", bg: "#fef3c7" },
  daily_reward: { icon: "sunny", color: "#8b5cf6", bg: "#ede9fe" },
  first_deposit_bonus: { icon: "wallet", color: "#3b82f6", bg: "#dbeafe" },
  referral_bonus: { icon: "people", color: "#10b981", bg: "#d1fae5" },
  loyalty_reward: { icon: "star", color: "#ef4444", bg: "#fee2e2" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  available: { label: "Claim Now", color: "#10b981", bg: "#d1fae5", icon: "checkmark-circle" },
  claimed: { label: "Claimed", color: "#6b7280", bg: "#f3f4f6", icon: "checkmark-done" },
  expired: { label: "Expired", color: "#ef4444", bg: "#fee2e2", icon: "close-circle" },
};

export default function RewardsScreen() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      const data = await rewardsAPI.getRewards();
      setRewards(data.rewards || []);
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRewards();
  };

  const handleClaim = async (reward: Reward) => {
    if (reward.status !== "available") return;

    setClaimingId(reward.id);
    try {
      await rewardsAPI.claimReward(reward.id);
      Alert.alert(
        "Reward Claimed!",
        `G${reward.amount.toFixed(0)} has been added to your wallet.`,
        [{ text: "OK" }]
      );
      // Refresh to get updated list
      fetchRewards();
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setClaimingId(null);
    }
  };

  const getRewardVisuals = (type: string) => {
    return rewardIconMap[type] || { icon: "gift" as keyof typeof Ionicons.glyphMap, color: "#f59e0b", bg: "#fef3c7" };
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m left`;
  };

  const availableRewards = rewards.filter(r => r.status === "available");
  const claimedRewards = rewards.filter(r => r.status === "claimed");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Rewards & Bonuses</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#f59e0b"]} />}
        >
          {/* Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <Ionicons name="gift" size={28} color="#f59e0b" />
              <Text style={styles.summaryNumber}>{availableRewards.length}</Text>
              <Text style={styles.summaryLabel}>Available</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-done" size={28} color="#10b981" />
              <Text style={styles.summaryNumber}>{claimedRewards.length}</Text>
              <Text style={styles.summaryLabel}>Claimed</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash" size={28} color="#3b82f6" />
              <Text style={styles.summaryNumber}>
                G{claimedRewards.reduce((s, r) => s + r.amount, 0).toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Earned</Text>
            </View>
          </View>

          {/* Available Rewards */}
          {availableRewards.length > 0 && (
            <View style={styles.rewardsSection}>
              <Text style={styles.sectionTitle}>Available Rewards</Text>
              {availableRewards.map((reward) => {
                const visuals = getRewardVisuals(reward.type);
                const timeLeft = getTimeRemaining(reward.expiresAt);
                const isClaiming = claimingId === reward.id;
                return (
                  <Pressable
                    key={reward.id}
                    style={styles.rewardCard}
                    onPress={() => handleClaim(reward)}
                    disabled={isClaiming}
                  >
                    <View style={styles.rewardContent}>
                      <View style={[styles.rewardIcon, { backgroundColor: visuals.bg }]}>
                        <Ionicons name={visuals.icon} size={32} color={visuals.color} />
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                        <Text style={styles.rewardDescription}>{reward.description}</Text>
                        <Text style={styles.rewardAmount}>G{reward.amount.toFixed(0)}</Text>
                      </View>
                    </View>
                    {timeLeft && (
                      <Text style={styles.timeLeft}>
                        <Ionicons name="time-outline" size={12} color="#f59e0b" /> {timeLeft}
                      </Text>
                    )}
                    <Pressable
                      style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
                      onPress={() => handleClaim(reward)}
                      disabled={isClaiming}
                    >
                      {isClaiming ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                          <Text style={styles.claimButtonText}>Claim G{reward.amount.toFixed(0)}</Text>
                        </>
                      )}
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Claimed / Past Rewards */}
          {claimedRewards.length > 0 && (
            <View style={styles.rewardsSection}>
              <Text style={styles.sectionTitle}>Claimed Rewards</Text>
              {claimedRewards.map((reward) => {
                const visuals = getRewardVisuals(reward.type);
                return (
                  <View key={reward.id} style={[styles.rewardCard, { opacity: 0.7 }]}>
                    <View style={styles.rewardContent}>
                      <View style={[styles.rewardIcon, { backgroundColor: visuals.bg }]}>
                        <Ionicons name={visuals.icon} size={32} color={visuals.color} />
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                        <Text style={styles.rewardDescription}>{reward.description}</Text>
                        <Text style={[styles.rewardAmount, { color: "#6b7280" }]}>G{reward.amount.toFixed(0)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: "#d1fae5" }]}>
                        <Ionicons name="checkmark-done" size={14} color="#10b981" />
                        <Text style={[styles.statusText, { color: "#10b981" }]}>Claimed</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {rewards.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Rewards Yet</Text>
              <Text style={styles.emptySubtitle}>
                Keep playing to earn rewards! Make your first deposit to get a bonus.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  summarySection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  rewardsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  rewardCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rewardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f59e0b",
  },
  timeLeft: {
    fontSize: 12,
    color: "#f59e0b",
    marginTop: 8,
    textAlign: "right",
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: "#10b981",
    borderRadius: 10,
    gap: 6,
  },
  claimButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
