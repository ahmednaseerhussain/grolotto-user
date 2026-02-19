// ModernAdminLogin is deprecated - redirects to AdminLogin
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ModernAdminLogin() {
  const navigation = useNavigation<any>();
  
  useEffect(() => {
    navigation.replace("AdminLogin");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Redirecting...</Text>
    </View>
  );
}