import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Conditionally import PagerView for native platforms only
let PagerView: any = null;
if (Platform.OS !== 'web') {
  try {
    PagerView = require('react-native-pager-view').default;
  } catch (error) {
    console.log('PagerView not available');
  }
}

const slides = [
  {
    title: "Byenveni nan GROLOTTO",
    subtitle: "Welcome to GROLOTTO",
    description: "The premier Haitian lottery platform. Play your favorite numbers and win big with trusted vendors.",
    icon: "ticket" as const,
  },
  {
    title: "Jwe Loto Lakay",
    subtitle: "Play lottery from home",
    description: "Enjoy Haitian lottery games from the comfort of your home. No need to visit physical locations.",
    icon: "home" as const,
  },
  {
    title: "Chwazi Bank ak Vandè ou",
    subtitle: "Choose your favorite bank and vendor",
    description: "Select from trusted vendors and banks in your area for secure transactions.",
    icon: "business" as const,
  },
  {
    title: "Resevwa Lajan Fasil",
    subtitle: "Receive payouts easily",
    description: "Get your winnings through secure digital payment methods directly to your account.",
    icon: "card" as const,
  },
  {
    title: "Tcheke Nimewo Rèv",
    subtitle: "Check dream numbers with Tchala",
    description: "Use our traditional Haitian dream dictionary to find your lucky numbers.",
    icon: "moon" as const,
  },
  {
    title: "Kòmanse Kounye a",
    subtitle: "Get started now",
    description: "Join thousands of players enjoying secure, digital lottery gaming.",
    icon: "rocket" as const,
  },
];

export default function WelcomeSlides() {
  const [currentPage, setCurrentPage] = useState(0);
  const navigation = useNavigation();

  const handleNext = () => {
    if (currentPage === slides.length - 1) {
      navigation.navigate("LanguageCurrencySelector" as never);
    } else {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    navigation.navigate("LanguageCurrencySelector" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-yellow-400 to-green-600">
      <View className="flex-1">
        {/* Skip button */}
        <View className="flex-row justify-end p-4">
          <Pressable onPress={handleSkip}>
            <Text className="text-white font-medium">Skip</Text>
          </Pressable>
        </View>

        {/* PagerView for slides - conditional for platform */}
        {PagerView ? (
          <PagerView
            style={{ flex: 1 }}
            initialPage={0}
            onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
          >
            {slides.map((slide, index) => (
              <View key={index} className="flex-1 justify-center items-center px-8">
                <View className="bg-white/20 rounded-full p-8 mb-8">
                  <Ionicons name={slide.icon} size={64} color="white" />
                </View>
                
                <Text className="text-white text-2xl font-bold text-center mb-2">
                  {slide.title}
                </Text>
                
                <Text className="text-yellow-100 text-lg text-center mb-4">
                  {slide.subtitle}
                </Text>
                
                <Text className="text-green-100 text-base text-center leading-6">
                  {slide.description}
                </Text>
              </View>
            ))}
          </PagerView>
        ) : (
          // Web fallback - show current slide only
          <View className="flex-1 justify-center items-center px-8">
            <View className="bg-white/20 rounded-full p-8 mb-8">
              <Ionicons name={slides[currentPage].icon} size={64} color="white" />
            </View>
            
            <Text className="text-white text-2xl font-bold text-center mb-2">
              {slides[currentPage].title}
            </Text>
            
            <Text className="text-yellow-100 text-lg text-center mb-4">
              {slides[currentPage].subtitle}
            </Text>
            
            <Text className="text-green-100 text-base text-center leading-6">
              {slides[currentPage].description}
            </Text>
          </View>
        )}

        {/* Bottom navigation */}
        <View className="p-6">
          {/* Page indicators */}
          <View className="flex-row justify-center mb-6">
            {slides.map((_, index) => (
              <View
                key={index}
                className={`h-2 w-8 mx-1 rounded-full ${
                  index === currentPage ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </View>

          {/* Next button */}
          <Pressable
            onPress={handleNext}
            className="bg-white rounded-2xl py-4 px-8 mx-4"
          >
            <Text className="text-green-600 text-center font-bold text-lg">
              {currentPage === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}