import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { vendorAPI, getErrorMessage } from "../api/apiClient";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const getStateOptions = (t: (key: string) => string) => [
  { key: "all", label: t("allStates"), code: "ALL" },
  { key: "FL", label: t("florida"), code: "FL" },
  { key: "NY", label: t("newYork"), code: "NY" },
  { key: "GA", label: t("georgia"), code: "GA" },
  { key: "TX", label: t("texas"), code: "TX" },
];

export default function TodayPlayersWinners() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const gamePlays = useAppStore(s => s.gamePlays);
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  
  const [selectedState, setSelectedState] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [apiPlays, setApiPlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const t = (key: string) => getTranslation(key as any, language);
  const STATE_OPTIONS = getStateOptions(t);

  // Fetch today's play data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await vendorAPI.getPlayHistory(1, 500);
        if (data?.plays) {
          setApiPlays(data.plays.map((p: any) => ({
            id: p.id,
            playerId: p.playerId,
            vendorId: p.vendorId,
            draw: p.drawState || p.draw,
            gameType: p.gameType,
            numbers: p.numbers || [],
            betAmount: p.betAmount || 0,
            currency: p.currency || 'USD',
            timestamp: new Date(p.createdAt || p.timestamp).getTime(),
            status: p.status || 'pending',
            winAmount: p.winAmount || 0,
          })));
        }
      } catch (e) {
        console.warn('TodayPlayersWinners fetch error:', getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // Currency formatting function
  const formatCurrency = (amount: number) => {
    const symbol = currency === "HTG" ? "G" : "$";
    const rate = currency === "HTG" ? 150 : 1;
    const convertedAmount = amount * rate;
    return `${symbol}${convertedAmount.toFixed(2)}`;
  };

  const currentVendor = vendors.find(v => (v as any).userId === user?.id);
  
  // Get today's date
  const today = new Date();
  const todayString = today.toDateString();
  
  // Use API data if available, fall back to local store
  const allPlays = apiPlays.length > 0 ? apiPlays : gamePlays;
  
  // Filter today's games for current vendor
  const todayGames = allPlays.filter(game => 
    game.vendorId === currentVendor?.id && 
    new Date(game.timestamp).toDateString() === todayString &&
    (selectedState === "all" || game.draw === selectedState)
  );

  // Group by state
  const gamesByState = STATE_OPTIONS.reduce((acc, state) => {
    if (state.key === "all") return acc;
    
    const stateGames = todayGames.filter(game => game.draw === state.key);
    const players = new Set(stateGames.map(g => g.playerId));
    const totalPlayed = stateGames.reduce((sum, game) => sum + game.betAmount, 0);
    
    // Winners come from games with status 'won' (set by backend after results are published)
    const winners = stateGames.filter(game => (game as any).status === 'won');
    const totalWon = winners.reduce((sum, game) => sum + ((game as any).winAmount || 0), 0);
    
    acc[state.key] = {
      state: state.label,
      players: Array.from(players).map(playerId => {
        const playerGames = stateGames.filter(g => g.playerId === playerId);
        const totalBet = playerGames.reduce((sum, g) => sum + g.betAmount, 0);
        return {
          playerId,
          games: playerGames.length,
          totalBet,
          games_detail: playerGames
        };
      }),
      winners: winners.map(game => ({
        playerId: game.playerId,
        gameType: game.gameType,
        numbers: game.numbers,
        betAmount: game.betAmount,
        winAmount: (game as any).winAmount || 0,
        timestamp: game.timestamp
      })),
      totalPlayers: players.size,
      totalPlayed,
      totalWinners: winners.length,
      totalWon
    };
    return acc;
  }, {} as any);

  const overallStats = {
    totalPlayers: new Set(todayGames.map(g => g.playerId)).size,
    totalGames: todayGames.length,
    totalPlayed: todayGames.reduce((sum, game) => sum + game.betAmount, 0),
    totalWinners: Object.values(gamesByState).reduce((sum: number, state: any) => sum + state.totalWinners, 0),
    totalWon: Object.values(gamesByState).reduce((sum: number, state: any) => sum + state.totalWon, 0),
  };

  const generatePDFReport = async () => {
    setIsExporting(true);
    try {
      const stateData = selectedState === "all" ? gamesByState : { [selectedState]: gamesByState[selectedState] };
      const reportDate = today.toLocaleDateString('fr-FR');
      
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
              .stats { display: flex; justify-content: space-around; margin: 20px 0; background: #f8fafc; padding: 15px; border-radius: 8px; }
              .stat-item { text-align: center; }
              .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
              .stat-label { font-size: 12px; color: #6b7280; }
              .state-section { margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
              .state-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px; }
              .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              .table th { background: #f8fafc; font-weight: bold; }
              .totals { background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Daily Report - Players and Winners</h1>
              <h3>${reportDate}</h3>
              <p>Vendeur: ${currentVendor?.firstName} ${currentVendor?.lastName}</p>
            </div>
            
            <div class="stats">
              <div class="stat-item">
                <div class="stat-value">${overallStats.totalPlayers}</div>
                <div class="stat-label">Joueurs Uniques</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${overallStats.totalGames}</div>
                <div class="stat-label">Jeux Joués</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${formatCurrency(overallStats.totalPlayed)}</div>
                <div class="stat-label">Total Misé</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${overallStats.totalWinners}</div>
                <div class="stat-label">Winners</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${formatCurrency(overallStats.totalWon)}</div>
                <div class="stat-label">Total Won</div>
              </div>
            </div>
            
            ${Object.entries(stateData).map(([stateKey, data]: [string, any]) => `
              <div class="state-section">
                <div class="state-title">${data.state}</div>
                
                <h4>Joueurs (${data.totalPlayers})</h4>
                <table class="table">
                  <tr>
                    <th>ID Joueur</th>
                    <th>Jeux</th>
                    <th>Montant Total</th>
                  </tr>
                  ${data.players.map((player: any) => `
                    <tr>
                      <td>Joueur #${player.playerId.slice(-4)}</td>
                      <td>${player.games}</td>
                      <td>${formatCurrency(player.totalBet)}</td>
                    </tr>
                  `).join('')}
                </table>
                
                <h4>Winners (${data.totalWinners})</h4>
                <table class="table">
                  <tr>
                    <th>ID Joueur</th>
                    <th>Type</th>
                    <th>Numéros</th>
                    <th>Mise</th>
                    <th>Gain</th>
                  </tr>
                  ${data.winners.map((winner: any) => `
                    <tr>
                      <td>Joueur #${winner.playerId.slice(-4)}</td>
                      <td>${winner.gameType}</td>
                      <td>${winner.numbers.join(', ')}</td>
                      <td>${formatCurrency(winner.betAmount)}</td>
                      <td>${formatCurrency(winner.winAmount)}</td>
                    </tr>
                  `).join('')}
                </table>
                
                <div class="totals">
                  <strong>Total State: ${data.totalPlayers} players, ${formatCurrency(data.totalPlayed)} bet, ${formatCurrency(data.totalWon)} won</strong>
                </div>
              </div>
            `).join('')}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      Alert.alert(t("error"), t("pdfExportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSVReport = async () => {
    setIsExporting(true);
    try {
      let csvContent = "Type,État,ID Joueur,Type Jeu,Numéros,Montant,Gain,Timestamp\n";
      
      Object.entries(gamesByState).forEach(([stateKey, data]: [string, any]) => {
        // Add players data
        data.players.forEach((player: any) => {
          player.games_detail.forEach((game: any) => {
            csvContent += `Joueur,${data.state},${game.playerId},${game.gameType},"${game.numbers.join(', ')}",${game.betAmount},,${new Date(game.timestamp).toISOString()}\n`;
          });
        });
        
        // Add winners data
        data.winners.forEach((winner: any) => {
          csvContent += `Winner,${data.state},${winner.playerId},${winner.gameType},"${winner.numbers.join(', ')}",${winner.betAmount},${winner.winAmount},${new Date(winner.timestamp).toISOString()}\n`;
        });
      });

      const { uri } = await Print.printToFileAsync({ 
        html: `<pre>${csvContent}</pre>`
      });
      await Sharing.shareAsync(uri);
      
    } catch (error) {
      console.error('CSV Export Error:', error);
      Alert.alert(t("error"), t("csvExportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("todaysPlayersAndWinners")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{overallStats.totalPlayers}</Text>
            <Text style={styles.statLabel}>{t("players")}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="game-controller" size={20} color="#8b5cf6" />
            <Text style={styles.statValue}>{overallStats.totalGames}</Text>
            <Text style={styles.statLabel}>{t("games")}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cash" size={20} color="#10b981" />
            <Text style={styles.statValue}>{formatCurrency(overallStats.totalPlayed)}</Text>
            <Text style={styles.statLabel}>{t("totalBetAmount")}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{overallStats.totalWinners}</Text>
            <Text style={styles.statLabel}>{t("winners")}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color="#ef4444" />
            <Text style={styles.statValue}>{formatCurrency(overallStats.totalWon)}</Text>
            <Text style={styles.statLabel}>{t("totalWon")}</Text>
          </View>
        </ScrollView>
      </View>

      {/* State Filter */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATE_OPTIONS.map((state) => (
            <Pressable
              key={state.key}
              style={[styles.stateChip, selectedState === state.key && styles.stateChipActive]}
              onPress={() => setSelectedState(state.key)}
            >
              <Text style={[
                styles.stateChipText, 
                selectedState === state.key && styles.stateChipTextActive
              ]}>
                {state.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Export Buttons */}
      <View style={styles.exportContainer}>
        <Pressable 
          style={[styles.exportButton, styles.pdfButton]}
          onPress={generatePDFReport}
          disabled={isExporting}
        >
          <Ionicons name="document" size={16} color="#ffffff" />
          <Text style={styles.exportButtonText}>
            {isExporting ? `${t("exporting")}...` : t("exportPDF")}
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.exportButton, styles.csvButton]}
          onPress={generateCSVReport}
          disabled={isExporting}
        >
          <Ionicons name="grid" size={16} color="#ffffff" />
          <Text style={styles.exportButtonText}>
            {isExporting ? `${t("exporting")}...` : t("exportCSV")}
          </Text>
        </Pressable>
      </View>

      {/* Data Display */}
      <ScrollView style={styles.dataContainer} showsVerticalScrollIndicator={false}>
        {todayGames.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>{t("noActivityToday")}</Text>
            <Text style={styles.emptyStateSubtext}>
              {t("todaysGamesAppearHere")}
            </Text>
          </View>
        ) : selectedState === "all" ? (
          // Show all states
          Object.entries(gamesByState).map(([stateKey, data]: [string, any]) => (
            <View key={stateKey} style={styles.stateSection}>
              <Text style={styles.stateTitle}>{data.state}</Text>
              
              <View style={styles.stateSummary}>
                <Text style={styles.summaryText}>
                  {data.totalPlayers} {t("players")} • {formatCurrency(data.totalPlayed)} {t("bet")} • {data.totalWinners} {t("winners")} • {formatCurrency(data.totalWon)} {t("won")}
                </Text>
              </View>

              {/* Players Section */}
              <View style={styles.playersSection}>
                <Text style={styles.sectionTitle}>{t("players")} ({data.totalPlayers})</Text>
                {data.players.slice(0, 5).map((player: any) => (
                  <View key={player.playerId} style={styles.playerItem}>
                    <Text style={styles.playerName}>{t("player")} #{player.playerId.slice(-4)}</Text>
                    <Text style={styles.playerStats}>
                      {player.games} games • {formatCurrency(player.totalBet)}
                    </Text>
                    {player.games_detail?.map((g: any, idx: number) => (
                      <Text key={idx} style={styles.gameDetailText}>
                        {g.gameType?.toUpperCase()} [{g.numbers?.join(', ')}] — {formatCurrency(g.betAmount)} ({g.status || 'pending'})
                      </Text>
                    ))}
                  </View>
                ))}
                {data.players.length > 5 && (
                  <Text style={styles.moreText}>+{data.players.length - 5} {t("morePlayers")}</Text>
                )}
              </View>

              {/* Winners Section */}
              <View style={styles.winnersSection}>
                <Text style={styles.sectionTitle}>{t("winners")} ({data.totalWinners})</Text>
                {data.winners.map((winner: any, index: number) => (
                  <View key={index} style={styles.winnerItem}>
                    <View style={styles.winnerHeader}>
                      <Text style={styles.winnerName}>{t("player")} #{winner.playerId.slice(-4)}</Text>
                      <Text style={styles.winAmount}>{formatCurrency(winner.winAmount)}</Text>
                    </View>
                    <Text style={styles.winnerDetails}>
                      {winner.gameType} • {winner.numbers.join(', ')} • {t("bet")}: {formatCurrency(winner.betAmount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          // Show selected state only
          gamesByState[selectedState] && (
            <View style={styles.stateSection}>
              <Text style={styles.stateTitle}>{gamesByState[selectedState].state}</Text>
              
              <View style={styles.stateSummary}>
                <Text style={styles.summaryText}>
                  {gamesByState[selectedState].totalPlayers} {t("players")} • {formatCurrency(gamesByState[selectedState].totalPlayed)} {t("bet")} • {gamesByState[selectedState].totalWinners} {t("winners")} • {formatCurrency(gamesByState[selectedState].totalWon)} {t("won")}
                </Text>
              </View>

              {/* Detailed Players */}
              <View style={styles.playersSection}>
                <Text style={styles.sectionTitle}>{t("allPlayers")} ({gamesByState[selectedState].totalPlayers})</Text>
                {gamesByState[selectedState].players.map((player: any) => (
                  <View key={player.playerId} style={styles.playerItem}>
                    <Text style={styles.playerName}>{t("player")} #{player.playerId.slice(-4)}</Text>
                    <Text style={styles.playerStats}>
                      {player.games} games • {formatCurrency(player.totalBet)}
                    </Text>
                    {player.games_detail?.map((g: any, idx: number) => (
                      <Text key={idx} style={styles.gameDetailText}>
                        {g.gameType?.toUpperCase()} [{g.numbers?.join(', ')}] — {formatCurrency(g.betAmount)} ({g.status || 'pending'})
                      </Text>
                    ))}
                  </View>
                ))}
              </View>

              {/* Detailed Winners */}
              <View style={styles.winnersSection}>
                <Text style={styles.sectionTitle}>{t("allWinners")} ({gamesByState[selectedState].totalWinners})</Text>
                {gamesByState[selectedState].winners.map((winner: any, index: number) => (
                  <View key={index} style={styles.winnerItem}>
                    <View style={styles.winnerHeader}>
                      <Text style={styles.winnerName}>{t("player")} #{winner.playerId.slice(-4)}</Text>
                      <Text style={styles.winAmount}>{formatCurrency(winner.winAmount)}</Text>
                    </View>
                    <Text style={styles.winnerDetails}>
                      {winner.gameType} • {winner.numbers.join(', ')} • {t("bet")}: {formatCurrency(winner.betAmount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statsScroll: {
    paddingHorizontal: 20,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 8,
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
  filterScroll: {
    paddingHorizontal: 20,
  },
  stateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  stateChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  stateChipText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  stateChipTextActive: {
    color: "#ffffff",
  },
  exportContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  pdfButton: {
    backgroundColor: "#ef4444",
  },
  csvButton: {
    backgroundColor: "#10b981",
  },
  exportButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  dataContainer: {
    flex: 1,
    padding: 20,
  },
  stateSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  stateSummary: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  playersSection: {
    marginBottom: 20,
  },
  winnersSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  playerItem: {
    flexDirection: "column",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  playerStats: {
    fontSize: 12,
    color: "#6b7280",
  },
  gameDetailText: {
    fontSize: 11,
    color: "#3b82f6",
    marginTop: 3,
    paddingLeft: 8,
  },
  moreText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 8,
  },
  winnerItem: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  winnerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  winAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
  },
  winnerDetails: {
    fontSize: 12,
    color: "#6b7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});