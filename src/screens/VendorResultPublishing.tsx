import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { vendorAPI, getErrorMessage } from "../api/apiClient";

// ─── Types ───────────────────────────────────────────────
interface Round {
  id: string;
  drawState: string;
  drawDate: string;
  drawTime: string;
  status: string;
  winningNumbers: Record<string, number[]> | null;
  totalBets: number;
  totalPayouts: number;
  totalTickets: number;
  adminCommissionTotal: number;
  winnerCount: number;
  vendorBetTotal: number;
  vendorTicketCount: number;
  vendorPayoutTotal: number;
  openedAt: string;
  publishedAt: string | null;
}

interface Ticket {
  id: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  gameType: string;
  numbers: number[];
  betAmount: number;
  currency: string;
  status: string;
  winAmount: number;
  createdAt: string;
}

interface RoundDetails {
  round: Round & {
    vendorBetTotal: number;
    vendorPayoutTotal: number;
    vendorTicketCount: number;
  };
  tickets: Ticket[];
}

// ─── Constants ───────────────────────────────────────────
const GAME_CONFIG: Record<string, { label: string }> = {
  senp: { label: "Senp (50x)" },
  maryaj: { label: "Maryaj (100x)" },
  loto3: { label: "Lotto 3 (500x)" },
  loto4: { label: "Lotto 4 (5,000x)" },
  loto5: { label: "Lotto 5 (50,000x)" },
};

// ─── Main Component ──────────────────────────────────────
export default function VendorResultPublishing() {
  const navigation = useNavigation();
  const language = useAppStore((s) => s.language);
  const currency = useAppStore((s) => s.currency);
  const t = (key: string) => getTranslation(key as any, language);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "completed">("open");
  const [selectedRound, setSelectedRound] = useState<RoundDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    const symbol = currency === "HTG" ? "G" : "$";
    const rate = currency === "HTG" ? 150 : 1;
    return `${symbol}${(amount * rate).toFixed(2)}`;
  };

  // ─── Fetch Rounds ────────────────────────────────────────
  const fetchRounds = useCallback(async () => {
    try {
      const data = await vendorAPI.getMyRounds();
      setRounds(data || []);
    } catch (e) {
      console.warn("Failed to fetch rounds:", getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRounds();
  };

  // ─── Fetch Round Details ─────────────────────────────────
  const openRoundDetails = async (roundId: string) => {
    try {
      setDetailLoading(true);
      const data = await vendorAPI.getMyRoundDetails(roundId);
      setSelectedRound(data);
    } catch (e) {
      Alert.alert(t("error"), getErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Filter rounds ──────────────────────────────────────
  const filteredRounds = rounds.filter((r) =>
    activeTab === "open" ? r.status === "open" : r.status === "completed"
  );

  // ─── Render Ticket Row ──────────────────────────────────
  const renderTicket = (ticket: Ticket) => (
    <View key={ticket.id} style={styles.ticketRow}>
      <View style={styles.ticketInfo}>
        <Text style={styles.ticketPlayerName}>{ticket.playerName}</Text>
        <Text style={styles.ticketGameType}>
          {ticket.gameType.toUpperCase()} — [{ticket.numbers.join(", ")}]
        </Text>
      </View>
      <View style={styles.ticketRight}>
        <Text style={styles.ticketAmount}>{formatCurrency(ticket.betAmount)}</Text>
        <Text style={[styles.ticketStatus, ticket.status === "won" && styles.ticketStatusWon, ticket.status === "lost" && styles.ticketStatusLost]}>
          {ticket.status.toUpperCase()}
          {ticket.status === "won" && ` (${formatCurrency(ticket.winAmount)})`}
        </Text>
      </View>
    </View>
  );

  // ─── Render Round Card ──────────────────────────────────
  const renderRoundCard = (round: Round) => (
    <Pressable
      key={round.id}
      style={styles.roundCard}
      onPress={() => openRoundDetails(round.id)}
    >
      <View style={styles.roundHeader}>
        <View style={styles.roundStateTag}>
          <Text style={styles.roundStateText}>{round.drawState}</Text>
        </View>
        <Text style={styles.roundDate}>
          {new Date(round.drawDate).toLocaleDateString()}
        </Text>
        <View style={[styles.statusBadge, round.status === "completed" ? styles.statusCompleted : styles.statusOpen]}>
          <Text style={styles.statusText}>
            {round.status === "completed" ? t("published") : t("open")}
          </Text>
        </View>
      </View>

      <View style={styles.roundStatsRow}>
        <View style={styles.roundStat}>
          <Text style={styles.roundStatLabel}>{t("yourTickets")}</Text>
          <Text style={styles.roundStatValue}>{round.vendorTicketCount || 0}</Text>
        </View>
        <View style={styles.roundStat}>
          <Text style={styles.roundStatLabel}>{t("betsReceived")}</Text>
          <Text style={[styles.roundStatValue, { color: "#10b981" }]}>{formatCurrency(round.vendorBetTotal || 0)}</Text>
        </View>
        <View style={styles.roundStat}>
          <Text style={styles.roundStatLabel}>{t("payouts")}</Text>
          <Text style={[styles.roundStatValue, { color: "#ef4444" }]}>{formatCurrency(round.vendorPayoutTotal || 0)}</Text>
        </View>
      </View>

      {round.status === "completed" && round.winningNumbers && (
        <View style={styles.winningRow}>
          <Ionicons name="trophy" size={14} color="#f59e0b" />
          <Text style={styles.winningText}>
            {Object.entries(round.winningNumbers).map(([gt, nums]) => `${gt}: [${(nums as number[]).join(",")}]`).join("  ")}
          </Text>
          {round.winnerCount > 0 && (
            <Text style={styles.winnerCountText}>{round.winnerCount} {t("winners")}</Text>
          )}
        </View>
      )}

      {round.status === "open" && (round.vendorTicketCount || 0) > 0 && (
        <View style={styles.viewHint}>
          <Ionicons name="eye-outline" size={16} color="#3b82f6" />
          <Text style={styles.viewHintText}>{t("tapToViewTickets")}</Text>
        </View>
      )}
    </Pressable>
  );

  // ─── Round Detail View ──────────────────────────────────
  const renderDetailView = () => {
    if (!selectedRound) return null;
    const { round, tickets } = selectedRound;

    // Group tickets by game type
    const ticketsByGame: Record<string, Ticket[]> = {};
    for (const t of tickets) {
      if (!ticketsByGame[t.gameType]) ticketsByGame[t.gameType] = [];
      ticketsByGame[t.gameType].push(t);
    }

    const gameTypesInRound = Object.keys(ticketsByGame);

    // Calculate vendor net profit: bets received - payouts - admin commission
    const vendorBets = round.vendorBetTotal || 0;
    const vendorPayouts = round.vendorPayoutTotal || 0;
    const adminCommission = round.status === "completed"
      ? Math.round(vendorBets * 0.10 * 100) / 100
      : 0;
    const vendorNet = vendorBets - vendorPayouts - adminCommission;

    return (
      <ScrollView style={styles.detailContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Back + Header */}
        <Pressable style={styles.backButton} onPress={() => setSelectedRound(null)}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
          <Text style={styles.backText}>{t("backToRounds")}</Text>
        </Pressable>

        {/* Round Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{round.drawState} — {new Date(round.drawDate).toLocaleDateString()}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t("betsReceived")} (100%)</Text>
              <Text style={[styles.summaryValue, { color: "#10b981" }]}>{formatCurrency(vendorBets)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t("winnerPayouts")}</Text>
              <Text style={[styles.summaryValue, { color: "#ef4444" }]}>{formatCurrency(vendorPayouts)}</Text>
            </View>
            {round.status === "completed" && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t("adminCommission")} (10%)</Text>
                  <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>{formatCurrency(adminCommission)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t("yourNetProfit")}</Text>
                  <Text style={[styles.summaryValue, { color: vendorNet >= 0 ? "#10b981" : "#ef4444", fontWeight: "700" }]}>
                    {vendorNet >= 0 ? "+" : ""}{formatCurrency(vendorNet)}
                  </Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.summarySubtext}>
            {round.vendorTicketCount || tickets.length} ticket(s) from {[...new Set(tickets.map(t => t.playerId))].length} player(s)
          </Text>
        </View>

        {/* Tickets by Game Type */}
        {gameTypesInRound.map((gt) => (
          <View key={gt} style={styles.gameSection}>
            <Text style={styles.gameSectionTitle}>
              {GAME_CONFIG[gt]?.label || gt.toUpperCase()} — {ticketsByGame[gt].length} ticket(s)
            </Text>
            {ticketsByGame[gt].map(renderTicket)}
          </View>
        ))}

        {/* Already Published Info */}
        {round.status === "completed" && (
          <View style={styles.completedSection}>
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
            <Text style={styles.completedTitle}>{t("resultsPublishedByAdmin")}</Text>
            {round.winningNumbers && (
              <View style={styles.completedNumbers}>
                {Object.entries(round.winningNumbers).map(([gt, nums]) => (
                  <Text key={gt} style={styles.completedNumberLine}>
                    {gt.toUpperCase()}: [{(nums as number[]).join(", ")}]
                  </Text>
                ))}
              </View>
            )}
            <View style={styles.completedStats}>
              <Text style={styles.completedStat}>{t("winnersAllVendors")}: {round.winnerCount}</Text>
              <Text style={styles.completedStat}>{t("yourPayouts")}: {formatCurrency(vendorPayouts)}</Text>
            </View>
          </View>
        )}

        {/* Waiting for admin */}
        {round.status === "open" && tickets.length > 0 && (
          <View style={styles.waitingSection}>
            <Ionicons name="time-outline" size={32} color="#f59e0b" />
            <Text style={styles.waitingTitle}>{t("waitingForAdmin")}</Text>
            <Text style={styles.waitingSubtext}>
              {t("waitingForAdminDesc")}
            </Text>
          </View>
        )}

        {/* No tickets */}
        {tickets.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>{t("noTicketsInRound")}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ─── Main Render ─────────────────────────────────────────
  if (detailLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>{t("loadingRoundDetails")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedRound) {
    return (
      <SafeAreaView style={styles.container}>
        {renderDetailView()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("myRounds")}</Text>
        <Pressable onPress={onRefresh} style={styles.headerRefresh}>
          <Ionicons name="refresh" size={22} color="#3b82f6" />
        </Pressable>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#3b82f6" />
        <Text style={styles.infoBannerText}>
          {t("adminPublishesInfo")}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === "open" && styles.tabActive]}
          onPress={() => setActiveTab("open")}
        >
          <Text style={[styles.tabText, activeTab === "open" && styles.tabTextActive]}>
            {t("open")} ({rounds.filter((r) => r.status === "open").length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text style={[styles.tabText, activeTab === "completed" && styles.tabTextActive]}>
            {t("completed")} ({rounds.filter((r) => r.status === "completed").length})
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredRounds.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>
            {activeTab === "open" ? t("noOpenRounds") : t("noCompletedRounds")}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === "open"
              ? t("roundsCreatedWhenBets")
              : t("completedRoundsAppearHere")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredRounds.map(renderRoundCard)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748b" },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  headerBack: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: "#1e293b" },
  headerRefresh: { padding: 4 },

  // Info Banner
  infoBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#bfdbfe" },
  infoBannerText: { flex: 1, fontSize: 12, color: "#1e40af", marginLeft: 8, lineHeight: 17 },

  // Tabs
  tabRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: "#e2e8f0", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#1e293b" },

  scrollContent: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Round Card
  roundCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  roundHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  roundStateTag: { backgroundColor: "#3b82f6", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  roundStateText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  roundDate: { flex: 1, marginLeft: 10, fontSize: 14, color: "#475569" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusOpen: { backgroundColor: "#dcfce7" },
  statusCompleted: { backgroundColor: "#e0e7ff" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#1e293b" },
  roundStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  roundStat: { alignItems: "center", flex: 1 },
  roundStatLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 2 },
  roundStatValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  winningRow: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  winningText: { flex: 1, marginLeft: 6, fontSize: 12, color: "#475569", fontFamily: "monospace" },
  winnerCountText: { fontSize: 12, color: "#10b981", fontWeight: "600" },
  viewHint: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  viewHintText: { marginLeft: 6, fontSize: 13, color: "#3b82f6", fontWeight: "500" },

  // Detail View
  detailContainer: { flex: 1, paddingHorizontal: 16 },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  backText: { marginLeft: 8, fontSize: 16, color: "#1e293b", fontWeight: "600" },

  // Summary Card
  summaryCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 12 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap" },
  summaryItem: { width: "50%", marginBottom: 12 },
  summaryLabel: { fontSize: 12, color: "#94a3b8" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  summarySubtext: { fontSize: 13, color: "#64748b", marginTop: 4 },

  // Game Section
  gameSection: { marginBottom: 16 },
  gameSectionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },

  // Ticket Row
  ticketRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 6 },
  ticketInfo: { flex: 1 },
  ticketPlayerName: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  ticketGameType: { fontSize: 13, color: "#64748b", fontFamily: "monospace", marginTop: 2 },
  ticketRight: { alignItems: "flex-end" },
  ticketAmount: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  ticketStatus: { fontSize: 11, fontWeight: "600", color: "#94a3b8", marginTop: 2 },
  ticketStatusWon: { color: "#10b981" },
  ticketStatusLost: { color: "#ef4444" },

  // Completed Section
  completedSection: { alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 20, marginTop: 8 },
  completedTitle: { fontSize: 18, fontWeight: "700", color: "#10b981", marginTop: 8 },
  completedNumbers: { marginTop: 12, alignItems: "center" },
  completedNumberLine: { fontSize: 14, fontWeight: "600", color: "#475569", fontFamily: "monospace", lineHeight: 24 },
  completedStats: { marginTop: 12, alignItems: "center" },
  completedStat: { fontSize: 14, color: "#475569", lineHeight: 22 },

  // Waiting Section
  waitingSection: { alignItems: "center", backgroundColor: "#fffbeb", borderRadius: 12, padding: 20, marginTop: 8, borderWidth: 1, borderColor: "#fef3c7" },
  waitingTitle: { fontSize: 18, fontWeight: "700", color: "#f59e0b", marginTop: 8 },
  waitingSubtext: { fontSize: 13, color: "#92400e", textAlign: "center", marginTop: 8, lineHeight: 19 },

  // Empty
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#475569", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 6 },
});
