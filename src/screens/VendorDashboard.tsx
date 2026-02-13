import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { vendorAPI, authAPI, getErrorMessage } from "../api/apiClient";

export default function VendorDashboard() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const gamePlays = useAppStore(s => s.gamePlays);
  const vendors = useAppStore(s => s.vendors);
  const logout = useAppStore(s => s.logout);
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  const setCurrency = useAppStore(s => s.setCurrency);
  
  const t = (key: string) => getTranslation(key as any, language);
  
  // Currency formatting function
  const formatCurrency = (amount: number) => {
    const symbol = currency === "HTG" ? "G" : "$";
    const rate = currency === "HTG" ? 150 : 1;
    const convertedAmount = amount * rate;
    return `${symbol}${convertedAmount.toFixed(2)}`;
  };
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [vendorStats, setVendorStats] = useState<any>(null);
  
  // Fetch vendor profile and stats from API
  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const [profile, stats] = await Promise.all([
          vendorAPI.getMyVendorProfile(),
          vendorAPI.getMyVendorStats(),
        ]);
        if (profile) {
          // Update local store with real vendor data
          useAppStore.getState().updateVendor(profile.id, profile);
        }
        if (stats) setVendorStats(stats);
      } catch (e) {
        console.warn('VendorDashboard fetch error:', getErrorMessage(e));
      }
    };
    fetchVendorData();
  }, []);
  
  // Find current vendor data — match by userId, not email
  const currentVendor = vendors.find(v => (v as any).userId === user?.id);
  
  // Calculate vendor stats
  const vendorGamePlays = gamePlays.filter(game => game.vendorId === currentVendor?.id);
  const today = new Date().toDateString();
  const todayGamePlays = vendorGamePlays.filter(game => 
    new Date(game.timestamp).toDateString() === today
  );
  
  const stats = {
    activePlayers: currentVendor?.totalPlayers || 0,
    earningsToday: todayGamePlays.reduce((sum, game) => sum + game.betAmount, 0) * 0.1, // 10% commission
    earningsWeek: vendorGamePlays.reduce((sum, game) => sum + game.betAmount, 0) * 0.1,
    earningsTotal: currentVendor?.totalRevenue || 0,
    ticketsToday: todayGamePlays.length,
    totalTickets: currentVendor?.totalTicketsSold || 0,
    availableBalance: currentVendor?.availableBalance || 0,
    enabledGames: currentVendor ? Object.values(currentVendor.draws).filter(draw => draw.enabled).length : 0,
  };

  const quickActions = [
    { id: "draws", title: t("pricesAndStates"), icon: "pricetag", color: "#3b82f6", screen: "DrawManagement", subtitle: t("configurePriceLimits") },
    { id: "limits", title: "Number Limits", icon: "ban", color: "#ef4444", screen: "NumberLimits", subtitle: "Control bets" },
    { id: "history", title: t("history"), icon: "analytics", color: "#f59e0b", screen: "VendorPlayHistory", subtitle: t("reportsAndSales") },
    { id: "payout", title: t("withdrawal"), icon: "wallet", color: "#10b981", screen: "PayoutManagement", subtitle: "MonCash, PayPal" },
    { id: "profile", title: t("myProfile"), icon: "person", color: "#8b5cf6", screen: "VendorProfile", subtitle: t("infoAndReviews") },
    { id: "winners", title: "Today's Players", icon: "trophy", color: "#f59e0b", screen: "TodayPlayersWinners", subtitle: "& Winners Report" },
  ];

  const handleQuickAction = (screen: string) => {
    console.log("Navigating to:", screen);
    navigation.navigate(screen as never);
  };

  const handleLogout = () => {
    Alert.alert(
      t("logout"),
      t("areYouSureLogout"),
      [
        {
          text: t("cancel"),
          style: "cancel"
        },
        {
          text: t("logout"),
          style: "destructive",
          onPress: async () => {
            await authAPI.logout();
            logout();
          }
        }
      ]
    );
  };

  const handleStatCardPress = (cardType: string) => {
    setActiveModal(cardType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const getUniquePlayerIds = () => {
    const playerIds = new Set<string>();
    vendorGamePlays.forEach(game => playerIds.add(game.playerId));
    return Array.from(playerIds);
  };

  const getWeeklyEarningsDetails = () => {
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayGames = vendorGamePlays.filter(game => 
        new Date(game.timestamp).toDateString() === date.toDateString()
      );
      const earnings = dayGames.reduce((sum, game) => sum + game.betAmount, 0) * 0.1;
      weeklyData.push({
        date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        earnings,
        tickets: dayGames.length
      });
    }
    return weeklyData;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bonjour, {currentVendor?.firstName || "Vendeur"}</Text>
          <Text style={styles.statusText}>
            Statut: <Text style={[styles.statusBadge, currentVendor?.status === "approved" ? styles.approved : styles.pending]}>
              {currentVendor?.status === "approved" ? "Approuvé" : "En attente"}
            </Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Currency Toggle */}
          <View style={styles.currencyContainer}>
            <Pressable 
              style={[styles.currencyOption, currency === "USD" && styles.currencyActive]}
              onPress={() => setCurrency("USD")}
            >
              <Text style={[styles.currencyOptionText, currency === "USD" && styles.currencyActiveText]}>USD</Text>
            </Pressable>
            <Pressable 
              style={[styles.currencyOption, currency === "HTG" && styles.currencyActive]}
              onPress={() => setCurrency("HTG")}
            >
              <Text style={[styles.currencyOptionText, currency === "HTG" && styles.currencyActiveText]}>HTG</Text>
            </Pressable>
          </View>
          
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <Pressable
          style={styles.profileCard}
          onPress={() => handleQuickAction("VendorProfile")}
        >
          <View style={styles.profileContent}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color="#ffffff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {currentVendor?.firstName} {currentVendor?.lastName}
              </Text>
              <Text style={styles.profileEmail}>{currentVendor?.email}</Text>
              <Text style={styles.profilePhone}>{currentVendor?.phone}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </Pressable>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t("dashboard")}</Text>
          
          <View style={styles.statsGrid}>
            <Pressable style={styles.statCard} onPress={() => handleStatCardPress('players')}>
              <View style={styles.statHeader}>
                <Ionicons name="people" size={20} color="#3b82f6" />
                <Text style={styles.statLabel}>{t("activePlayers")}</Text>
              </View>
              <Text style={styles.statValue}>{stats.activePlayers}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.statChevron} />
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => handleStatCardPress('todayEarnings')}>
              <View style={styles.statHeader}>
                <Ionicons name="cash" size={20} color="#10b981" />
                <Text style={styles.statLabel}>{t("ticketsToday")}</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.earningsToday)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.statChevron} />
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => handleStatCardPress('weeklyEarnings')}>
              <View style={styles.statHeader}>
                <Ionicons name="calendar" size={20} color="#f59e0b" />
                <Text style={styles.statLabel}>{t("thisWeek")}</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.earningsWeek)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.statChevron} />
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => handleStatCardPress('totalEarnings')}>
              <View style={styles.statHeader}>
                <Ionicons name="trending-up" size={20} color="#8b5cf6" />
                <Text style={styles.statLabel}>{t("totalEarnings")}</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.earningsTotal)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.statChevron} />
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => handleStatCardPress('todayTickets')}>
              <View style={styles.statHeader}>
                <Ionicons name="ticket" size={20} color="#ef4444" />
                <Text style={styles.statLabel}>{t("ticketsToday")}</Text>
              </View>
              <Text style={styles.statValue}>{stats.ticketsToday}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.statChevron} />
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => handleStatCardPress('activeGames')}>
              <View style={styles.statHeader}>
                <Ionicons name="game-controller" size={20} color="#06b6d4" />
                <Text style={styles.statLabel}>{t("enabledGames")}</Text>
              </View>
              <Text style={styles.statValue}>{stats.enabledGames}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.statChevron} />
            </Pressable>
          </View>
        </View>

        {/* Available Balance */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>{t("availableBalance")}</Text>
              <Text style={styles.balanceValue}>{formatCurrency(stats.availableBalance)}</Text>
            </View>
            <Pressable 
              style={styles.withdrawButton}
              onPress={() => handleQuickAction("PayoutManagement")}
            >
              <Ionicons name="arrow-down" size={16} color="#ffffff" />
              <Text style={styles.withdrawButtonText}>{t("withdrawal")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Price Configuration Banner */}
        <View style={styles.priceConfigBanner}>
          <View style={styles.priceConfigContent}>
            <View style={styles.priceConfigIcon}>
              <Ionicons name="pricetag" size={24} color="#ffffff" />
            </View>
            <View style={styles.priceConfigText}>
              <Text style={styles.priceConfigTitle}>{t("priceConfiguration")}</Text>
              <Text style={styles.priceConfigSubtitle}>{t("setYourBetLimits")}</Text>
            </View>
          </View>
          <Pressable 
            style={styles.priceConfigButton}
            onPress={() => handleQuickAction("DrawManagement")}
          >
            <Text style={styles.priceConfigButtonText}>{t("configure")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>{t("quickActions")}</Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <Pressable 
                key={action.id} 
                style={styles.actionCard}
                onPress={() => handleQuickAction(action.screen)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#ffffff" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{(action as any).subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Latest Announcements */}
        <View style={styles.announcementsContainer}>
          <Text style={styles.sectionTitle}>Dernières Annonces</Text>
          
          <View style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <Ionicons name="megaphone" size={16} color="#3b82f6" />
              <Text style={styles.announcementTitle}>NY Lottery Results Published</Text>
            </View>
            <Text style={styles.announcementText}>
              New York lottery results for September 26 are now available.
            </Text>
            <Text style={styles.announcementTime}>Il y a 2 heures</Text>
          </View>

          <View style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <Ionicons name="information-circle" size={16} color="#10b981" />
              <Text style={styles.announcementTitle}>New Feature Available</Text>
            </View>
            <Text style={styles.announcementText}>
              Vous pouvez maintenant configurer des limites personnalisées pour chaque type de jeu.
            </Text>
            <Text style={styles.announcementTime}>Hier</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Activité Récente</Text>
          
          {todayGamePlays.slice(0, 5).map((game) => (
            <View key={game.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="ticket" size={16} color="#6b7280" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  New Ticket {game.gameType.toUpperCase()} - {game.draw}
                </Text>
                <Text style={styles.activitySubtitle}>
                  {formatCurrency(game.betAmount)} • {game.numbers.join(", ")}
                </Text>
              </View>
              <Text style={styles.activityTime}>
                {new Date(game.timestamp).toLocaleTimeString("fr-FR", { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </Text>
            </View>
          ))}

          {todayGamePlays.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No activity today</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Interactive Modals */}
      {/* Active Players Modal */}
      <Modal visible={activeModal === 'players'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("activePlayers")} ({stats.activePlayers})</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {getUniquePlayerIds().map((playerId: string, index: number) => {
                const playerGames = vendorGamePlays.filter(game => game.playerId === playerId);
                const totalSpent = playerGames.reduce((sum, game) => sum + game.betAmount, 0);
                return (
                  <View key={playerId} style={styles.playerItem}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerInitial}>{index + 1}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>Joueur #{playerId.slice(-4)}</Text>
                      <Text style={styles.playerStats}>{playerGames.length} billets • {formatCurrency(totalSpent)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Weekly Earnings Modal */}
      <Modal visible={activeModal === 'weeklyEarnings'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("earningsThisWeek")}</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {getWeeklyEarningsDetails().map((day, index) => (
                <View key={index} style={styles.dayEarningsItem}>
                  <Text style={styles.dayLabel}>{day.date}</Text>
                  <View style={styles.dayStats}>
                    <Text style={styles.dayEarnings}>{formatCurrency(day.earnings)}</Text>
                    <Text style={styles.dayTickets}>{day.tickets} billets</Text>
                  </View>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Semaine:</Text>
                <Text style={styles.totalValue}>{formatCurrency(stats.earningsWeek)}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Today's Earnings Modal */}
      <Modal visible={activeModal === 'todayEarnings'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("earningsToday")}</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.earningsBreakdown}>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Total des mises:</Text>
                  <Text style={styles.earningsValue}>{formatCurrency(stats.earningsToday / 0.1)}</Text>
                </View>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Commission (10%):</Text>
                  <Text style={styles.earningsValue}>{formatCurrency(stats.earningsToday)}</Text>
                </View>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Nombre de billets:</Text>
                  <Text style={styles.earningsValue}>{stats.ticketsToday}</Text>
                </View>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Mise moyenne:</Text>
                  <Text style={styles.earningsValue}>
                    {formatCurrency(stats.ticketsToday > 0 ? ((stats.earningsToday / 0.1) / stats.ticketsToday) : 0)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Today's Tickets Modal */}
      <Modal visible={activeModal === 'todayTickets'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("ticketsToday")} ({stats.ticketsToday})</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {todayGamePlays.map((game) => (
                <View key={game.id} style={styles.ticketItem}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketGame}>{game.gameType.toUpperCase()} • {game.draw}</Text>
                    <Text style={styles.ticketAmount}>{formatCurrency(game.betAmount)}</Text>
                  </View>
                  <Text style={styles.ticketNumbers}>
                    Numéros: {game.numbers.join(', ')}
                  </Text>
                  <Text style={styles.ticketTime}>
                    {new Date(game.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Active Games Modal */}
      <Modal visible={activeModal === 'activeGames'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("enabledGames")} ({stats.enabledGames})</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {currentVendor && Object.entries(currentVendor.draws).map(([state, drawSettings]: [string, any]) => {
                if (!drawSettings.enabled) return null;
                const enabledGamesInState = Object.entries(drawSettings.games).filter(([, gameSettings]: [string, any]) => gameSettings.enabled);
                return (
                  <View key={state} style={styles.stateGamesItem}>
                    <Text style={styles.stateName}>{state}</Text>
                    <View style={styles.stateGames}>
                      {enabledGamesInState.map(([gameType, gameSettings]: [string, any]) => (
                        <View key={gameType} style={styles.gameTag}>
                          <Text style={styles.gameTagText}>
                            {gameType.toUpperCase()}: {formatCurrency(gameSettings.minAmount)}-{formatCurrency(gameSettings.maxAmount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
              <Pressable 
                style={styles.configureGamesButton}
                onPress={() => {
                  closeModal();
                  handleQuickAction('DrawManagement');
                }}
              >
                <Text style={styles.configureGamesButtonText}>Configurer les Jeux</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Total Earnings Modal */}
      <Modal visible={activeModal === 'totalEarnings'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("totalEarnings")}</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.totalEarningsBreakdown}>
                <View style={styles.totalEarningsRow}>
                  <Text style={styles.totalEarningsLabel}>Revenus totaux:</Text>
                  <Text style={styles.totalEarningsValue}>{formatCurrency(stats.earningsTotal)}</Text>
                </View>
                <View style={styles.totalEarningsRow}>
                  <Text style={styles.totalEarningsLabel}>Billets vendus:</Text>
                  <Text style={styles.totalEarningsValue}>{stats.totalTickets}</Text>
                </View>
                <View style={styles.totalEarningsRow}>
                  <Text style={styles.totalEarningsLabel}>Available Balance:</Text>
                  <Text style={styles.totalEarningsValue}>{formatCurrency(stats.availableBalance)}</Text>
                </View>
                <Pressable 
                  style={styles.viewHistoryButton}
                  onPress={() => {
                    closeModal();
                    handleQuickAction('VendorPlayHistory');
                  }}
                >
                  <Text style={styles.viewHistoryButtonText}>View Full History</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  profileCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileAvatar: {
    backgroundColor: "#8b5cf6",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: "#6b7280",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  statusText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  statusBadge: {
    fontWeight: "500",
  },
  approved: {
    color: "#10b981",
  },
  pending: {
    color: "#f59e0b",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  currencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currencyActive: {
    backgroundColor: '#3b82f6',
  },
  currencyOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  currencyActiveText: {
    color: 'white',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fef2f2",
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    width: "48%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 6,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  statChevron: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  balanceCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 4,
  },
  withdrawButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  withdrawButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  priceConfigBanner: {
    backgroundColor: "#fef3c7",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  priceConfigContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priceConfigIcon: {
    backgroundColor: "#f97316",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  priceConfigText: {
    flex: 1,
  },
  priceConfigTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 2,
  },
  priceConfigSubtitle: {
    fontSize: 14,
    color: "#92400e",
  },
  priceConfigButton: {
    backgroundColor: "#f97316",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f97316",
  },
  priceConfigButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    width: "31%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  actionSubtitle: {
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 2,
  },
  announcementsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  announcementCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8,
  },
  announcementText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 8,
  },
  announcementTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  activityContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  activitySubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: "80%",
    width: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalScroll: {
    maxHeight: 400,
  },
  // Player Modal Styles
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  playerAvatar: {
    backgroundColor: "#3b82f6",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  playerInitial: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 2,
  },
  playerStats: {
    fontSize: 14,
    color: "#6b7280",
  },
  // Weekly Earnings Modal Styles
  dayEarningsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  dayStats: {
    alignItems: "flex-end",
  },
  dayEarnings: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  dayTickets: {
    fontSize: 12,
    color: "#6b7280",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10b981",
  },
  // Today's Earnings Modal Styles
  earningsBreakdown: {
    paddingVertical: 8,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  earningsLabel: {
    fontSize: 16,
    color: "#6b7280",
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  // Tickets Modal Styles
  ticketItem: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ticketGame: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  ticketAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
  },
  ticketNumbers: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  ticketTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  // Active Games Modal Styles
  stateGamesItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  stateName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  stateGames: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  gameTag: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  gameTagText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
  },
  configureGamesButton: {
    backgroundColor: "#f97316",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  configureGamesButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Total Earnings Modal Styles
  totalEarningsBreakdown: {
    paddingVertical: 8,
  },
  totalEarningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  totalEarningsLabel: {
    fontSize: 16,
    color: "#6b7280",
  },
  totalEarningsValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  viewHistoryButton: {
    backgroundColor: "#f97316",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  viewHistoryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

});