import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";

export default function AdminDashboard() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);
  const getSystemStats = useAppStore(s => s.getSystemStats);
  const advertisements = useAppStore(s => s.advertisements);

  const stats = getSystemStats();

  const handleFeaturePress = (featureId: string) => {
    switch (featureId) {
      case "players":
        (navigation as any).navigate("PlayerManagement");
        break;
      case "vendors":
        (navigation as any).navigate("AdminPayoutManagement");
        break;
      case "games":
        (navigation as any).navigate("GameSettings");
        break;
      case "results":
        (navigation as any).navigate("ResultPublishing");
        break;
      case "payments":
        (navigation as any).navigate("AdminPayoutManagement");
        break;
      case "reports":
        (navigation as any).navigate("ReportsAnalytics");
        break;
      case "advertisements":
        (navigation as any).navigate("AdvertisementManager");
        break;
      case "users":
        (navigation as any).navigate("AdminUserManagement");
        break;
      case "settings":
        // Global settings screen
        break;
      default:
        // Handle other features
        break;
    }
  };

  const adminFeatures = [
    {
      id: "players",
      title: "Player Management",
      subtitle: "Manage all registered players",
      icon: "people",
      count: "1,247 Active",
      color: "#10b981"
    },
    {
      id: "vendors", 
      title: "Vendor Management",
      subtitle: "Approve and manage vendors",
      icon: "business",
      count: `${stats.activeVendors} Vendors`,
      color: "#3b82f6"
    },
    {
      id: "games",
      title: "Game Management",  
      subtitle: "Configure lottery games",
      icon: "dice",
      count: "8 States",
      color: "#8b5cf6"
    },
    {
      id: "results",
      title: "Results & Publishing",
      subtitle: "Publish daily lottery results", 
      icon: "trophy",
      count: "Daily Updates",
      color: "#f59e0b"
    },
    {
      id: "payments",
      title: "Payment Management",
      subtitle: "Handle payouts and transactions",
      icon: "card", 
      count: "12 Pending",
      color: "#06b6d4"
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      subtitle: "View system analytics",
      icon: "analytics",
      count: "Live Data", 
      color: "#ec4899"
    },
    {
      id: "settings",
      title: "System Settings",
      subtitle: "Configure app settings",
      icon: "settings",
      count: "Global Config",
      color: "#6b7280"
    },
    {
      id: "advertisements",
      title: "Advertisement Manager",
      subtitle: "Manage slideshow ads and promotions",
      icon: "megaphone",
      count: `${advertisements.filter((ad: any) => ad.status === "active").length} Active`,
      color: "#f59e0b"
    },
    {
      id: "users",
      title: "Admin Users", 
      subtitle: "Manage admin accounts",
      icon: "shield-checkmark",
      count: "3 Admins",
      color: "#dc2626"
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.adminName}>{user?.name}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications" size={20} color="#6b7280" />
          </Pressable>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activeVendors}</Text>
            <Text style={styles.statLabel}>Active Vendors</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>${stats.totalRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>  
            <Text style={styles.statNumber}>{stats.todayGames}</Text>
            <Text style={styles.statLabel}>Today's Games</Text>
          </View>
        </View>
      </View>

      {/* Admin Features */}
      <ScrollView style={styles.featuresContainer} contentContainerStyle={styles.featuresContent}>
        <Text style={styles.featuresTitle}>Admin Features</Text>
        
        {adminFeatures.map((feature) => (
          <Pressable 
            key={feature.id} 
            style={styles.featureCard}
            onPress={() => handleFeaturePress(feature.id)}
          >
            <View style={styles.featureLeft}>
              <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                <Ionicons name={feature.icon as any} size={24} color="#ffffff" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              </View>
            </View>
            
            <View style={styles.featureRight}>
              <Text style={styles.featureCount}>{feature.count}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* System Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusIndicator}>
          <View style={styles.statusIcon}>
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.statusTitle}>System Status: Operational</Text>
            <Text style={styles.statusSubtitle}>All services running normally</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1f2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  welcomeText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  adminName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    backgroundColor: '#374151',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {  
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  featuresContainer: {
    flex: 1,
  },
  featuresContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  featureRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureCount: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusContainer: {
    backgroundColor: '#dcfce7',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    backgroundColor: '#16a34a',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold', 
    color: '#166534',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#166534',
  },
});