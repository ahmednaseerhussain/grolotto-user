import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppStore } from "../state/appStore";

// Import screens
import LanguageCurrencySelector from "../screens/LanguageCurrencySelector";
import LoginEntryScreen from "../screens/LoginEntryScreen";
import PlayerLogin from "../screens/PlayerLogin";
import VendorLogin from "../screens/VendorLogin";
import AdminLogin from "../screens/AdminLogin";
import VendorRegistration from "../screens/VendorRegistration";
import PlayerDashboard from "../screens/PlayerDashboard";
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
import AdminDashboard from "../screens/AdminDashboard";
import AdminPayoutManagement from "../screens/AdminPayoutManagement";
import AdminPayoutProcessing from "../screens/AdminPayoutProcessing";
// Admin screens removed - now handled by AdminNavigator

export type RootStackParamList = {
  LanguageCurrencySelector: undefined;
  LoginEntry: undefined;
  PlayerLogin: undefined;
  VendorLogin: undefined;
  AdminLogin: undefined;
  VendorRegistration: undefined;
  PlayerDashboard: undefined;
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
  ResultsScreen: undefined;
  SettingsScreen: undefined;
  EditProfileScreen: undefined;
  HistoryScreen: undefined;
  PaymentConfirmation: { gamePlay: any };
  PaymentScreen: undefined;
  PaymentProfileScreen: undefined;
  TransactionHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const user = useAppStore(s => s.user);

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {!isAuthenticated ? (
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
              <Stack.Screen name="PlayerDashboard" component={PlayerDashboard} />
              <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
              <Stack.Screen name="NumberSelection" component={NumberSelection} />
              <Stack.Screen name="VendorRating" component={VendorRating} />
              <Stack.Screen name="Tchala" component={TchalaScreen} />
              <Stack.Screen name="AdvertisementSlides" component={AdvertisementSlides} />
              <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
              <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
              <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
              <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
              <Stack.Screen name="PaymentProfileScreen" component={PaymentProfileScreen} />
              <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
            </>
           ) : user?.role === "vendor" ? (
            <>
              <Stack.Screen name="VendorDashboard" component={VendorDashboard} />
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
              
              {/* Player screens accessible to admin */}
              <Stack.Screen name="PlayerDashboard" component={PlayerDashboard} />
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