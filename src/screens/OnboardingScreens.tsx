import React, { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

const { width } = Dimensions.get('window');

interface OnboardingScreensProps {
  onComplete?: () => void;
}

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon?: string;
  image?: any; // For custom images
  bgColor: string;
  iconColor: string;
  features: string[];
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: "Welcome to GROLOTTO",
    subtitle: "Your Gateway to Haitian Lottery",
    description: "Experience the excitement of traditional Haitian lottery games like Senp, Maryaj, and Loto with modern convenience.",
    icon: "trophy",
    // image: require("../../assets/welcome-image.png"), // Uncomment and add your custom image here
    bgColor: "#1e40af",
    iconColor: "#fbbf24",
    features: ["Authentic Haitian Games", "Secure Digital Platform", "Real Prize Winnings"]
  },
  {
    id: 2,
    title: "Multiple Game Types",
    subtitle: "Choose Your Lucky Numbers",
    description: "Play traditional games: Senp (single number), Maryaj (marriage of two numbers), or Loto 3/4/5 digit combinations.",
    icon: "dice",
    // image: require("../../assets/game-types.png"), // Add your custom image here
    bgColor: "#7c3aed",
    iconColor: "#10b981",
    features: ["Senp - Pick 1 Number (0-99)", "Maryaj - Pick 2 Numbers", "Loto - Pick 3, 4, or 5 Digits"]
  },
  {
    id: 3,
    title: "US State Lotteries",
    subtitle: "Play American Draws",
    description: "Access popular US state lottery draws including New York, Georgia, Florida, and more with live results.",
    icon: "flag",
    // image: require("../../assets/us-lotteries.png"), // Add your custom image here
    bgColor: "#dc2626",
    iconColor: "#ffffff",
    features: ["New York Lottery", "Georgia Lottery", "Florida Lottery", "Live Results Updates"]
  },
  {
    id: 4,
    title: "Tchala Dream Dictionary",
    subtitle: "Dreams to Lucky Numbers",
    description: "Use our comprehensive Tchala dictionary to convert your dreams into lucky lottery numbers in Kreyòl, English, French, and Spanish.",
    icon: "book",
    // image: require("../../assets/tchala-dream.png"), // Add your custom image here
    bgColor: "#059669",
    iconColor: "#fde047",
    features: ["Dream Interpretation", "4 Languages Support", "Traditional Tchala System"]
  },
  {
    id: 5,
    title: "Trusted Vendors",
    subtitle: "Play with Confidence",
    description: "Choose from verified local vendors in your area. All vendors are screened and approved for your safety and security.",
    icon: "shield-checkmark",
    // image: require("../../assets/trusted-vendors.png"), // Add your custom image here
    bgColor: "#ea580c",
    iconColor: "#ffffff",
    features: ["Verified Vendors Only", "Local Community Network", "Secure Transactions"]
  },
  {
    id: 6,
    title: "Ready to Win?",
    subtitle: "Start Your Lottery Journey",
    description: "Join thousands of players who trust GROLOTTO for their daily lottery games. Your lucky numbers are waiting!",
    icon: "rocket",
    // image: require("../../assets/ready-to-win.png"), // Add your custom image here
    bgColor: "#be185d",
    iconColor: "#fbbf24",
    features: ["Instant Account Setup", "Multiple Payment Options", "24/7 Customer Support"]
  }
];

export default function OnboardingScreens({ onComplete }: OnboardingScreensProps = {}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showLanguageSetup, setShowLanguageSetup] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const completeOnboarding = useAppStore(s => s.completeOnboarding);
  const setLanguage = useAppStore(s => s.setLanguage);
  const setCurrency = useAppStore(s => s.setCurrency);
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  
  const t = (key: string) => getTranslation(key as any, language);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ht', name: 'Kreyòl', flag: '🇭🇹' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'HTG', name: 'Haitian Gourde', symbol: 'G' }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({ x: nextSlide * width, animated: true });
    } else {
      // Show language/currency setup instead of completing
      setShowLanguageSetup(true);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      const prevSlide = currentSlide - 1;
      setCurrentSlide(prevSlide);
      scrollViewRef.current?.scrollTo({ x: prevSlide * width, animated: true });
    }
  };

  const handleGetStarted = () => {
    console.log("Get Started pressed");
    completeOnboarding();
  };

  const handleSkip = () => {
    console.log("Skip pressed");
    // Show language setup even on skip
    setShowLanguageSetup(true);
  };

  const handleFinishSetup = () => {
    // Complete onboarding after language and currency are set
    completeOnboarding();
    if (onComplete) {
      onComplete();
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const currentSlideData = slides[currentSlide];

  // Show language/currency setup screen
  if (showLanguageSetup) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#1e293b' }]}>
        <ScrollView style={styles.setupContainer}>
          <View style={styles.setupContent}>
            {/* Header */}
            <View style={styles.setupHeader}>
              <Ionicons name="globe-outline" size={60} color="#6366f1" />
              <Text style={styles.setupTitle}>Choose Your Preferences</Text>
              <Text style={styles.setupSubtitle}>Select your language and currency to get started</Text>
            </View>

            {/* Language Selection */}
            <View style={styles.setupSection}>
              <Text style={styles.sectionLabel}>Language</Text>
              <View style={styles.optionsGrid}>
                {languages.map((lang) => (
                  <Pressable
                    key={lang.code}
                    onPress={() => setLanguage(lang.code as any)}
                    style={[
                      styles.optionCard,
                      language === lang.code && styles.optionCardSelected
                    ]}
                  >
                    <Text style={styles.optionFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.optionText,
                      language === lang.code && styles.optionTextSelected
                    ]}>{lang.name}</Text>
                    {language === lang.code && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Currency Selection */}
            <View style={styles.setupSection}>
              <Text style={styles.sectionLabel}>Currency</Text>
              <View style={styles.optionsGrid}>
                {currencies.map((curr) => (
                  <Pressable
                    key={curr.code}
                    onPress={() => setCurrency(curr.code as any)}
                    style={[
                      styles.optionCard,
                      currency === curr.code && styles.optionCardSelected
                    ]}
                  >
                    <Text style={styles.optionSymbol}>{curr.symbol}</Text>
                    <Text style={[
                      styles.optionText,
                      currency === curr.code && styles.optionTextSelected
                    ]}>{curr.name}</Text>
                    <Text style={styles.optionCode}>{curr.code}</Text>
                    {currency === curr.code && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={handleFinishSetup}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentSlideData.bgColor }]}>
      {/* Skip Button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>{t("skip")}</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { backgroundColor: slide.bgColor }]}>
            {/* Main Icon or Image */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                {slide.image ? (
                  <Image source={slide.image} style={styles.slideImage} resizeMode="contain" />
                ) : (
                  <Ionicons name={slide.icon as any} size={80} color={slide.iconColor} />
                )}
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Text style={styles.description}>{slide.description}</Text>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {slide.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.featureBullet}>
                      <Ionicons name="checkmark" size={12} color={slide.iconColor} />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.3)',
                width: index === currentSlide ? 24 : 8,
              }
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentSlide > 0 && (
          <Pressable onPress={handlePrevious} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
        )}
        
        <View style={styles.navSpacer} />
        
        <Pressable 
          onPress={handleNext} 
          style={[styles.nextButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? t("getStarted") : t("next")}
          </Text>
          <Ionicons 
            name={currentSlide === slides.length - 1 ? "rocket" : "chevron-forward"} 
            size={20} 
            color="#ffffff" 
            style={styles.nextButtonIcon}
          />
        </Pressable>
      </View>

      {/* Bottom Wave Effect */}
      <View style={styles.waveContainer} pointerEvents="none">
        <View style={[styles.wave, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[styles.wave2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  setupContainer: {
    flex: 1,
  },
  setupContent: {
    padding: 24,
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 16,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  setupSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  optionCardSelected: {
    backgroundColor: '#1e293b',
    borderColor: '#6366f1',
  },
  optionFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  optionSymbol: {
    fontSize: 32,
    marginRight: 16,
    color: '#f1f5f9',
  },
  optionText: {
    fontSize: 18,
    color: '#cbd5e1',
    flex: 1,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  optionCode: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  selectedBadge: {
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 50,
  },
  headerSpacer: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  slideImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  content: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 300,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 30,
    zIndex: 10,
    position: 'relative',
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSpacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 120,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    right: -50,
    height: 100,
    borderRadius: 50,
    transform: [{ scaleX: 2 }],
  },
  wave2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    right: -30,
    height: 80,
    borderRadius: 40,
    transform: [{ scaleX: 1.5 }],
  },
});