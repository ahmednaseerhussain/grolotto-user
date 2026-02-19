import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { authAPI, getErrorMessage } from "../api/apiClient";

export default function VendorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation();
  const setUser = useAppStore(s => s.setUser);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    
    try {
      const data = await authAPI.login(email, password);
      if (data.user.role !== 'vendor') {
        await authAPI.logout();
        Alert.alert("Error", "This login is for vendors only.");
        return;
      }
      setUser(data.user);
    } catch (error) {
      Alert.alert("Invalid Credentials", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEntry = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBackToEntry} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#059669" />
        </Pressable>
        <Text style={styles.headerTitle}>Vendor Login</Text>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="business" size={48} color="#059669" />
        </View>
        <Text style={styles.title}>Vendor Portal</Text>
        <Text style={styles.subtitle}>Access your vendor dashboard</Text>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Vendor Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { paddingRight: 50 }]}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={showPassword ? "eye" : "eye-off"} 
              size={20} 
              color="#6b7280" 
            />
          </Pressable>
        </View>

        <Pressable 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "Signing In..." : "Access Dashboard"}
          </Text>
        </Pressable>
      </View>

      {/* Footer Links */}
      <View style={styles.footer}>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkText}>Need Help?</Text>
        </Pressable>
        
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Want to become a vendor? </Text>
          <Pressable onPress={() => navigation.navigate("VendorRegistration" as never)}>
            <Text style={styles.signupLink}>Apply Now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoIcon: {
    backgroundColor: '#d1fae5',
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  demoContainer: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#14532d',
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#6b7280',
    fontSize: 16,
  },
  signupLink: {
    color: '#059669',
    fontSize: 16,
    fontWeight: 'bold',
  },
});