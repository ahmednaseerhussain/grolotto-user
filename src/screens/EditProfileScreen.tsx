import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const user = useAppStore(s => s.user);
  const language = useAppStore(s => s.language);
  const updateUser = useAppStore(s => s.updateUser);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    city: "",
    country: "Haiti",
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const t = (key: string) => getTranslation(key as any, language);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        dateOfBirth: user.dateOfBirth || "",
        address: user.address || "",
        city: user.city || "",
        country: user.country || "Haiti",
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    // Phone validation (optional but if provided should be valid)
    if (formData.phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = "Please enter a valid phone number";
    }
    
    // Date of birth validation (optional but if provided should be valid date)
    if (formData.dateOfBirth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(formData.dateOfBirth)) {
        newErrors.dateOfBirth = "Please enter date in MM/DD/YYYY or YYYY-MM-DD format";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors and try again.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update user in store
      if (user) {
        const updatedUser = {
          ...user,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          country: formData.country.trim(),
          updatedAt: new Date().toISOString(),
        };
        
        updateUser(updatedUser);
        
        Alert.alert(
          "Success", 
          "Your profile has been updated successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
      console.error("Profile update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: any = "default",
    multiline: boolean = false,
    errorKey?: string,
    locked: boolean = false
  ) => (
    <View className="mb-4">
      <View className="flex-row items-center mb-2">
        <Text className="text-gray-700 font-medium">{label}</Text>
        {locked && (
          <View className="ml-2 flex-row items-center">
            <Ionicons name="lock-closed" size={14} color="#ef4444" />
            <Text className="text-xs text-red-500 ml-1">Locked</Text>
          </View>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className={`bg-white border rounded-xl px-4 py-3 text-gray-800 ${
          errors[errorKey || ''] ? 'border-red-500' : 'border-gray-300'
        } ${multiline ? 'h-20' : 'h-12'} ${locked ? 'bg-gray-100' : ''}`}
        placeholderTextColor="#9ca3af"
        editable={!loading && !locked}
      />
      {errors[errorKey || ''] && (
        <Text className="text-red-500 text-sm mt-1">{errors[errorKey || '']}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4"
            disabled={loading}
          >
            <Ionicons name="chevron-back" size={24} color={loading ? "#9ca3af" : "#374151"} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-yellow-600">
              GROLOTTO
            </Text>
            <Text className="text-2xl font-bold text-gray-800">
              Edit Profile
            </Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={loading}
            className={`px-4 py-2 rounded-xl ${
              loading ? 'bg-gray-300' : 'bg-green-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-medium">Save</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Profile Picture Section */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <View className="items-center">
              <View className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-6 mb-4">
                <Ionicons 
                  name={user?.role === "vendor" ? "business" : "person"} 
                  size={40} 
                  color="white" 
                />
              </View>
              <Text className="text-lg font-bold text-gray-800 mb-1">
                {formData.name || "Your Name"}
              </Text>
              <Text className="text-gray-600 capitalize mb-3">
                {user?.role} Account
              </Text>
              <Pressable 
                className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl"
                onPress={() => Alert.alert("Coming Soon", "Profile picture upload will be available in a future update.")}
              >
                <View className="flex-row items-center">
                  <Ionicons name="camera" size={16} color="#3b82f6" />
                  <Text className="text-blue-600 font-medium ml-2">Change Photo</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Personal Information */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Personal Information
            </Text>
            
            {renderInputField(
              "Full Name",
              formData.name,
              (text) => setFormData({...formData, name: text}),
              "Enter your full name",
              "default",
              false,
              "name",
              true  // Locked - cannot be changed
            )}
            
            {/* Warning message for locked name */}
            <View className="flex-row items-start bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 mb-4 -mt-2">
              <Ionicons name="warning" size={16} color="#f59e0b" />
              <Text className="text-yellow-700 text-xs ml-2 flex-1">
                Name cannot be changed for security reasons
              </Text>
            </View>
            
            {renderInputField(
              "Email Address",
              formData.email,
              (text) => setFormData({...formData, email: text}),
              "your.email@example.com",
              "email-address",
              false,
              "email"
            )}
            
            {renderInputField(
              "Phone Number",
              formData.phone,
              (text) => setFormData({...formData, phone: text}),
              "Enter phone number",
              "phone-pad",
              false,
              "phone"
            )}
          </View>

          {/* Address Information */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Address Information
            </Text>
            
            {renderInputField(
              "Street Address",
              formData.address,
              (text) => setFormData({...formData, address: text}),
              "Enter your street address",
              "default",
              true,
              "address"
            )}
            
            {renderInputField(
              "City",
              formData.city,
              (text) => setFormData({...formData, city: text}),
              "Enter your city",
              "default",
              false,
              "city"
            )}
            
            {renderInputField(
              "Country",
              formData.country,
              (text) => setFormData({...formData, country: text}),
              "Enter your country",
              "default",
              false,
              "country"
            )}
          </View>

          {/* Account Information */}
          <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Account Information
            </Text>
            
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-600 font-medium">Account ID:</Text>
                <Text className="text-gray-800 font-mono">{user?.id}</Text>
              </View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-600 font-medium">Account Type:</Text>
                <Text className="text-gray-800 capitalize">{user?.role}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 font-medium">Member Since:</Text>
                <Text className="text-gray-800">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </Text>
              </View>
            </View>
            
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <View className="flex-1 ml-3">
                  <Text className="text-blue-800 font-medium mb-1">
                    Account Security
                  </Text>
                  <Text className="text-blue-700 text-sm">
                    To change your password or update security settings, please contact our support team.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            className={`rounded-2xl py-4 px-6 mb-6 ${
              loading ? 'bg-gray-400' : 'bg-green-500'
            }`}
          >
            <View className="flex-row items-center justify-center">
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark-circle" size={24} color="white" />
              )}
              <Text className="text-white text-center font-bold text-lg ml-2">
                {loading ? "Saving..." : "Save Changes"}
              </Text>
            </View>
          </Pressable>

          {/* Required Fields Note */}
          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="warning" size={20} color="#d97706" />
              <View className="flex-1 ml-3">
                <Text className="text-yellow-800 font-medium mb-1">
                  Required Information
                </Text>
                <Text className="text-yellow-700 text-sm">
                  Fields marked with * are required. Make sure to provide accurate information for account verification.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}