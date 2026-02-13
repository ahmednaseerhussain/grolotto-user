import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminAPI, getErrorMessage } from "../api/apiClient";

// Conditionally import PagerView for native platforms only
let PagerView: any = null;
if (Platform.OS !== 'web') {
  try {
    PagerView = require('react-native-pager-view').default;
  } catch (error) {
    console.log('PagerView not available');
  }
}

// Lottery results will be fetched from API
interface DrawResult {
  state: string;
  time: string;
  senp?: string;
  maryaj?: string;
  loto3?: string;
  loto4?: string;
  loto5?: string;
}

interface DayResults {
  date: string;
  draws: DrawResult[];
}

export default function AdvertisementSlides() {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(0);
  const [autoSlide, setAutoSlide] = useState(true);
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayResults, setTodayResults] = useState<DayResults>({ date: new Date().toLocaleDateString(), draws: [] });
  const [yesterdayResults, setYesterdayResults] = useState<DayResults>({ date: new Date(Date.now() - 86400000).toLocaleDateString(), draws: [] });

  // Fetch lottery results from API
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { lotteryAPI } = await import('../api/apiClient');
        const data = await lotteryAPI.getLotteryRounds();
        const rounds = Array.isArray(data) ? data : data?.rounds || [];
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        const todayDraws = rounds.filter((r: any) => new Date(r.date).toDateString() === today);
        const yesterdayDraws = rounds.filter((r: any) => new Date(r.date).toDateString() === yesterday);
        
        const mapDraws = (draws: any[]): DrawResult[] => draws.map((r: any) => ({
          state: r.drawState || r.state || '',
          time: r.drawTime || '',
          ...(r.winningNumbers || {}),
        }));
        
        if (todayDraws.length > 0) setTodayResults({ date: new Date().toLocaleDateString(), draws: mapDraws(todayDraws) });
        if (yesterdayDraws.length > 0) setYesterdayResults({ date: new Date(Date.now() - 86400000).toLocaleDateString(), draws: mapDraws(yesterdayDraws) });
      } catch (e) {
        // Results are optional for this screen
      }
    };
    fetchResults();
  }, []);

  // Fetch advertisements from API
  useEffect(() => {
    const fetchAdvertisements = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getAdvertisements();
        const ads = response.data || response;
        const activeAds = (Array.isArray(ads) ? ads : [])
          .filter((ad: any) => ad.status === "active")
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setAdvertisements(activeAds);
      } catch (error) {
        console.error("Failed to load advertisements:", getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchAdvertisements();
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    if (!autoSlide || loading) return;
    
    const totalSlides = 2 + advertisements.length; // 2 results slides + ads
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalSlides);
    }, 4000); // 4 seconds per slide

    return () => clearInterval(interval);
  }, [autoSlide, advertisements.length, loading]);

  // Track impressions when ad is viewed
  const trackImpression = async (adId: string) => {
    try {
      await adminAPI.recordAdImpression(adId);
    } catch (error) {
      console.error("Failed to track impression:", getErrorMessage(error));
    }
  };

  // Track clicks when ad CTA is pressed
  const trackClick = async (adId: string) => {
    try {
      await adminAPI.recordAdClick(adId);
    } catch (error) {
      console.error("Failed to track click:", getErrorMessage(error));
    }
  };

  useEffect(() => {
    // Track impression when slide changes to an ad
    if (currentPage >= 2 && advertisements.length > 0) {
      const adIndex = currentPage - 2;
      if (adIndex < advertisements.length) {
        trackImpression(advertisements[adIndex].id);
      }
    }
  }, [currentPage]);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-slate-400 mt-4">Loading advertisements...</Text>
      </View>
    );
  }

  const slides = [
    // Slide 1: Today's Results
    {
      type: "results",
      content: (
        <View className="flex-1 bg-blue-600 px-6 py-8">
          <View className="items-center mb-8">
            <View className="bg-white/20 rounded-full p-4 mb-4">
              <Ionicons name="trophy" size={48} color="white" />
            </View>
            <Text className="text-white text-3xl font-bold mb-2">Today's Results</Text>
            <Text className="text-blue-200 text-lg">{todayResults.date}</Text>
          </View>

          <View className="space-y-4">
            {todayResults.draws.map((draw, index) => (
              <View key={index} className="bg-white/10 rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white text-xl font-bold">{draw.state}</Text>
                  <Text className="text-blue-200">{draw.time}</Text>
                </View>
                
                <View className="flex-row flex-wrap space-x-2">
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">SENP</Text>
                    <Text className="text-blue-600 font-bold text-lg">{draw.senp}</Text>
                  </View>
                  
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">MARYAJ</Text>
                    <Text className="text-blue-600 font-bold text-lg">{draw.maryaj}</Text>
                  </View>
                  
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">LOTO 3</Text>
                    <Text className="text-blue-600 font-bold text-lg">{draw.loto3}</Text>
                  </View>
                  
                  {draw.loto4 && (
                    <View className="bg-white rounded-lg px-3 py-1 mb-2">
                      <Text className="text-xs text-gray-600 font-medium">LOTO 4</Text>
                      <Text className="text-blue-600 font-bold text-lg">{draw.loto4}</Text>
                    </View>
                  )}
                  
                  {draw.loto5 && (
                    <View className="bg-white rounded-lg px-3 py-1 mb-2">
                      <Text className="text-xs text-gray-600 font-medium">LOTO 5</Text>
                      <Text className="text-blue-600 font-bold text-lg">{draw.loto5}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )
    },

    // Slide 2: Yesterday's Results
    {
      type: "results", 
      content: (
        <View className="flex-1 bg-gray-700 px-6 py-8">
          <View className="items-center mb-8">
            <View className="bg-white/20 rounded-full p-4 mb-4">
              <Ionicons name="time" size={48} color="white" />
            </View>
            <Text className="text-white text-3xl font-bold mb-2">Yesterday's Results</Text>
            <Text className="text-gray-300 text-lg">{yesterdayResults.date}</Text>
          </View>

          <View className="space-y-4">
            {yesterdayResults.draws.map((draw, index) => (
              <View key={index} className="bg-white/10 rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white text-xl font-bold">{draw.state}</Text>
                  <Text className="text-gray-300">{draw.time}</Text>
                </View>
                
                <View className="flex-row flex-wrap space-x-2">
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">SENP</Text>
                    <Text className="text-gray-700 font-bold text-lg">{draw.senp}</Text>
                  </View>
                  
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">MARYAJ</Text>
                    <Text className="text-gray-700 font-bold text-lg">{draw.maryaj}</Text>
                  </View>
                  
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">LOTO 3</Text>
                    <Text className="text-gray-700 font-bold text-lg">{draw.loto3}</Text>
                  </View>
                  
                  <View className="bg-white rounded-lg px-3 py-1 mb-2">
                    <Text className="text-xs text-gray-600 font-medium">LOTO 4</Text>
                    <Text className="text-gray-700 font-bold text-lg">{draw.loto4}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )
    },

    // Slide 3+: Advertisement Slides from Firebase
    ...advertisements.map((ad: any) => ({
      type: "ad",
      content: (
        <View 
          style={{ backgroundColor: ad.backgroundColor || "#3b82f6" }} 
          className="flex-1 px-6 py-8 justify-center"
        >
          <View className="items-center mb-8">
            <View className="bg-white/20 rounded-full p-6 mb-6">
              <Ionicons name="megaphone" size={64} color="white" />
            </View>
            
            <Text className="text-white text-3xl font-bold text-center mb-3">
              {ad.title}
            </Text>
            
            {ad.subtitle && (
              <Text className="text-white/80 text-xl text-center mb-6">
                {ad.subtitle}
              </Text>
            )}
            
            <Text className="text-white/90 text-lg text-center leading-7 mb-8">
              {ad.content}
            </Text>
            
            {ad.linkText && (
              <Pressable 
                className="bg-white rounded-2xl py-4 px-8 shadow-lg"
                onPress={() => trackClick(ad.id)}
              >
                <Text className="font-bold text-lg text-gray-800">
                  {ad.linkText}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )
    }))
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <Pressable
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        
        <View className="items-center">
          <Text className="text-lg font-bold text-yellow-600">
            GROLOTTO
          </Text>
          <Text className="text-lg font-semibold text-gray-800">
            Results & Offers
          </Text>
        </View>
        
        <Pressable
          onPress={() => setAutoSlide(!autoSlide)}
          className={`p-2 rounded-full ${autoSlide ? 'bg-blue-100' : 'bg-gray-100'}`}
        >
          <Ionicons 
            name={autoSlide ? "pause" : "play"} 
            size={20} 
            color={autoSlide ? "#2563eb" : "#6b7280"} 
          />
        </Pressable>
      </View>

      {/* Slides */}
      {PagerView ? (
        <PagerView
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={(e: { nativeEvent: { position: number } }) => setCurrentPage(e.nativeEvent.position)}
        >
          {slides.map((slide, index) => (
            <View key={index}>
              {slide.content}
            </View>
          ))}
        </PagerView>
      ) : (
        /* Web fallback - show current slide only */
        <View style={{ flex: 1 }}>
          {slides[currentPage]?.content}
        </View>
      )}

      {/* Bottom indicators and controls */}
      <View className="bg-white px-6 py-4 border-t border-gray-200">
        {/* Page indicators */}
        <View className="flex-row justify-center mb-4">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 w-8 mx-1 rounded-full ${
                index === currentPage ? "bg-blue-500" : "bg-gray-300"
              }`}
            />
          ))}
        </View>

        {/* Controls */}
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-600 text-sm">
            {currentPage + 1} of {slides.length}
          </Text>
          
          <View className="flex-row space-x-4">
            <Pressable
              onPress={() => setCurrentPage((currentPage - 1 + slides.length) % slides.length)}
              className="bg-gray-100 rounded-full p-2"
            >
              <Ionicons name="chevron-back" size={20} color="#6b7280" />
            </Pressable>
            
            <Pressable
              onPress={() => setCurrentPage((currentPage + 1) % slides.length)}
              className="bg-gray-100 rounded-full p-2"
            >
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}