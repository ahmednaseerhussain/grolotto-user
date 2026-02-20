import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Dimensions, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import PaymentModal from "./PaymentModal";
import { vendorAPI, walletAPI, advertisementAPI, getErrorMessage } from "../api/apiClient";

const { width: screenWidth } = Dimensions.get('window');

const AdvertisingSlideshow = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const advertisements = useAppStore(s => s.advertisements);
  const recordAdImpression = useAppStore(s => s.recordAdImpression);
  const recordAdClick = useAppStore(s => s.recordAdClick);

  // Get active slideshow ads, sorted by order
  const activeAds = advertisements
    .filter(ad => ad.status === "active" && ad.type === "slideshow")
    .sort((a, b) => a.order - b.order);

  // Auto-slide functionality
  useEffect(() => {
    if (activeAds.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide(prevSlide => (prevSlide + 1) % activeAds.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [activeAds.length]);

  // Handle scroll to slide when currentSlide changes
  useEffect(() => {
    if (activeAds.length > 0) {
      scrollViewRef.current?.scrollTo({
        x: currentSlide * (screenWidth - 40),
        animated: true,
      });
    }
  }, [currentSlide, activeAds.length]);

  // Record impression when slide appears (with debounce to prevent infinite loop)
  const recordedImpressions = useRef(new Set<string>());
  
  useEffect(() => {
    if (activeAds[currentSlide] && !recordedImpressions.current.has(activeAds[currentSlide].id)) {
      recordedImpressions.current.add(activeAds[currentSlide].id);
      recordAdImpression(activeAds[currentSlide].id);
    }
  }, [currentSlide, activeAds, recordAdImpression]);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 40));
    setCurrentSlide(slideIndex);
  };

  const handleAdPress = (ad: any) => {
    recordAdClick(ad.id);
    if (ad.linkUrl) {
      Linking.openURL(ad.linkUrl).catch(err => {
        Alert.alert("Error", "Unable to open link");
      });
    }
  };

  if (activeAds.length === 0) {
    // Show a temporary message if no ads are loaded
    return (
      <View style={[styles.advertisingContainer, { backgroundColor: '#3b82f6', padding: 20, borderRadius: 12 }]}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          🎯 GROLOTTO Advertisements
        </Text>
        <Text style={{ color: '#dbeafe', fontSize: 14, textAlign: 'center' }}>
          Loading promotional content...
        </Text>
        <Text style={{ color: '#93c5fd', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Total ads in store: {advertisements.length}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.advertisingContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.slideshowContainer}
      >
        {activeAds.map((ad, index) => (
          <Pressable
            key={ad.id}
            style={[
              styles.advertisingSlide,
              { 
                backgroundColor: ad.backgroundColor, 
                width: screenWidth - 40 
              }
            ]}
            onPress={() => handleAdPress(ad)}
          >
            <View style={styles.slideContent}>
              <Text style={[styles.slideTitle, { color: ad.textColor }]}>
                {ad.title}
              </Text>
              <Text style={[styles.slideSubtitle, { color: ad.textColor }]}>
                {ad.subtitle}
              </Text>
              <Text style={[styles.slideDescription, { color: ad.textColor }]}>
                {ad.content}
              </Text>
              
              {ad.linkUrl && ad.linkText && (
                <View style={[styles.linkButton, { 
                  backgroundColor: ad.textColor === "#ffffff" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
                }]}>
                  <Text style={[styles.linkText, { color: ad.textColor }]}>
                    {ad.linkText}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={ad.textColor} />
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      
      {/* Slide indicators */}
      <View style={styles.indicatorContainer}>
        {activeAds.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              { backgroundColor: currentSlide === index ? "#ffffff" : "rgba(255,255,255,0.5)" }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default function PlayerDashboard() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const vendors = useAppStore(s => s.vendors);
  const logout = useAppStore(s => s.logout);
  const language = useAppStore(s => s.language);
  const currency = useAppStore(s => s.currency);
  const advertisements = useAppStore(s => s.advertisements);
  const recordAdClick = useAppStore(s => s.recordAdClick);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBalance, setShowBalance] = useState(true); // Hide/Show balance functionality
  
  const t = (key: string) => getTranslation(key as any, language);

  // Fetch real data from backend on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorData, walletData] = await Promise.all([
          vendorAPI.getActiveVendors(),
          walletAPI.getWallet(),
        ]);
        if (vendorData) useAppStore.getState().setVendors(vendorData);
        if (walletData && user) {
          // Use balanceHtg or balanceUsd from the wallet API based on selected currency
          const balance = currency === 'HTG' ? walletData.balanceHtg : walletData.balanceUsd;
          useAppStore.getState().updateUser({ ...user, balance: balance || 0 });
        }
      } catch (e) {
        // silently fail; user can pull-to-refresh
        console.warn('PlayerDashboard fetch error:', getErrorMessage(e));
      }
      try {
        const adsData = await advertisementAPI.getActiveAds();
        if (Array.isArray(adsData)) {
          useAppStore.getState().resetAdvertisements();
          adsData.forEach((ad: any) => useAppStore.getState().addAdvertisement(ad));
        }
      } catch { /* ads are optional */ }
    };
    fetchData();
  }, []);
  
  // Filter active vendors
  const activeVendors = vendors.filter(v => v.status === "approved" && v.isActive);
  
  // Filter vendors based on search
  const filteredVendors = activeVendors.filter(vendor => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (vendor.displayName?.toLowerCase().includes(searchLower)) ||
      (vendor.firstName?.toLowerCase().includes(searchLower)) ||
      (vendor.lastName?.toLowerCase().includes(searchLower)) ||
      // Search by states - get enabled draws
      Object.entries(vendor.draws).some(([state, settings]: [string, any]) => 
        settings.enabled && state.toLowerCase().includes(searchLower)
      )
    );
  });

  const handleVendorSelect = (vendor: any) => {
    (navigation as any).navigate("NumberSelection", { vendor });
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
          onPress: async () => { await (await import('../api/apiClient')).authAPI.logout(); logout(); }
        }
      ]
    );
  };

  const getEnabledGames = (vendor: any) => {
    const games: string[] = [];
    Object.entries(vendor.draws).forEach(([state, settings]: [string, any]) => {
      if (settings.enabled) {
        Object.entries(settings.games).forEach(([gameType, gameSettings]: [string, any]) => {
          if (gameSettings.enabled && !games.includes(gameType.toUpperCase())) {
            games.push(gameType.toUpperCase());
          }
        });
      }
    });
    return games;
  };

  const getVendorStates = (vendor: any) => {
    return Object.entries(vendor.draws)
      .filter(([, settings]: [string, any]) => settings.enabled)
      .map(([state]) => state)
      .join(", ");
  };

  const getGameTypeColor = (gameType: string) => {
    const colors: Record<string, string> = {
      SENP: "#3b82f6",
      MARYAJ: "#10b981", 
      LOTO3: "#f59e0b",
      LOTO4: "#8b5cf6",
      LOTO5: "#ef4444",
    };
    return colors[gameType] || "#6b7280";
  };

  const getGameTypeRange = (vendor: any, gameType: string) => {
    // Find the first enabled draw with this game type to get pricing
    for (const [, settings] of Object.entries(vendor.draws) as [string, any][]) {
      if (settings.enabled && settings.games[gameType.toLowerCase()]?.enabled) {
        const game = settings.games[gameType.toLowerCase()];
        return `G${game.minAmount}-${game.maxAmount}`;
      }
    }
    return "";
  };

  const getVendorPriceRange = (vendor: any) => {
    let minPrice = Infinity;
    let maxPrice = 0;
    
    Object.entries(vendor.draws).forEach(([, settings]: [string, any]) => {
      if (settings.enabled) {
        Object.entries(settings.games).forEach(([, gameSettings]: [string, any]) => {
          if (gameSettings.enabled) {
            minPrice = Math.min(minPrice, gameSettings.minAmount);
            maxPrice = Math.max(maxPrice, gameSettings.maxAmount);
          }
        });
      }
    });
    
    return minPrice === Infinity ? "G0-0" : `G${minPrice}-${maxPrice}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandText}>GROLOTTO</Text>
          <Text style={styles.welcomeText}>{t("welcome")}, {user?.name || t("player")}</Text>
          <Text style={styles.subText}>{t("readyToPlay")}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable 
            style={styles.headerButton}
            onPress={() => (navigation as any).navigate("EditProfileScreen")}
          >
            <Ionicons name="person-outline" size={24} color="#6b7280" />
          </Pressable>
          <Pressable style={styles.headerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Layout Order: 1.Slideshow 2.Balance 3.QuickActions 4.Banner */}
        {/* Advertising Slideshow */}
        <AdvertisingSlideshow />

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.balanceAmount}>
                  {showBalance 
                    ? `${currency === "USD" ? "$" : "G"}${(user?.balance || 0).toFixed(2)}`
                    : "••••••"
                  }
                </Text>
                <Pressable 
                  onPress={() => setShowBalance(!showBalance)}
                  style={{ padding: 8, marginLeft: 8 }}
                >
                  <Ionicons 
                    name={showBalance ? "eye" : "eye-off"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontStyle: 'italic' }}>
                {showBalance ? "Tap eye to hide balance" : "Tap eye to show balance"}
              </Text>
            </View>
            <Pressable 
              style={styles.addFundsButton}
              onPress={() => setShowPaymentModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#ffffff" />
              <Text style={styles.addFundsText}>Add Funds</Text>
            </Pressable>
          </View>
          <Pressable 
            style={styles.viewTransactionsButton}
            onPress={() => (navigation as any).navigate("TransactionHistory")}
          >
            <Text style={styles.viewTransactionsText}>View Transaction History</Text>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable 
            style={[styles.actionCard, { backgroundColor: "#3b82f6" }]}
            onPress={() => (navigation as any).navigate("PaymentScreen")}
          >
            <Ionicons name="wallet" size={32} color="#ffffff" />
            <Text style={styles.actionTitle}>Wallet</Text>
            <Text style={styles.actionSubtitle}>Add Funds</Text>
          </Pressable>

          <Pressable 
            style={[styles.actionCard, { backgroundColor: "#f59e0b" }]}
            onPress={() => (navigation as any).navigate("Tchala")}
          >
            <Ionicons name="moon" size={32} color="#ffffff" />
            <Text style={styles.actionTitle}>{t("tchala")}</Text>
            <Text style={styles.actionSubtitle}>{t("dreamNumbers")}</Text>
          </Pressable>

          <Pressable 
            style={[styles.actionCard, { backgroundColor: "#10b981" }]}
            onPress={() => (navigation as any).navigate("ResultsScreen")}
          >
            <Ionicons name="document-text" size={32} color="#ffffff" />
            <Text style={styles.actionTitle}>{t("results")}</Text>
            <Text style={styles.actionSubtitle}>{t("offers")}</Text>
          </Pressable>

          <Pressable 
            style={[styles.actionCard, { backgroundColor: "#8b5cf6" }]}
            onPress={() => (navigation as any).navigate("HistoryScreen")}
          >
            <Ionicons name="time" size={32} color="#ffffff" />
            <Text style={styles.actionTitle}>{t("history")}</Text>
            <Text style={styles.actionSubtitle}>{t("pastPlays")}</Text>
          </Pressable>
        </View>

        {/* Dynamic Banner Ads from Firebase */}
        {(() => {
          const bannerAds = advertisements
            .filter((ad: any) => ad.status === "active" && ad.type === "banner" && (ad.targetAudience === "all" || ad.targetAudience === "active_players" || ad.targetAudience === "new_players"))
            .sort((a: any, b: any) => a.order - b.order);
          
          if (bannerAds.length > 0) {
            const bannerAd = bannerAds[0]; // Show first active banner
            return (
              <View style={styles.bannerCard}>
                <View style={styles.bannerContent}>
                  <View style={styles.bannerIcon}>
                    <Ionicons name="megaphone" size={32} color="#f59e0b" />
                  </View>
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>{bannerAd.title}</Text>
                    <Text style={styles.bannerSubtitle}>{bannerAd.content}</Text>
                  </View>
                </View>
                <Pressable 
                  style={styles.bannerButton}
                  onPress={() => {
                    recordAdClick(bannerAd.id);
                    if (bannerAd.linkUrl) {
                      Linking.openURL(bannerAd.linkUrl);
                    }
                  }}
                >
                  <Text style={styles.bannerButtonText}>Learn More</Text>
                </Pressable>
              </View>
            );
          }
          
          // Fallback: Rewards banner if no Firebase banner ads
          return (
            <View style={styles.bannerCard}>
              <View style={styles.bannerContent}>
                <View style={styles.bannerIcon}>
                  <Ionicons name="gift" size={32} color="#f59e0b" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>🎁 {t("rewards")}</Text>
                  <Text style={styles.bannerSubtitle}>{t("checkRewards") || "Check your available rewards and bonuses"}</Text>
                </View>
              </View>
              <Pressable 
                style={styles.bannerButton}
                onPress={() => (navigation as any).navigate("RewardsScreen")}
              >
                <Text style={styles.bannerButtonText}>{t("viewRewards") || "View Rewards"}</Text>
              </Pressable>
            </View>
          );
        })()}

        {/* Find Vendors Section */}
        <View style={styles.vendorsSection}>
          <Text style={styles.sectionTitle}>{t("findVendors")}</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t("searchVendorOrState")}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          </View>

          {/* Vendors List */}
          <Text style={styles.vendorsCount}>{t("availableVendors")} ({filteredVendors.length})</Text>
          
          {filteredVendors.map((vendor) => {
            const enabledGames = getEnabledGames(vendor);
            const states = getVendorStates(vendor);
            
            return (
              <Pressable
                key={vendor.id}
                style={styles.vendorCard}
                onPress={() => handleVendorSelect(vendor)}
              >
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>
                      {vendor.displayName || `${vendor.firstName} ${vendor.lastName}`}
                    </Text>
                    <View style={styles.vendorRating}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={styles.ratingText}>{vendor.rating.toFixed(1)}</Text>
                      <Text style={styles.statusText}>{t("active")}</Text>
                    </View>
                    <View style={styles.vendorLocation}>
                      <Ionicons name="location" size={14} color="#6b7280" />
                      <Text style={styles.locationText}>{t("states")}: {states}</Text>
                    </View>
                    <View style={styles.vendorPricing}>
                      <Ionicons name="cash" size={14} color="#10b981" />
                      <Text style={styles.pricingText}>{t("betRange")}: {getVendorPriceRange(vendor)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>

                {/* Game Type Chips */}
                <View style={styles.gameChips}>
                  {enabledGames.map((gameType) => (
                    <View
                      key={gameType}
                      style={[styles.gameChip, { backgroundColor: getGameTypeColor(gameType) }]}
                    >
                      <Text style={styles.gameChipText}>
                        {gameType}: {getGameTypeRange(vendor, gameType)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Vendor Actions */}
                <View style={styles.vendorActions}>
                  <Pressable 
                    style={styles.viewProfileButton}
                    onPress={() => (navigation as any).navigate("VendorRating", { vendor })}
                  >
                    <Ionicons name="person-outline" size={16} color="#f97316" />
                    <Text style={styles.viewProfileButtonText}>{t("viewProfile")}</Text>
                  </Pressable>
                  <Text style={styles.reviewsHint}>
                    {vendor.rating.toFixed(1)} ⭐ • {t("tapToRate")}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {filteredVendors.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>{t("noVendorsFound")}</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search criteria
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal 
        visible={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
      />
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  brandText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f59e0b",
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  subText: {
    fontSize: 14,
    color: "#6b7280",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionCard: {
    width: (screenWidth - 52) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  // Advertising Slideshow Styles
  advertisingContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    height: 200, // Much larger than before
  },
  slideshowContainer: {
    borderRadius: 20,
  },
  advertisingSlide: {
    borderRadius: 20,
    padding: 24,
    justifyContent: "center",
    alignItems: "flex-start",
    height: 180,
    marginRight: 0,
  },
  slideContent: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  slideDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
    flex: 1,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  vendorsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  searchContainer: {
    position: "relative",
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48,
    fontSize: 16,
    color: "#1f2937",
  },
  searchIcon: {
    position: "absolute",
    right: 16,
    top: 17,
  },
  vendorsCount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  vendorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  vendorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  vendorRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f59e0b",
    marginLeft: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
  },
  vendorLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  vendorPricing: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pricingText: {
    fontSize: 14,
    color: "#10b981",
    marginLeft: 4,
    fontWeight: "600",
  },
  gameChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gameChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
  },
  vendorActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  viewProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewProfileButtonText: {
    fontSize: 12,
    color: "#f97316",
    fontWeight: "500",
    marginLeft: 4,
  },
  reviewsHint: {
    fontSize: 11,
    color: "#9ca3af",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
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
  },
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
  },
  addFundsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addFundsText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  viewTransactionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  viewTransactionsText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
    marginRight: 4,
  },
  bannerCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#fbbf24",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bannerIcon: {
    width: 56,
    height: 56,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "#78350f",
  },
  bannerButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  bannerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});