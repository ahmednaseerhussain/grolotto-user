import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import PaymentModal from "./PaymentModal";

interface Reward {
  id: string;
  title: string;
  description: string;
  amount: number;
  minDeposit?: number;
  badge: string;
  badgeColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  claimed: boolean;
  claimable: boolean;
}

export default function RewardsScreen() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);
  const user = useAppStore(s => s.user);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const t = (key: string) => getTranslation(key as any, language);

  const rewards: Reward[] = [
    {
      id: "1",
      title: "Welcome Bonus",
      description: "Get 20% extra on your first deposit",
      amount: 20, // 20% bonus
      minDeposit: 100,
      badge: "New User",
      badgeColor: "#f59e0b",
      icon: "gift",
      iconBg: "#fef3c7",
      claimed: false,
      claimable: true,
    },
    {
      id: "2",
      title: "Daily Spin",
      description: "Spin the wheel for a chance to win up to G500",
      amount: 500,
      badge: "Daily",
      badgeColor: "#8b5cf6",
      icon: "refresh-circle",
      iconBg: "#ede9fe",
      claimed: false,
      claimable: true,
    },
    {
      id: "3",
      title: "First Deposit Bonus",
      description: "100% match on deposits over G500",
      amount: 100, // 100% bonus
      minDeposit: 500,
      badge: "Deposit",
      badgeColor: "#3b82f6",
      icon: "wallet",
      iconBg: "#dbeafe",
      claimed: false,
      claimable: true,
    },
    {
      id: "4",
      title: "Refer a Friend",
      description: "Get G100 for each friend who joins and plays",
      amount: 100,
      badge: "Referral",
      badgeColor: "#10b981",
      icon: "people",
      iconBg: "#d1fae5",
      claimed: false,
      claimable: false,
    },
    {
      id: "5",
      title: "Loyalty Reward",
      description: "Play 10 games and get G50 bonus",
      amount: 50,
      badge: "Loyalty",
      badgeColor: "#ef4444",
      icon: "star",
      iconBg: "#fee2e2",
      claimed: false,
      claimable: false,
    },
  ];

  const handleRewardPress = (reward: Reward) => {
    if (reward.claimed) {
      Alert.alert("Already Claimed", "You have already claimed this reward.");
      return;
    }

    if (!reward.claimable) {
      Alert.alert("Not Available", "Complete the requirements to unlock this reward.");
      return;
    }

    setSelectedReward(reward);

    // Handle different reward types
    if (reward.id === "1" || reward.id === "3") {
      // Deposit bonuses - show payment modal
      setShowPaymentModal(true);
    } else if (reward.id === "2") {
      // Daily Spin - navigate to spin wheel (or show alert for now)
      Alert.alert(
        "Daily Spin 🎡",
        "Spin the wheel to win up to G500!\n\nThis feature is coming soon.",
        [{ text: "OK" }]
      );
    } else if (reward.id === "4") {
      // Referral - show referral code
      Alert.alert(
        "Refer a Friend 👥",
        `Your referral code: ${user?.id?.toUpperCase().slice(0, 6) || "REFER123"}\n\nShare this code with friends. When they sign up and play, you both get G100!`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Share Code", onPress: () => {
            // Share functionality would go here
            Alert.alert("Coming Soon", "Share functionality will be available soon!");
          }}
        ]
      );
    } else if (reward.id === "5") {
      // Loyalty - show progress
      Alert.alert(
        "Loyalty Reward ⭐",
        "Play 10 games to unlock G50 bonus.\n\nYour progress: 0/10 games",
        [{ text: "OK" }]
      );
    }
  };

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={64} color="#f59e0b" />
          </View>
          <Text style={styles.heroTitle}>Your Rewards</Text>
          <Text style={styles.heroSubtitle}>
            Claim your bonuses and earn more as you play!
          </Text>
        </View>

        {/* Rewards List */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>

          {rewards.map((reward) => (
            <Pressable
              key={reward.id}
              style={styles.rewardCard}
              onPress={() => handleRewardPress(reward)}
            >
              <View style={styles.rewardContent}>
                {/* Icon */}
                <View style={[styles.rewardIcon, { backgroundColor: reward.iconBg }]}>
                  <Ionicons name={reward.icon} size={32} color={reward.badgeColor} />
                </View>

                {/* Info */}
                <View style={styles.rewardInfo}>
                  <View style={styles.rewardHeader}>
                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                    <View style={[styles.badge, { backgroundColor: reward.badgeColor }]}>
                      <Text style={styles.badgeText}>{reward.badge}</Text>
                    </View>
                  </View>

                  <Text style={styles.rewardDescription}>{reward.description}</Text>

                  {/* Amount Display */}
                  <View style={styles.rewardAmountContainer}>
                    {reward.id === "1" || reward.id === "3" ? (
                      <Text style={styles.rewardAmount}>{reward.amount}% Bonus</Text>
                    ) : (
                      <Text style={styles.rewardAmount}>G{reward.amount}</Text>
                    )}
                    {reward.minDeposit && (
                      <Text style={styles.minDeposit}>
                        Min. deposit: G{reward.minDeposit}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
              </View>

              {/* Claimed/Locked Status */}
              {reward.claimed && (
                <View style={styles.claimedBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.claimedText}>Claimed</Text>
                </View>
              )}
              {!reward.claimable && !reward.claimed && (
                <View style={[styles.claimedBanner, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="lock-closed" size={16} color="#f59e0b" />
                  <Text style={[styles.claimedText, { color: "#f59e0b" }]}>Locked</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <Text style={styles.infoText}>
              Complete challenges and make deposits to unlock more rewards!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedReward(null);
        }}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          if (selectedReward) {
            Alert.alert(
              "Bonus Activated! 🎉",
              `You will receive ${selectedReward.amount}% bonus on your deposit!`,
              [{ text: "Great!" }]
            );
          }
          setSelectedReward(null);
        }}
      />
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
  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
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
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  rewardDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  rewardAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f59e0b",
  },
  minDeposit: {
    fontSize: 12,
    color: "#9ca3af",
  },
  claimedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    gap: 4,
  },
  claimedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
});
