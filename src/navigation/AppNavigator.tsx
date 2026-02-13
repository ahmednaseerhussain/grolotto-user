import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppStore } from "../state/appStore";

// Import screens
import SplashScreen from "../screens/SplashScreen";
import OnboardingScreens from "../screens/OnboardingScreens";
import LanguageCurrencySelector from "../screens/LanguageCurrencySelector";
import LoginEntryScreen from "../screens/LoginEntryScreen";
import PlayerLogin from "../screens/PlayerLogin";
import VendorLogin from "../screens/VendorLogin";
import AdminLogin from "../screens/AdminLogin";
import VendorRegistration from "../screens/VendorRegistration";
import PlayerTabNavigator from "./PlayerTabNavigator";
import VendorTabNavigator from "./VendorTabNavigator";
import VendorDashboard from "../screens/VendorDashboard";
import DrawManagement from "../screens/DrawManagement";
import PricingLimits from "../screens/PricingLimits";
import NumberLimits from "../screens/NumberLimits";
import PayoutManagement from "../screens/PayoutManagement";
import VendorPlayHistory from "../screens/VendorPlayHistory";
import TodayPlayersWinners from "../screens/TodayPlayersWinners";
import TchalaScreen from "../screens/TchalaScreen";
import AdvertisementSlides from "../screens/AdvertisementSlides";
import AdvertisementManager from "../screens/AdvertisementManager";
import ResultsScreen from "../screens/ResultsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import HistoryScreen from "../screens/HistoryScreen";
import NumberSelection from "../screens/NumberSelection";
import VendorProfile from "../screens/VendorProfile";
import VendorRating from "../screens/VendorRating";
import PaymentScreen from "../screens/PaymentScreen";
import PaymentProfileScreen from "../screens/PaymentProfileScreen";
import TransactionHistory from "../screens/TransactionHistory";
import RewardsScreen from "../screens/RewardsScreen";
import AdminDashboard from "../screens/AdminDashboard";
import AdminPayoutManagement from "../screens/AdminPayoutManagement";
import AdminPayoutProcessing from "../screens/AdminPayoutProcessing";
import PlayerManagement from "../screens/PlayerManagement";
import AdminUserManagement from "../screens/AdminUserManagement";
import DrawGameManagement from "../screens/DrawGameManagement";
import GameSettings from "../screens/GameSettings";
import PaymentManagement from "../screens/PaymentManagement";
import ResultPublishing from "../screens/ResultPublishing";
import ReportsAnalytics from "../screens/ReportsAnalytics";
import TchalaManager from "../screens/TchalaManager";

import { authAPI, tokenStorage } from "../api/apiClient";

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LanguageCurrencySelector: undefined;
  LoginEntry: undefined;
  PlayerLogin: undefined;
  VendorLogin: undefined;
  AdminLogin: undefined;
  VendorRegistration: undefined;
  PlayerTabs: undefined;
  VendorTabs: undefined;
  VendorDashboard: undefined;
  DrawManagement: undefined;
  PricingLimits: undefined;
  NumberLimits: undefined;
  PayoutManagement: undefined;
  VendorPlayHistory: undefined;
  VendorProfile: undefined;
  TodayPlayersWinners: undefined;
  NumberSelection: { vendor: any };
  VendorRating: { vendor: any; gamePlay?: any };
  Tchala: undefined;
  AdvertisementSlides: undefined;
  AdvertisementManager: undefined;
  AdminDashboard: undefined;
  AdminPayoutManagement: undefined;
  AdminPayoutProcessing: { payout: any };
  PlayerManagement: undefined;
  AdminUserManagement: undefined;
  DrawGameManagement: undefined;
  GameSettings: undefined;
  PaymentManagement: undefined;
  ResultPublishing: undefined;
  ReportsAnalytics: undefined;
  TchalaManager: undefined;
  ResultsScreen: undefined;
  SettingsScreen: undefined;
  EditProfileScreen: undefined;
  HistoryScreen: undefined;
  PaymentScreen: undefined;
  PaymentProfileScreen: undefined;
  TransactionHistory: undefined;
  RewardsScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [showSplash, setShowSplash] = React.useState(true);
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const hasCompletedOnboarding = useAppStore(s => s.hasCompletedOnboarding);
  const user = useAppStore(s => s.user);

  // On app launch, validate existing session or restore from stored token
  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await tokenStorage.getAccessToken();
        if (token && !isAuthenticated) {
          // Token exists but store says not authenticated — try restoring session
          const profile = await authAPI.getProfile();
          if (profile) {
            useAppStore.getState().setUser(profile);
          }
        } else if (!token && isAuthenticated) {
          // Store says authenticated but no token — force logout
          useAppStore.getState().logout();
        }
      } catch {
        // Token invalid/expired and refresh failed — clear stale state
        await tokenStorage.clearTokens();
        useAppStore.getState().logout();
      }
    };
    restoreSession();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {showSplash ? (
        <Stack.Screen name="Splash">
          {() => <SplashScreen onComplete={handleSplashComplete} />}
        </Stack.Screen>
      ) : !hasCompletedOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreens} />
      ) : !isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="LoginEntry" component={LoginEntryScreen} />
          <Stack.Screen name="LanguageCurrencySelector" component={LanguageCurrencySelector} />
          <Stack.Screen name="PlayerLogin" component={PlayerLogin} />
          <Stack.Screen name="VendorLogin" component={VendorLogin} />
          <Stack.Screen name="AdminLogin" component={AdminLogin} />
          <Stack.Screen name="VendorRegistration" component={VendorRegistration} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          {user?.role === "player" ? (
            <>
              <Stack.Screen name="PlayerTabs" component={PlayerTabNavigator} />
              <Stack.Screen name="NumberSelection" component={NumberSelection} />
              <Stack.Screen name="VendorRating" component={VendorRating} />
              <Stack.Screen name="Tchala" component={TchalaScreen} />
              <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
              <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
              <Stack.Screen name="PaymentProfileScreen" component={PaymentProfileScreen} />
              <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
              <Stack.Screen name="RewardsScreen" component={RewardsScreen} />
              <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
              <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
            </>
           ) : user?.role === "vendor" ? (
            <>
              <Stack.Screen name="VendorTabs" component={VendorTabNavigator} />
              <Stack.Screen name="DrawManagement" component={DrawManagement} />
              <Stack.Screen name="PricingLimits" component={PricingLimits} />
              <Stack.Screen name="NumberLimits" component={NumberLimits} />
              <Stack.Screen name="PayoutManagement" component={PayoutManagement} />
              <Stack.Screen name="VendorPlayHistory" component={VendorPlayHistory} />
              <Stack.Screen name="TodayPlayersWinners" component={TodayPlayersWinners} />
              <Stack.Screen name="VendorProfile" component={VendorProfile} />
              <Stack.Screen name="VendorRating" component={VendorRating} />
              <Stack.Screen name="AdvertisementSlides" component={AdvertisementSlides} />
              <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
              <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
              <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
              <Stack.Screen name="PaymentProfileScreen" component={PaymentProfileScreen} />
              <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
            </>
          ) : user?.role === "admin" ? (
            <>
              {/* Admin screens */}
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="AdminPayoutManagement" component={AdminPayoutManagement} />
              <Stack.Screen name="AdminPayoutProcessing" component={AdminPayoutProcessing} />
              <Stack.Screen name="AdvertisementManager" component={AdvertisementManager} />
              <Stack.Screen name="PlayerManagement" component={PlayerManagement} />
              <Stack.Screen name="AdminUserManagement" component={AdminUserManagement} />
              <Stack.Screen name="DrawGameManagement" component={DrawGameManagement} />
              <Stack.Screen name="GameSettings" component={GameSettings} />
              <Stack.Screen name="PaymentManagement" component={PaymentManagement} />
              <Stack.Screen name="ResultPublishing" component={ResultPublishing} />
              <Stack.Screen name="ReportsAnalytics" component={ReportsAnalytics} />
              <Stack.Screen name="TchalaManager" component={TchalaManager} />
              
              {/* Shared screens accessible to admin */}
              <Stack.Screen name="NumberSelection" component={NumberSelection} />
              <Stack.Screen name="VendorRating" component={VendorRating} />
              <Stack.Screen name="Tchala" component={TchalaScreen} />
              <Stack.Screen name="AdvertisementSlides" component={AdvertisementSlides} />
              <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
              <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
              
              {/* Shared screens */}
              <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
              <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
              <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
              <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
            </>
          ) : null}
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}