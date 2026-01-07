import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../state/appStore";

const FILTER_OPTIONS = [
  { key: "all", label: "Tous", icon: "apps" },
  { key: "today", label: "Aujourd'hui", icon: "today" },
  { key: "week", label: "Cette semaine", icon: "calendar" },
  { key: "month", label: "Ce mois", icon: "calendar-outline" },
];

const GAME_TYPE_COLORS = {
  senp: "#ef4444",
  maryaj: "#10b981",
  loto3: "#3b82f6",
  loto4: "#8b5cf6",
  loto5: "#f59e0b",
};

const STATE_OPTIONS = [
  { key: "all", label: "Tous les États", icon: "earth" },
  { key: "FL", label: "Floride", icon: "location" },
  { key: "NY", label: "New York", icon: "location" },
  { key: "GA", label: "Géorgie", icon: "location" },
  { key: "TX", label: "Texas", icon: "location" },
];

export default function VendorPlayHistory() {
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const gamePlays = useAppStore(s => s.gamePlays);
  
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedDraw] = useState<string | null>(null);
  
  const currentVendor = vendors.find(v => v.email === user?.email) || vendors[0]; // For testing, use first vendor if no match
  
  console.log("Debug - User email:", user?.email);
  console.log("Debug - Available vendors:", vendors.map(v => ({ id: v.id, email: v.email })));
  console.log("Debug - Current vendor:", currentVendor?.id);
  console.log("Debug - Total game plays:", gamePlays.length);
  
  if (!currentVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Vendeur non trouvé</Text>
          <Text style={styles.errorSubtext}>
            Email utilisateur: {user?.email || "Non connecté"}
          </Text>
          <Text style={styles.errorSubtext}>
            Vendeurs disponibles: {vendors.length}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter game plays for this vendor
  // Temporarily show all game plays for debugging
  const vendorGamePlays = gamePlays; // gamePlays.filter(game => game.vendorId === currentVendor.id);
  
  console.log("Debug - Vendor game plays:", vendorGamePlays.length);
  console.log("Debug - Looking for vendorId:", currentVendor.id);
  console.log("Debug - All game plays vendor IDs:", gamePlays.map(g => g.vendorId));
  
  // Apply filters
  const filteredGamePlays = vendorGamePlays.filter(game => {
    const gameDate = new Date(game.timestamp);
    const now = new Date();
    
    // Date filter
    switch (selectedFilter) {
      case "today":
        if (gameDate.toDateString() !== now.toDateString()) return false;
        break;
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (gameDate < weekAgo) return false;
        break;
      case "month":
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (gameDate < monthAgo) return false;
        break;
    }
    
    // Game type filter
    if (selectedGameType && game.gameType !== selectedGameType) return false;
    
    // State filter
    if (selectedState !== "all" && game.draw !== selectedState) return false;
    
    // Draw filter
    if (selectedDraw && game.draw !== selectedDraw) return false;
    
    // Search filter (by numbers)
    if (searchQuery && !game.numbers.some(num => num.toString().includes(searchQuery))) {
      return false;
    }
    
    return true;
  });

  // Calculate stats
  const stats = {
    totalTickets: filteredGamePlays.length,
    totalAmount: filteredGamePlays.reduce((sum, game) => sum + game.betAmount, 0),
    winningTickets: filteredGamePlays.filter(game => game.status === "won").length,
    totalWinnings: filteredGamePlays
      .filter(game => game.status === "won")
      .reduce((sum, game) => sum + (game.winAmount || 0), 0),
    commission: filteredGamePlays.reduce((sum, game) => sum + game.betAmount, 0) * 0.1, // 10% commission
  };

  // Group by game type for quick stats
  const gameTypeStats = Object.entries(
    filteredGamePlays.reduce((acc, game) => {
      acc[game.gameType] = (acc[game.gameType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  // Group by state for stats
  const stateStats = Object.entries(
    vendorGamePlays.reduce((acc, game) => {
      acc[game.draw] = (acc[game.draw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  // Get unique draws (for future use)
  // const availableDraws = [...new Set(vendorGamePlays.map(game => game.draw))];

  const exportToCSV = () => {
    // In a real app, this would generate and download a CSV file
    console.log("Exporting to CSV...");
    // Mock implementation
    alert("Rapport CSV généré! (Fonctionnalité simulée)");
  };

  const exportToPDF = () => {
    // In a real app, this would generate and download a PDF file
    console.log("Exporting to PDF...");
    // Mock implementation
    alert("Rapport PDF généré! (Fonctionnalité simulée)");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Historique & Rapports</Text>
        <Pressable style={styles.exportButton}>
          <Ionicons name="download" size={20} color="#3b82f6" />
        </Pressable>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={styles.statCard}>
            <Ionicons name="ticket" size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.totalTickets}</Text>
            <Text style={styles.statLabel}>Billets</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cash" size={20} color="#10b981" />
            <Text style={styles.statValue}>${stats.totalAmount.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Mise Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.winningTickets}</Text>
            <Text style={styles.statLabel}>Gagnants</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color="#8b5cf6" />
            <Text style={styles.statValue}>${stats.commission.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Commission</Text>
          </View>
        </ScrollView>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Date Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map((filter) => (
            <Pressable
              key={filter.key}
              style={[styles.filterChip, selectedFilter === filter.key && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={16} 
                color={selectedFilter === filter.key ? "#ffffff" : "#6b7280"} 
              />
              <Text style={[
                styles.filterChipText, 
                selectedFilter === filter.key && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Game Type Filter */}
        {gameTypeStats.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Types de Jeux</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <Pressable
                style={[styles.gameTypeChip, !selectedGameType && styles.gameTypeChipActive]}
                onPress={() => setSelectedGameType(null)}
              >
                <Text style={[styles.gameTypeChipText, !selectedGameType && styles.gameTypeChipTextActive]}>
                  Tous les jeux
                </Text>
              </Pressable>
              
              {gameTypeStats.map(([gameType, count]) => (
                <Pressable
                  key={gameType}
                  style={[
                    styles.gameTypeChip,
                    selectedGameType === gameType && styles.gameTypeChipActive,
                    { borderColor: GAME_TYPE_COLORS[gameType as keyof typeof GAME_TYPE_COLORS] }
                  ]}
                  onPress={() => setSelectedGameType(selectedGameType === gameType ? null : gameType)}
                >
                  <View 
                    style={[
                      styles.gameTypeDot, 
                      { backgroundColor: GAME_TYPE_COLORS[gameType as keyof typeof GAME_TYPE_COLORS] }
                    ]} 
                  />
                  <Text style={[
                    styles.gameTypeChipText,
                    selectedGameType === gameType && styles.gameTypeChipTextActive
                  ]}>
                    {gameType.toUpperCase()} ({count})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* State Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>États</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {STATE_OPTIONS.map((state) => (
              <Pressable
                key={state.key}
                style={[styles.stateChip, selectedState === state.key && styles.stateChipActive]}
                onPress={() => setSelectedState(state.key)}
              >
                <Ionicons 
                  name={state.icon as any} 
                  size={14} 
                  color={selectedState === state.key ? "#ffffff" : "#6b7280"} 
                />
                <Text style={[
                  styles.stateChipText, 
                  selectedState === state.key && styles.stateChipTextActive
                ]}>
                  {state.label}
                  {state.key !== "all" && stateStats.find(([s]) => s === state.key) && 
                    ` (${stateStats.find(([s]) => s === state.key)?.[1] || 0})`
                  }
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Chercher par numéros..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Game History */}
      <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.historyContainer}>
          {filteredGamePlays.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>Aucun résultat trouvé</Text>
              <Text style={styles.emptyStateSubtext}>
                Ajustez vos filtres ou essayez une autre recherche
              </Text>
            </View>
          ) : (
            filteredGamePlays
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((game) => (
                <View key={game.id} style={styles.gameCard}>
                  <View style={styles.gameHeader}>
                    <View style={styles.gameInfo}>
                      <View style={styles.gameTypeContainer}>
                        <View 
                          style={[
                            styles.gameTypeBadge, 
                            { backgroundColor: GAME_TYPE_COLORS[game.gameType as keyof typeof GAME_TYPE_COLORS] }
                          ]}
                        >
                          <Text style={styles.gameTypeBadgeText}>{game.gameType.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.gameDraw}>{game.draw}</Text>
                      </View>
                      
                      <View style={styles.gameNumbers}>
                        {game.numbers.map((number, index) => (
                          <View key={index} style={styles.numberBall}>
                            <Text style={styles.numberText}>{number.toString().padStart(2, '0')}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    
                    <View style={styles.gameStats}>
                      <Text style={styles.gameAmount}>${game.betAmount}</Text>
                      <View style={[
                        styles.gameStatus,
                        game.status === "won" ? styles.gameStatusWon : 
                        game.status === "lost" ? styles.gameStatusLost : styles.gameStatusPending
                      ]}>
                        <Text style={styles.gameStatusText}>
                          {game.status === "won" ? "Gagnant" : 
                           game.status === "lost" ? "Perdant" : "En attente"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.gameFooter}>
                    <Text style={styles.gameTime}>
                      {new Date(game.timestamp).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    
                    {game.status === "won" && game.winAmount && (
                      <Text style={styles.gameWinAmount}>
                        Gain: ${game.winAmount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* Export Options */}
      {filteredGamePlays.length > 0 && (
        <View style={styles.exportContainer}>
          <Pressable style={styles.exportOption} onPress={exportToCSV}>
            <Ionicons name="document-text" size={20} color="#10b981" />
            <Text style={styles.exportOptionText}>Exporter CSV</Text>
          </Pressable>
          
          <Pressable style={styles.exportOption} onPress={exportToPDF}>
            <Ionicons name="document" size={20} color="#ef4444" />
            <Text style={styles.exportOptionText}>Exporter PDF</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  exportButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    alignItems: "center",
    marginRight: 24,
    minWidth: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterSection: {
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 20,
    marginBottom: 6,
  },
  filterScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
  },
  filterChipText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  gameTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  gameTypeChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  gameTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  gameTypeChipText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  gameTypeChipTextActive: {
    color: "#3b82f6",
  },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  stateChipActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  stateChipText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginLeft: 4,
  },
  stateChipTextActive: {
    color: "#ffffff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    marginLeft: 8,
  },
  historyScroll: {
    flex: 1,
  },
  historyContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  gameCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  gameTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  gameTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  gameDraw: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  gameNumbers: {
    flexDirection: "row",
    gap: 6,
  },
  numberBall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  numberText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  gameStats: {
    alignItems: "flex-end",
  },
  gameAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  gameStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  gameStatusWon: {
    backgroundColor: "#dcfce7",
  },
  gameStatusLost: {
    backgroundColor: "#fee2e2",
  },
  gameStatusPending: {
    backgroundColor: "#fef3c7",
  },
  gameStatusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  gameFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  gameTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  gameWinAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  exportContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  exportOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  exportOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ef4444",
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 4,
  },
});