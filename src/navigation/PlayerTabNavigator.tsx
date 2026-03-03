import React, { useState, useEffect, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, Platform, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PlayerDashboard from "../screens/PlayerDashboard";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { notificationsAPI } from "../api/apiClient";

const Tab = createBottomTabNavigator();

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

const notifIconMap: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  bet_placed: { icon: "ticket", color: "#3b82f6" },
  win: { icon: "trophy", color: "#f59e0b" },
  deposit: { icon: "wallet", color: "#10b981" },
  withdrawal: { icon: "cash", color: "#8b5cf6" },
  reward: { icon: "gift", color: "#ef4444" },
  system: { icon: "megaphone", color: "#6b7280" },
};

const NotificationsScreen = () => {
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifData, countData] = await Promise.all([
        notificationsAPI.getNotifications(50, 0),
        notificationsAPI.getUnreadCount(),
      ]);
      setNotifications(notifData.notifications || []);
      setUnreadCount(countData.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const visual = notifIconMap[item.type] || notifIconMap.system;
    return (
      <Pressable
        onPress={() => !item.isRead && handleMarkRead(item.id)}
        style={[
          styles.notifCard,
          !item.isRead && styles.notifCardUnread,
        ]}
      >
        <View style={[styles.notifIcon, { backgroundColor: visual.color + "20" }]}>
          <Ionicons name={visual.icon} size={22} color={visual.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>{item.title}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifTime}>{getTimeSince(item.createdAt)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.notifContainer}>
      <View style={styles.notifHeaderBar}>
        <Text style={styles.notifScreenTitle}>{t("notifications")}</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.notifLoading}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              colors={["#f59e0b"]}
            />
          }
          contentContainerStyle={notifications.length === 0 ? styles.notifEmpty : { paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.notifEmptyContent}>
              <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
              <Text style={styles.notifEmptyTitle}>No Notifications</Text>
              <Text style={styles.notifEmptySubtitle}>
                You're all caught up! Notifications will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: FAQItem[];
}

const HelpScreen = () => {
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sections: FAQSection[] = [
    {
      title: "🎮 How to Play",
      icon: "game-controller",
      color: "#3b82f6",
      items: [
        { question: "How do I play GroLotto?", answer: "Go to the Play tab and choose a game type: Borlèt (pick 2 digits 00-99), Maryaj (pick 2 pairs of numbers), or Lotto 3/Lotto 4/Lotto 5 (pick 3, 4, or 5 numbers). Select your numbers, choose a draw time, enter your bet amount, and tap Play!" },
        { question: "What are the different game types?", answer: "Borlèt: Pick a 2-digit number (00-99). Maryaj: Pick 2 pairs of numbers. Lotto 3: Pick 3 numbers. Lotto 4: Pick 4 numbers. Lotto 5: Pick 5 numbers. Tchala: Dream-number interpretations — search a dream symbol and play its associated number." },
        { question: "What are the draw times?", answer: "There are three daily draws: Morning (Maten) at 10:00 AM, Afternoon (Aprèmidi) at 2:00 PM, and Evening (Aswè) at 8:00 PM. All times are Eastern Time (Haiti)." },
        { question: "How do I know if I won?", answer: "After each draw, check the Results tab to see winning numbers. You'll also receive a notification if you win. Winnings are automatically credited to your wallet." },
        { question: "What is the minimum and maximum bet?", answer: "The minimum bet is 10 HTG (or $1 USD). Maximum bet varies by game type and is displayed on the play screen." },
      ],
    },
    {
      title: "💳 Payments & Wallet",
      icon: "card",
      color: "#10b981",
      items: [
        { question: "How do I add money to my wallet?", answer: "Go to Payment, select a deposit amount (or enter a custom amount), choose your payment method (MonCash or PayPal), and complete the payment. Funds will appear in your wallet within minutes." },
        { question: "What payment methods are available?", answer: "We currently support MonCash (Digicel mobile money) and PayPal. You can also fund your wallet with a Gift Card code." },
        { question: "How do I withdraw my winnings?", answer: "Go to Payment, switch to the Withdraw tab, enter the amount you'd like to withdraw, and choose your withdrawal method. Processing typically takes 24-48 hours." },
        { question: "Can I switch between HTG and USD?", answer: "Yes! Go to Settings and change your preferred currency. Your wallet shows balances in both HTG and USD." },
      ],
    },
    {
      title: "🎁 Gift Cards",
      icon: "gift",
      color: "#f59e0b",
      items: [
        { question: "How do gift cards work?", answer: "You can buy a gift card from your wallet balance and get a unique 12-character code (XXXX-XXXX-XXXX). Share this code with a friend, and they can redeem it to add funds to their wallet." },
        { question: "What gift card amounts are available?", answer: "In HTG: 500, 1,000, 2,000, 5,000, and 10,000. In USD: $5, $10, $25, $50, and $100." },
        { question: "Do gift cards expire?", answer: "Yes, gift cards are valid for 1 year from the date of purchase." },
        { question: "How do I redeem a gift card?", answer: "Go to Gift Cards → Redeem tab. Enter the 12-character code and tap Redeem. The amount will be instantly added to your wallet." },
      ],
    },
    {
      title: "🛡️ Account & Security",
      icon: "shield-checkmark",
      color: "#8b5cf6",
      items: [
        { question: "How do I change my password?", answer: "Go to Settings → Security. You can update your password there. You'll need to enter your current password first." },
        { question: "Is my data secure?", answer: "Yes. We use industry-standard encryption for all data in transit and at rest. Your password is hashed and never stored in plain text." },
        { question: "What if I forget my password?", answer: "On the login screen, tap 'Forgot Password' and enter your registered phone number or email. You'll receive a reset link to create a new password." },
      ],
    },
    {
      title: "🏆 Rewards & Bonuses",
      icon: "trophy",
      color: "#eab308",
      items: [
        { question: "How do rewards work?", answer: "You earn reward points every time you play. These points accumulate and can unlock special bonuses. Check the Rewards section to see your current points." },
        { question: "What is the referral bonus?", answer: "Invite friends to GroLotto using your referral code. When they sign up and make their first deposit, both you and your friend receive a bonus credited to your wallets." },
      ],
    },
  ];

  return (
    <SafeAreaView style={helpStyles.container}>
      {/* Header */}
      <View style={helpStyles.headerBar}>
        <Text style={helpStyles.screenTitle}>{t("helpCenter")}</Text>
        <Text style={helpStyles.screenSubtitle}>{t("howCanWeHelp")}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={helpStyles.hero}>
          <Ionicons name="help-circle" size={48} color="#f59e0b" />
          <Text style={helpStyles.heroTitle}>{t("howCanWeHelp") || "How can we help you?"}</Text>
          <Text style={helpStyles.heroSub}>Find answers to common questions below</Text>
        </View>

        {/* FAQ Sections */}
        {sections.map((section, si) => (
          <View key={si} style={helpStyles.sectionCard}>
            <Text style={helpStyles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, qi) => {
              const key = `${si}-${qi}`;
              const isOpen = openItems.has(key);
              return (
                <Pressable key={key} onPress={() => toggleItem(key)} style={helpStyles.faqItem}>
                  <View style={helpStyles.faqQuestion}>
                    <Text style={helpStyles.faqQuestionText}>{item.question}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isOpen ? "#f59e0b" : "#64748b"}
                    />
                  </View>
                  {isOpen && (
                    <Text style={helpStyles.faqAnswer}>{item.answer}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Contact Section */}
        <View style={helpStyles.sectionCard}>
          <Text style={helpStyles.sectionTitle}>📞 {t("contactUs")}</Text>
          <Text style={helpStyles.contactSub}>Still need help? Reach out to our support team:</Text>
          <View style={helpStyles.contactRow}>
            <View style={helpStyles.contactCard}>
              <View style={[helpStyles.contactIconWrap, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                <Ionicons name="logo-whatsapp" size={26} color="#10b981" />
              </View>
              <Text style={helpStyles.contactLabel}>WhatsApp</Text>
              <Text style={helpStyles.contactMeta}>Chat with us</Text>
            </View>
            <View style={helpStyles.contactCard}>
              <View style={[helpStyles.contactIconWrap, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                <Ionicons name="mail" size={26} color="#3b82f6" />
              </View>
              <Text style={helpStyles.contactLabel}>Email</Text>
              <Text style={helpStyles.contactMeta}>support@grolotto.com</Text>
            </View>
            <View style={helpStyles.contactCard}>
              <View style={[helpStyles.contactIconWrap, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                <Ionicons name="call" size={26} color="#10b981" />
              </View>
              <Text style={helpStyles.contactLabel}>Phone</Text>
              <Text style={helpStyles.contactMeta}>+509 37 00 0000</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const helpStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  headerBar: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: "#1e293b", borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  screenTitle: { fontSize: 22, fontWeight: "700", color: "#f1f5f9" },
  screenSubtitle: { fontSize: 14, color: "#94a3b8", marginTop: 2 },
  hero: {
    alignItems: "center", paddingVertical: 24, marginBottom: 8,
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  heroTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", marginTop: 10 },
  heroSub: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  sectionCard: {
    backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: "#334155",
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff", marginBottom: 10 },
  faqItem: {
    borderWidth: 1, borderColor: "#334155", borderRadius: 12,
    overflow: "hidden", marginBottom: 8,
  },
  faqQuestion: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14,
  },
  faqQuestionText: { fontSize: 14, fontWeight: "600", color: "#f1f5f9", flex: 1, marginRight: 8 },
  faqAnswer: {
    fontSize: 13, color: "#94a3b8", lineHeight: 20,
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: "rgba(51,65,85,0.5)", paddingTop: 10,
  },
  contactSub: { fontSize: 13, color: "#94a3b8", marginBottom: 12 },
  contactRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  contactCard: {
    flex: 1, backgroundColor: "#0f172a", borderRadius: 14, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#334155",
  },
  contactIconWrap: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  contactLabel: { fontSize: 13, fontWeight: "600", color: "#f1f5f9" },
  contactMeta: { fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 2 },
});

export default function PlayerTabNavigator() {
  const insets = useSafeAreaInsets();
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 2,
          borderTopColor: "#e5e7eb",
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 58 + Math.max(insets.bottom, 8),
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "HomeTab") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "NotificationsTab") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "MyBetTab") {
            iconName = focused ? "ticket" : "ticket-outline";
          } else if (route.name === "HelpTab") {
            iconName = focused ? "help-circle" : "help-circle-outline";
          } else if (route.name === "SettingsTab") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={PlayerDashboard}
        options={{
          tabBarLabel: t("dashboard"),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t("notifications"),
        }}
      />
      <Tab.Screen
        name="MyBetTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: t("history"),
        }}
      />
      <Tab.Screen
        name="HelpTab"
        component={HelpScreen}
        options={{
          tabBarLabel: t("helpCenter"),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t("settings"),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  notifContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  notifHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  notifScreenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3b82f6",
  },
  notifLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  notifCardUnread: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
    marginLeft: 8,
  },
  notifMessage: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 6,
  },
  notifEmpty: {
    flex: 1,
  },
  notifEmptyContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  notifEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
  },
  notifEmptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
});