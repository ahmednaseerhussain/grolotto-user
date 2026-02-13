import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTchalaStore } from "../state/tchalaStore";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import { tchalaAPI, getErrorMessage } from "../api/apiClient";

export default function TchalaScreen() {
  const navigation = useNavigation();
  const { searchResults, searchDream, clearSearch } = useTchalaStore();
  const language = useAppStore(s => s.language);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiResults, setApiResults] = useState<any[]>([]);
  
  const t = (key: string) => getTranslation(key as any, language);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Try API first, fall back to local store
      try {
        const data = await tchalaAPI.searchDreams(query, language);
        if (Array.isArray(data)) setApiResults(data);
      } catch {
        // Fall back to local search
        searchDream(query);
        setApiResults([]);
      }
    } else {
      clearSearch();
      setApiResults([]);
    }
  };

  const handleNumberSelect = (numbers: number[]) => {
    Alert.alert(
      "Lucky Numbers",
      `Your lucky numbers are: ${numbers.join(", ")}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Use These Numbers", 
          onPress: () => {
            // Navigate back with selected numbers
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-200">
        <Pressable
          onPress={() => navigation.goBack()}
          className="mr-4"
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-800">{t("tchala")}</Text>
          <Text className="text-gray-600">{t("dreamNumbers")}</Text>
        </View>
        <View className="bg-purple-100 rounded-full p-2">
          <Ionicons name="moon" size={24} color="#7c3aed" />
        </View>
      </View>

      <View className="flex-1">
        {/* Info Section */}
        <View className="bg-purple-50 px-6 py-4">
          <Text className="text-purple-800 font-medium mb-2">
            How it works:
          </Text>
          <Text className="text-purple-700 text-sm leading-5">
            Search for objects, people, or events from your dreams. Tchala will show you the traditional Haitian lucky numbers associated with them.
          </Text>
        </View>

        {/* Search */}
        <View className="px-6 py-4">
          <View className="relative mb-4">
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search your dream... (e.g., wedding, water, snake)"
              className="bg-gray-100 rounded-2xl px-4 py-4 pr-12 text-lg"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View className="absolute right-4 top-4">
              <Ionicons name="search" size={20} color="#9ca3af" />
            </View>
          </View>

          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => handleSearch("")}
              className="flex-row items-center self-start"
            >
              <Ionicons name="close-circle" size={16} color="#6b7280" />
              <Text className="text-gray-600 ml-1">Clear search</Text>
            </Pressable>
          )}
        </View>

        {/* Results */}
        <View className="flex-1 px-6">
          {searchResults.length > 0 ? (
            <>
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Found {searchResults.length} result(s):
              </Text>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.keyword}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleNumberSelect(item.numbers)}
                    className="bg-white border border-gray-200 rounded-2xl p-4 mb-3 shadow-sm"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-800 mb-2 capitalize">
                          {item.keyword}
                        </Text>
                        
                        {item.description && (
                          <Text className="text-gray-600 mb-3">
                            {item.description}
                          </Text>
                        )}
                        
                        <View className="flex-row items-center">
                          <Text className="text-sm text-purple-600 font-medium mr-2">
                            Lucky Numbers:
                          </Text>
                          {item.numbers.map((number, index) => (
                            <View
                              key={index}
                              className="bg-purple-100 rounded-full px-3 py-1 mr-2"
                            >
                              <Text className="text-purple-700 font-bold">
                                {number.toString().padStart(2, "0")}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </View>
                  </Pressable>
                )}
              />
            </>
          ) : searchQuery.length > 0 ? (
            <View className="flex-1 justify-center items-center">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="search" size={32} color="#6b7280" />
              </View>
              <Text className="text-xl font-medium text-gray-800 mb-2">
                No results found
              </Text>
              <Text className="text-gray-600 text-center">
                Try searching for different dream elements like "money", "dog", or "house"
              </Text>
            </View>
          ) : (
            <View className="flex-1 justify-center items-center">
              <View className="bg-purple-100 rounded-full p-6 mb-4">
                <Ionicons name="moon" size={32} color="#7c3aed" />
              </View>
              <Text className="text-xl font-medium text-gray-800 mb-2">
                Welcome to Tchala
              </Text>
              <Text className="text-gray-600 text-center mb-6 px-4">
                Search for elements from your dreams to discover your lucky numbers
              </Text>
              
              <View className="w-full">
                <Text className="text-sm font-medium text-gray-700 mb-3">
                  Popular searches:
                </Text>
                <View className="flex-row flex-wrap">
                  {["wedding", "money", "water", "dog", "house", "snake"].map((keyword) => (
                    <Pressable
                      key={keyword}
                      onPress={() => handleSearch(keyword)}
                      className="bg-gray-100 rounded-full px-4 py-2 mr-2 mb-2"
                    >
                      <Text className="text-gray-700 capitalize">{keyword}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}