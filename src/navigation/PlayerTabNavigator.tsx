import React, { useState, useEffect, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, Platform, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
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

const HelpScreen = () => {
  const language = useAppStore(s => s.language);
  const t = (key: string) => getTranslation(key as any, language);
  return (
  <SafeAreaView className="flex-1 bg-gray-50">
    <View className="bg-white px-6 py-4 border-b border-gray-200">
      <Text className="text-2xl font-bold text-gray-800">{t("helpCenter")}</Text>
      <Text className="text-gray-600">{t("howCanWeHelp")}</Text>
    </View>
    
    <View className="p-6">
      {/* Contact Us Section */}
      <Text className="text-xl font-bold text-gray-800 mb-4">{t("contactUs")}</Text>
      
      <View className="flex-row justify-between mb-6">
        <View className="bg-white rounded-2xl p-4 flex-1 mr-2 border border-gray-200 items-center">
          <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-2">
            <Ionicons name="logo-whatsapp" size={28} color="#10b981" />
          </View>
          <Text className="text-gray-800 font-semibold">WhatsApp</Text>
          <Text className="text-gray-400 text-xs">Chat with us</Text>
        </View>
        
        <View className="bg-white rounded-2xl p-4 flex-1 mx-1 border border-gray-200 items-center">
          <View className="w-14 h-14 bg-blue-100 rounded-full items-center justify-center mb-2">
            <Ionicons name="mail" size={28} color="#3b82f6" />
          </View>
          <Text className="text-gray-800 font-semibold">Email</Text>
          <Text className="text-gray-400 text-xs text-center">support@groloto.com</Text>
        </View>
        
        <View className="bg-white rounded-2xl p-4 flex-1 ml-2 border border-gray-200 items-center">
          <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-2">
            <Ionicons name="call" size={28} color="#10b981" />
          </View>
          <Text className="text-gray-800 font-semibold">Phone</Text>
          <Text className="text-gray-400 text-xs">+509 XXXX-XXXX</Text>
        </View>
      </View>
      
      {/* FAQ Section */}
      <Text className="text-xl font-bold text-gray-800 mb-4">{t("faq")}</Text>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">How do I place a bet?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">What payment methods are accepted?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">How do I withdraw my winnings?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 mb-3 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">What are the different game types?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
      
      <View className="bg-white rounded-2xl border border-gray-200 p-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-800 font-semibold flex-1">When are results published?</Text>
          <Ionicons name="chevron-down" size={20} color="#9ca3af" />
        </View>
      </View>
    </View>
  </SafeAreaView>
  );
};

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