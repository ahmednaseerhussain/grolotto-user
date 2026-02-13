import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

interface Reward {
  id: string;
  title: string;
  description: string;
  amount: string;
  badge: string;
  badgeColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
}

export default function RewardsScreen() {
  const navigation = useNavigation();
  const language = useAppStore(s => s.language);

  const t = (key: string) => getTranslation(key as any, language);

  // Rewards are defined as app features — backend integration pending
  const rewards: Reward[] = [
    {
      id: "1",
      title: "Welcome Bonus",
      description: "Get 20% extra on your first deposit",
      amount: "20% Bonus",
      badge: "New User",
      badgeColor: "#f59e0b",
      icon: "gift",
      iconBg: "#fef3c7",
    },
    {
      id: "2",
      title: "Daily Spin",
      description: "Spin the wheel for a chance to win up to G500",
      amount: "G500",
      badge: "Daily",
      badgeColor: "#8b5cf6",
      icon: "refresh-circle",
      iconBg: "#ede9fe",
    },
    {
      id: "3",
      title: "First Deposit Bonus",
      description: "100% match on deposits over G500",
      amount: "100% Bonus",
      badge: "Deposit",
      badgeColor: "#3b82f6",
      icon: "wallet",
      iconBg: "#dbeafe",
    },
    {
      id: "4",
      title: "Refer a Friend",
      description: "Get G100 for each friend who joins and plays",
      amount: "G100",
      badge: "Referral",
      badgeColor: "#10b981",
      icon: "people",
      iconBg: "#d1fae5",
    },
    {
      id: "5",
      title: "Loyalty Reward",
      description: "Play 10 games and get G50 bonus",
      amount: "G50",
      badge: "Loyalty",
      badgeColor: "#ef4444",
      icon: "star",
      iconBg: "#fee2e2",
    },
  ];

  const handleRewardPress = (reward: Reward) => {
    Alert.alert(
      "Coming Soon",
      `"${reward.title}" will be available in a future update. Stay tuned!`,
      [{ text: "OK" }]
    );
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
                  <Text style={styles.rewardAmount}>{reward.amount}</Text>
                </View>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
              </View>

              <View style={[styles.claimedBanner, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="time-outline" size={16} color="#f59e0b" />
                <Text style={[styles.claimedText, { color: "#f59e0b" }]}>Coming Soon</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <Text style={styles.infoText}>
              Rewards and bonuses are coming soon! Stay tuned for exciting offers.
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
