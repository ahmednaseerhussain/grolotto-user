import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppStore } from "../state/appStore";

// Import admin screens
import AdminLogin from "../screens/AdminLogin";
import AdminDashboard from "../screens/AdminDashboard";
import AdvertisementManager from "../screens/AdvertisementManager";
import PlayerManagement from "../screens/PlayerManagement";
import AdminUserManagement from "../screens/AdminUserManagement";
import DrawGameManagement from "../screens/DrawGameManagement";
import GameSettings from "../screens/GameSettings";
import PaymentManagement from "../screens/PaymentManagement";
import PayoutManagement from "../screens/PayoutManagement";
import ResultPublishing from "../screens/ResultPublishing";
import ReportsAnalytics from "../screens/ReportsAnalytics";

export type AdminStackParamList = {
  AdminLogin: undefined;
  AdminDashboard: undefined;
  AdvertisementManager: undefined;
  PlayerManagement: undefined;
  AdminUserManagement: undefined;
  DrawGameManagement: undefined;
  GameSettings: undefined;
  PaymentManagement: undefined;
  PayoutManagement: undefined;
  ResultPublishing: undefined;
  ReportsAnalytics: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  const user = useAppStore(s => s.user);
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  
  // Check for admin authentication
  const isAdminAuthenticated = isAuthenticated && user?.role === "admin";

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      {!isAdminAuthenticated ? (
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
      ) : (
        <>
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="AdvertisementManager" component={AdvertisementManager} />
          <Stack.Screen name="PlayerManagement" component={PlayerManagement} />
          <Stack.Screen name="AdminUserManagement" component={AdminUserManagement} />
          <Stack.Screen name="DrawGameManagement" component={DrawGameManagement} />
          <Stack.Screen name="GameSettings" component={GameSettings} />
          <Stack.Screen name="PaymentManagement" component={PaymentManagement} />
          <Stack.Screen name="PayoutManagement" component={PayoutManagement} />
          <Stack.Screen name="ResultPublishing" component={ResultPublishing} />
          <Stack.Screen name="ReportsAnalytics" component={ReportsAnalytics} />
        </>
      )}
    </Stack.Navigator>
  );
}