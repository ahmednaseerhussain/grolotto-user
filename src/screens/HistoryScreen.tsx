import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, FlatList, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";



export default function HistoryScreen() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const currency = useAppStore(s => s.currency);
  const language = useAppStore(s => s.language);
  const gamePlays = useAppStore(s => s.gamePlays);
  const vendors = useAppStore(s => s.vendors);
  const [filter, setFilter] = useState<"all" | "won" | "lost" | "pending">("all");
  const [stateFilter, setStateFilter] = useState<"all" | "FL" | "NY" | "GA" | "TX">("all");
  
  // Date filtering states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  
  // PDF sharing state to prevent multiple simultaneous requests
  const [isSharing, setIsSharing] = useState(false);
  
  const t = (key: string) => getTranslation(key as any, language);

  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  // Get player's games
  const playerGames = user ? gamePlays.filter(game => game.playerId === user.id) : [];
  
  // Convert gamePlays to display format
  const gameHistory = playerGames.map(game => {
    const vendor = vendors.find(v => v.id === game.vendorId);
    const vendorName = vendor?.displayName || `${vendor?.firstName} ${vendor?.lastName}` || "Unknown Vendor";
    
    return {
      id: game.id,
      date: new Date(game.timestamp).toLocaleDateString(),
      time: new Date(game.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      timestamp: new Date(game.timestamp),
      vendor: vendorName,
      state: game.draw.toUpperCase(),
      gameType: game.gameType.toUpperCase(),
      numbers: game.numbers,
      betAmount: game.betAmount,
      currency: game.currency,
      status: game.status,
      winAmount: game.winAmount || 0,
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply date filtering
  let dateFilteredHistory = gameHistory;
  if (fromDate || toDate) {
    dateFilteredHistory = gameHistory.filter(game => {
      const gameDate = game.timestamp;
      let passesFilter = true;
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        passesFilter = passesFilter && gameDate >= from;
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        passesFilter = passesFilter && gameDate <= to;
      }
      
      return passesFilter;
    });
  }

  // Calculate state counts for display
  const stateCounts = gameHistory.reduce((acc, game) => {
    acc[game.state] = (acc[game.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Debug: Log available states
  console.log('Available states in data:', Object.keys(stateCounts));
  console.log('State counts:', stateCounts);

  // Apply state filtering
  let stateFilteredHistory = dateFilteredHistory;
  if (stateFilter !== "all") {
    stateFilteredHistory = dateFilteredHistory.filter(game => {
      return game.state === stateFilter;
    });
  }

  const filteredHistory = filter === "all" 
    ? stateFilteredHistory 
    : stateFilteredHistory.filter(game => game.status === filter);

  const totalBet = filteredHistory.reduce((sum, game) => sum + game.betAmount, 0);
  const totalWon = filteredHistory.reduce((sum, game) => sum + game.winAmount, 0);
  const netResult = totalWon - totalBet;

  // Date picker handlers
  const showDatePickerHandler = (mode: 'from' | 'to') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (datePickerMode === 'from') {
        setFromDate(selectedDate);
      } else {
        setToDate(selectedDate);
      }
    }
  };

  const clearDateFilter = () => {
    setFromDate(null);
    setToDate(null);
  };

  // PDF generation function
  const generatePDF = async () => {
    // Prevent multiple simultaneous sharing requests
    if (isSharing) {
      Alert.alert('Please wait', 'A PDF generation is already in progress.');
      return;
    }

    setIsSharing(true);
    
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>GROLOTTO - Game History Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #f59e0b;
                padding-bottom: 20px;
              }
              .logo {
                color: #f59e0b;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .summary {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-around;
                text-align: center;
              }
              .summary-item {
                flex: 1;
              }
              .summary-value {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .summary-label {
                color: #666;
                font-size: 14px;
              }
              .positive { color: #16a34a; }
              .negative { color: #dc2626; }
              .neutral { color: #2563eb; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
              }
              th {
                background-color: #f3f4f6;
                font-weight: 600;
              }
              .status-won { color: #16a34a; font-weight: 600; }
              .status-lost { color: #dc2626; font-weight: 600; }
              .status-pending { color: #d97706; font-weight: 600; }
              .date-filter {
                margin-bottom: 20px;
                padding: 10px;
                background-color: #f0f9ff;
                border-radius: 6px;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">GROLOTTO</div>
              <h1>Game History Report</h1>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              ${user ? `<p>Player: ${user.name}</p>` : ''}
            </div>
            
            ${fromDate || toDate ? `
              <div class="date-filter">
                <strong>Date Filter:</strong> 
                ${fromDate ? `From ${fromDate.toLocaleDateString()}` : ''} 
                ${fromDate && toDate ? ' to ' : ''}
                ${toDate ? `${toDate.toLocaleDateString()}` : ''}
              </div>
            ` : ''}

            <div class="summary">
              <div class="summary-item">
                <div class="summary-value neutral">${getCurrencySymbol()}${totalBet}</div>
                <div class="summary-label">Total Bet</div>
              </div>
              <div class="summary-item">
                <div class="summary-value positive">${getCurrencySymbol()}${totalWon}</div>
                <div class="summary-label">Total Won</div>
              </div>
              <div class="summary-item">
                <div class="summary-value ${netResult >= 0 ? 'positive' : 'negative'}">
                  ${netResult >= 0 ? '+' : ''}${getCurrencySymbol()}${netResult}
                </div>
                <div class="summary-label">Net Result</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Game</th>
                  <th>Numbers</th>
                  <th>Bet</th>
                  <th>Status</th>
                  <th>Win Amount</th>
                </tr>
              </thead>
              <tbody>
                ${filteredHistory.map(game => `
                  <tr>
                    <td>${game.date} ${game.time}</td>
                    <td>${game.gameType} - ${game.state}</td>
                    <td>${game.numbers.join('-')}</td>
                    <td>${getCurrencySymbol()}${game.betAmount}</td>
                    <td class="status-${game.status}">${game.status.toUpperCase()}</td>
                    <td>${game.winAmount > 0 ? getCurrencySymbol() + game.winAmount : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
              <p>This report contains ${filteredHistory.length} game records</p>
              <p>Report generated by GROLOTTO mobile app</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Add a small delay to ensure sharing system is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Game History Report',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', 'PDF report generated successfully!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Another share request is being processed')) {
        Alert.alert('Please wait', 'Another sharing operation is in progress. Please try again in a moment.');
      } else {
        Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
      }
      console.error('PDF generation error:', error);
    } finally {
      // Reset sharing state after a delay
      setTimeout(() => setIsSharing(false), 1000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "text-green-600 bg-green-100";
      case "lost": return "text-red-600 bg-red-100";
      case "pending": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won": return "checkmark-circle";
      case "lost": return "close-circle";
      case "pending": return "time";
      default: return "help-circle";
    }
  };

  const renderGameItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 mb-1">
            {item.gameType} - {item.state}
          </Text>
          <Text className="text-gray-600 text-sm">
            {item.vendor}
          </Text>
          <Text className="text-gray-500 text-xs">
            {item.date} at {item.time}
          </Text>
        </View>
        
        <View className={`px-3 py-1 rounded-full flex-row items-center ${getStatusColor(item.status)}`}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={16} 
            color={item.status === "won" ? "#16a34a" : item.status === "lost" ? "#dc2626" : "#d97706"} 
          />
          <Text className={`ml-1 font-medium capitalize text-sm ${
            item.status === "won" ? "text-green-600" : 
            item.status === "lost" ? "text-red-600" : "text-yellow-600"
          }`}>
            {item.status}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-gray-700 font-medium">
            Numbers: {item.numbers.join("-")}
          </Text>
          <Text className="text-gray-600 text-sm">
            Bet: {getCurrencySymbol()}{item.betAmount}
          </Text>
        </View>
        
        {item.status === "won" && (
          <View className="bg-green-50 px-3 py-2 rounded-xl">
            <Text className="text-green-700 font-bold">
              +{getCurrencySymbol()}{item.winAmount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-yellow-600">
              GROLOTTO
            </Text>
            <Text className="text-2xl font-bold text-gray-800">
              {t("history")}
            </Text>
          </View>
          <Pressable
            onPress={generatePDF}
            className="bg-red-500 px-4 py-2 rounded-xl mr-3"
          >
            <Ionicons name="document-text" size={20} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Summary Stats */}
      <View className="bg-white mx-6 mt-6 rounded-2xl p-4 border border-gray-200">
        <Text className="text-lg font-bold text-gray-800 mb-3">Summary</Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {getCurrencySymbol()}{totalBet}
            </Text>
            <Text className="text-gray-600 text-sm">Total Bet</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {getCurrencySymbol()}{totalWon}
            </Text>
            <Text className="text-gray-600 text-sm">Total Won</Text>
          </View>
          <View className="items-center">
            <Text className={`text-2xl font-bold ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netResult >= 0 ? "+" : ""}{getCurrencySymbol()}{netResult}
            </Text>
            <Text className="text-gray-600 text-sm">Net Result</Text>
          </View>
        </View>
      </View>

      {/* Date Filter Section */}
      <View className="bg-white mx-6 mt-4 rounded-2xl p-4 border border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800">Date Filter</Text>
          {(fromDate || toDate) && (
            <Pressable
              onPress={clearDateFilter}
              className="bg-gray-200 px-3 py-1 rounded-lg"
            >
              <Text className="text-gray-700 text-sm">Clear</Text>
            </Pressable>
          )}
        </View>
        
        <View className="flex-row space-x-3">
          <Pressable
            onPress={() => showDatePickerHandler('from')}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
          >
            <Text className="text-gray-600 text-xs mb-1">From Date</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-800">
                {fromDate ? fromDate.toLocaleDateString() : 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
            </View>
          </Pressable>
          
          <Pressable
            onPress={() => showDatePickerHandler('to')}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
          >
            <Text className="text-gray-600 text-xs mb-1">To Date</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-800">
                {toDate ? toDate.toLocaleDateString() : 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
            </View>
          </Pressable>
        </View>
        
        {(fromDate || toDate) && (
          <View className="mt-3 bg-blue-50 p-3 rounded-lg">
            <Text className="text-blue-700 text-sm font-medium">
              Showing {filteredHistory.length} games
              {fromDate && ` from ${fromDate.toLocaleDateString()}`}
              {fromDate && toDate && ' to '}
              {toDate && `${toDate.toLocaleDateString()}`}
            </Text>
          </View>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { key: "all", label: "All Games" },
              { key: "won", label: "Won" },
              { key: "lost", label: "Lost" },
              { key: "pending", label: "Pending" }
            ].map((filterOption) => (
              <Pressable
                key={filterOption.key}
                onPress={() => setFilter(filterOption.key as any)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: filter === filterOption.key ? "#8b5cf6" : "#ffffff",
                  borderWidth: 1,
                  borderColor: filter === filterOption.key ? "#8b5cf6" : "#d1d5db"
                }}
              >
                <Text
                  style={{
                    fontWeight: '500',
                    color: filter === filterOption.key ? "#ffffff" : "#374151"
                  }}
                >
                  {filterOption.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* State Filter Buttons */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#6b7280', marginBottom: 12 }}>
          Filter by State:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { key: "all", label: "Tous les jeux", color: "#3b82f6", gameType: "ALL" },
              { key: "FL", label: `SENP (${stateCounts['FL'] || 0})`, color: "#ef4444", gameType: "SENP" },
              { key: "NY", label: `MARYAJ (${stateCounts['NY'] || 0})`, color: "#10b981", gameType: "MARYAJ" },
              { key: "GA", label: `LOTO5 (${stateCounts['GA'] || 0})`, color: "#f59e0b", gameType: "LOTO5" },
              { key: "TX", label: `LOTO3 (${stateCounts['TX'] || 0})`, color: "#2563eb", gameType: "LOTO3" }
            ].map((stateOption) => (
              <Pressable
                key={stateOption.key}
                onPress={() => setStateFilter(stateOption.key as any)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: stateFilter === stateOption.key ? stateOption.color : "#ffffff",
                  borderWidth: 1,
                  borderColor: stateFilter === stateOption.key ? stateOption.color : "#d1d5db"
                }}
              >
                <Text
                  style={{
                    fontWeight: '500',
                    color: stateFilter === stateOption.key ? "#ffffff" : "#374151"
                  }}
                >
                  {stateOption.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Game History List */}
      <View className="flex-1 px-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Recent Games ({filteredHistory.length})
        </Text>
        
        {filteredHistory.length > 0 ? (
          <FlatList
            data={filteredHistory}
            renderItem={renderGameItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="time-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-xl font-medium mt-4">
              {gameHistory.length === 0 ? "No games played yet" : `No ${filter} games found`}
            </Text>
            <Text className="text-gray-400 text-center mt-2 max-w-64">
              {gameHistory.length === 0 
                ? "Place your first bet to see your game history here" 
                : "Your game history will appear here"}
            </Text>
            {gameHistory.length === 0 && (
              <Pressable 
                className="bg-purple-500 px-6 py-3 rounded-2xl mt-4"
                onPress={() => navigation.navigate("PlayerDashboard" as never)}
              >
                <Text className="text-white font-semibold">Start Playing</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'from' ? (fromDate || new Date()) : (toDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}