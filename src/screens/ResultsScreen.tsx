import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../state/appStore';
import { getTranslation } from '../utils/translations';
import { lotteryAPI, getErrorMessage } from '../api/apiClient';

const { width } = Dimensions.get('window');

interface DailyResult {
  id: string;
  gameType: 'FL' | 'NY' | 'GA' | 'TX';
  gameTypeDisplay: string;
  time: string;
  numbers: string;
  drawTime: string;
  date: string;
  jackpot?: string;
  winners?: number;
  status: 'live' | 'final';
}

export default function ResultsScreen() {
  const navigation = useNavigation();
  const currency = useAppStore(s => s.currency);
  const language = useAppStore(s => s.language);
  const user = useAppStore(s => s.user);
  
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const messageSlideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const t = (key: string) => getTranslation(key as any, language);
  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  const [lotteryRounds, setLotteryRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch lottery rounds from backend
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await lotteryAPI.getLotteryRounds();
        if (Array.isArray(data)) setLotteryRounds(data);
        else if (data?.rounds) setLotteryRounds(data.rounds);
      } catch (e) {
        console.warn('Failed to fetch lottery rounds:', getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  // Generic sliding messages (no fake data)
  const slidingMessages = [
    "📱 Enable push notifications for instant results",
    "🎲 Play responsibly - set your daily limits in Settings",
    "💰 Check your wallet balance before placing bets",
    "⭐ Rate your vendor after each game for better service",
  ];

  // Build results from API data, fallback to empty
  const dailyResults: DailyResult[] = lotteryRounds.length > 0
    ? lotteryRounds.map((round: any, idx: number) => ({
        id: round.id || String(idx),
        gameType: (round.drawState || round.state || 'FL') as DailyResult['gameType'],
        gameTypeDisplay: `${round.drawState || round.state || 'FL'} ${round.session || ''}`.trim(),
        time: round.session || round.drawTime || '',
        numbers: Array.isArray(round.winningNumbers)
          ? Object.values(round.winningNumbers).flat().join(' ')
          : typeof round.winningNumbers === 'object' && round.winningNumbers
            ? Object.values(round.winningNumbers).flat().join(' ')
            : String(round.winningNumbers || 'Pending'),
        drawTime: round.drawTime || '',
        date: round.date || 'Today',
        jackpot: round.jackpot ? String(round.jackpot) : undefined,
        winners: round.winnersCount || 0,
        status: round.status === 'completed' ? 'final' : 'live',
      }))
    : [];

  // Auto-slide functionality for results
  useEffect(() => {
    if (dailyResults.length === 0) return;
    const interval = setInterval(() => {
      slideToNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [currentResultIndex, dailyResults.length]);

  // Auto-slide functionality for messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % slidingMessages.length);
    }, 3500); // Change every 3.5 seconds (professional timing)

    return () => clearInterval(messageInterval);
  }, []);

  // Pulse animation for LIVE indicator
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Animate message sliding - smooth professional transition
  useEffect(() => {
    Animated.timing(messageSlideAnim, {
      toValue: -currentMessageIndex * (width - 72),
      duration: 800, // Smooth professional transition
      useNativeDriver: true,
    }).start();
  }, [currentMessageIndex]);

  const slideToNext = () => {
    if (dailyResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % dailyResults.length;
    
    // Fade out current result
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Update index
      setCurrentResultIndex(nextIndex);
      
      // Slide animation
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  const getGameTypeColor = (gameType: string) => {
    switch (gameType) {
      case 'FL': return '#f59e0b';
      case 'NY': return '#3b82f6';
      case 'GA': return '#10b981';
      case 'TX': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const currentResult = dailyResults.length > 0 ? dailyResults[currentResultIndex % dailyResults.length] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header - matching your screenshot exactly */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 }}>
              GROLOTTO
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 2 }}>
              Welcome, {user?.name || 'themepam89'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Ready to play today?
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => navigation.navigate("SettingsScreen" as never)} style={{ marginRight: 16 }}>
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("HistoryScreen" as never)}>
              <Ionicons name="document-text-outline" size={24} color="#6b7280" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Wallet Balance - matching screenshot */}
      <View style={{ 
        backgroundColor: '#ffffff', 
        marginHorizontal: 20, 
        marginVertical: 16, 
        borderRadius: 16, 
        padding: 20, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
            Available Balance
          </Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937' }}>
            {getCurrencySymbol()}{user?.balance?.toFixed(2) || '0.00'}
          </Text>
        </View>
        <Pressable 
          onPress={() => navigation.navigate("PaymentScreen" as never)}
          style={{ 
          backgroundColor: '#3b82f6', 
          flexDirection: 'row', 
          alignItems: 'center', 
          paddingHorizontal: 20, 
          paddingVertical: 12, 
          borderRadius: 12 
        }}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: '600', marginLeft: 8 }}>
            Add Funds
          </Text>
        </Pressable>
      </View>
      
      <Pressable 
        onPress={() => navigation.navigate("TransactionHistory" as never)}
        style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 16 
      }}>
        <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '500', marginRight: 4 }}>
          View Transaction History
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
      </Pressable>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Quick Actions - 2x2 grid matching screenshot */}
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: 12, 
          marginBottom: 20 
        }}>
          <Pressable 
            onPress={() => navigation.navigate("PaymentScreen" as never)}
            style={[{
            width: (width - 60) / 2,
            backgroundColor: '#3b82f6',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 120,
            justifyContent: 'center'
          }]}>
            <Ionicons name="wallet" size={24} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
              Wallet
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' }}>
              Add Funds
            </Text>
          </Pressable>
          
          <Pressable 
            onPress={() => navigation.navigate("Tchala" as never)}
            style={[{
            width: (width - 60) / 2,
            backgroundColor: '#f59e0b',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 120,
            justifyContent: 'center'
          }]}>
            <Ionicons name="moon" size={24} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
              Tchala
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' }}>
              Dream Numbers
            </Text>
          </Pressable>
          
          <Pressable 
            onPress={() => {}} // Already on Results screen
            style={[{
            width: (width - 60) / 2,
            backgroundColor: '#10b981',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 120,
            justifyContent: 'center'
          }]}>
            <Ionicons name="document-text" size={24} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
              Results
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' }}>
              Latest Draws
            </Text>
          </Pressable>
          
          <Pressable 
            onPress={() => navigation.navigate("HistoryScreen" as never)}
            style={[{
            width: (width - 60) / 2,
            backgroundColor: '#8b5cf6',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            minHeight: 120,
            justifyContent: 'center'
          }]}>
            <Ionicons name="time" size={24} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
              History
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' }}>
              Past Games
            </Text>
          </Pressable>
        </View>

        {/* Today Results - cycling through actual results */}
        {currentResult ? (
        <Animated.View style={{
          backgroundColor: '#fbbf24',
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#3b82f6' }}>
              Today results {currentResult.time}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {currentResult.status === 'live' && (
                <Animated.View 
                  style={[
                    { 
                      width: 8, 
                      height: 8, 
                      backgroundColor: '#ef4444', 
                      borderRadius: 4,
                      marginRight: 4,
                      transform: [{ scale: pulseAnim }]
                    }
                  ]} 
                />
              )}
              <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold' }}>
                {currentResult.status === 'live' ? 'LIVE' : 'FINAL'}
              </Text>
            </View>
          </View>
          
          <View style={{
            backgroundColor: '#1f2937',
            borderRadius: 16,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <View style={{
              backgroundColor: getGameTypeColor(currentResult.gameType),
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8
            }}>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>
                {currentResult.gameType}
              </Text>
            </View>
            
            <Text style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              flex: 1,
              marginHorizontal: 20
            }}>
              {currentResult.numbers}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 }}>
            <Text style={{ color: '#1f2937', fontSize: 12 }}>
              {currentResult.drawTime}
            </Text>
            <Text style={{ color: '#1f2937', fontSize: 12, fontWeight: 'bold' }}>
              ${currentResult.jackpot} jackpot
            </Text>
            <Text style={{ color: '#1f2937', fontSize: 12 }}>
              {currentResult.winners} winners
            </Text>
          </View>
        </Animated.View>
        ) : (
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 20, padding: 30, marginBottom: 20, alignItems: 'center' }}>
            <Ionicons name="hourglass-outline" size={48} color="#9ca3af" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 }}>
              {loading ? 'Loading results...' : 'No results available yet'}
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
              Results will appear here when draws are completed
            </Text>
          </View>
        )}

        {/* Sliding Messages Banner */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          overflow: 'hidden'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="megaphone" size={20} color="#f59e0b" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 8 }}>
              Live Updates
            </Text>
          </View>
          
          <View style={{ height: 50, overflow: 'hidden' }}>
            <Animated.View
              style={[
                {
                  flexDirection: 'row',
                  transform: [{ translateX: messageSlideAnim }]
                }
              ]}
            >
              {slidingMessages.map((message, index) => (
                <View key={index} style={{ width: width - 72, justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#4b5563', 
                    textAlign: 'center',
                    lineHeight: 20
                  }}>
                    {message}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>

        {/* Jwenn Machann yo Section - matching screenshot */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>
          Find Vendors
        </Text>
        
        <View style={{
          backgroundColor: '#f3f4f6',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <Text style={{ marginLeft: 12, color: '#9ca3af', flex: 1 }}>
            Search by vendor or state (GA, NY, FL)...
          </Text>
        </View>

        {/* Available Machines */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>
          Available Vendors (2)
        </Text>
        
        <Pressable style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4
        }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937' }}>
              Lucky Numbers GA
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}