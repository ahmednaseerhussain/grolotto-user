import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { tchalaAPI, getErrorMessage } from "../api/apiClient";

interface DreamEntry {
  id: string;
  kreyol: string;
  english: string;
  french?: string;
  spanish?: string;
  luckyNumbers: number[];
  category: string;
  isActive: boolean;
  addedDate: string;
}

const categories = ["All", "Nature", "Animals", "Objects", "People", "Actions", "Colors", "Numbers"];

export default function TchalaManager() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [dreamEntries, setDreamEntries] = useState<DreamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    kreyol: "",
    english: "",
    french: "",
    spanish: "",
    luckyNumbers: "",
    category: "Nature"
  });

  const fetchDreams = useCallback(async () => {
    try {
      const data = await tchalaAPI.getAllDreams();
      const dreams = data?.dreams || data?.data || data || [];
      if (Array.isArray(dreams)) {
        setDreamEntries(dreams.map((d: any) => ({
          id: d.id || String(Math.random()),
          kreyol: d.kreyol || d.word || "",
          english: d.english || d.translation || "",
          french: d.french || "",
          spanish: d.spanish || "",
          luckyNumbers: d.luckyNumbers || d.numbers || [],
          category: d.category || "Other",
          isActive: d.isActive !== false,
          addedDate: d.addedDate || d.createdAt || "",
        })));
      }
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDreams();
  }, [fetchDreams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDreams();
  };

  const filteredEntries = dreamEntries.filter(entry => {
    const matchesSearch = 
      entry.kreyol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.french?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.spanish?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || entry.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const addNewEntry = () => {
    const numbersArray = newEntry.luckyNumbers
      .split(",")
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (newEntry.kreyol && newEntry.english && numbersArray.length > 0) {
      const entry: DreamEntry = {
        id: Date.now().toString(),
        kreyol: newEntry.kreyol,
        english: newEntry.english,
        french: newEntry.french,
        spanish: newEntry.spanish,
        luckyNumbers: numbersArray,
        category: newEntry.category,
        isActive: true,
        addedDate: new Date().toISOString().split("T")[0]
      };

      setDreamEntries(prev => [entry, ...prev]);
      setNewEntry({ kreyol: "", english: "", french: "", spanish: "", luckyNumbers: "", category: "Nature" });
      setShowAddModal(false);
    }
  };

  const toggleEntryStatus = (entryId: string) => {
    setDreamEntries(prev => prev.map(entry =>
      entry.id === entryId ? { ...entry, isActive: !entry.isActive } : entry
    ));
  };

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Tchala Dream Dictionary</Text>
        <Pressable 
          onPress={() => setShowAddModal(true)}
          className="bg-purple-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">Add Entry</Text>
        </Pressable>
      </View>

      {/* Search and Category Filter */}
      <View className="p-4 bg-slate-800 border-b border-slate-700">
        <View className="flex-row items-center bg-slate-700 rounded-lg px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search dreams in any language..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-100"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full mr-3 ${
                selectedCategory === category ? "bg-purple-600" : "bg-slate-700"
              }`}
            >
              <Text className={`font-medium ${
                selectedCategory === category ? "text-white" : "text-slate-300"
              }`}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Dream Entries */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333ea" />
          <Text className="text-slate-400 mt-4">Loading dream entries...</Text>
        </View>
      ) : (
      <ScrollView className="flex-1 p-4" refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />
      }>
        {filteredEntries.map((entry) => (
          <View key={entry.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
            {/* Entry Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-slate-100 font-semibold text-xl">{entry.kreyol}</Text>
                <Text className="text-slate-400 text-sm">{entry.category}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${
                entry.isActive ? "bg-green-500" : "bg-red-500"
              }`}>
                <Text className="text-white text-xs font-medium">
                  {entry.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            {/* Translations */}
            <View className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-400 text-sm">English:</Text>
                <Text className="text-slate-100 font-medium">{entry.english}</Text>
              </View>
              {entry.french && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-400 text-sm">Français:</Text>
                  <Text className="text-slate-100 font-medium">{entry.french}</Text>
                </View>
              )}
              {entry.spanish && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-400 text-sm">Español:</Text>
                  <Text className="text-slate-100 font-medium">{entry.spanish}</Text>
                </View>
              )}
            </View>

            {/* Lucky Numbers */}
            <View className="bg-slate-700 rounded-lg p-3 mb-4">
              <Text className="text-slate-400 text-sm mb-2">Lucky Numbers</Text>
              <View className="flex-row flex-wrap">
                {entry.luckyNumbers.map((number, index) => (
                  <View key={index} className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center mr-2 mb-2">
                    <Text className="text-white font-bold">{number}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row justify-between">
              <Pressable 
                onPress={() => toggleEntryStatus(entry.id)}
                className={`flex-1 py-3 rounded-lg mr-2 ${
                  entry.isActive ? "bg-red-600" : "bg-green-600"
                }`}
              >
                <Text className="text-white text-center font-medium">
                  {entry.isActive ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>
              
              <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg ml-2">
                <Text className="text-slate-300 text-center font-medium">Edit</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {filteredEntries.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="book-outline" size={64} color="#64748b" />
            <Text className="text-slate-400 text-lg mt-4">No dream entries found</Text>
            <Text className="text-slate-500 text-center mt-2">
              Try adjusting your search or category filter
            </Text>
          </View>
        )}
      </ScrollView>
      )}

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
            <Pressable onPress={() => setShowAddModal(false)} className="mr-4">
              <Ionicons name="close" size={24} color="#e2e8f0" />
            </Pressable>
            <Text className="text-xl font-bold text-slate-100 flex-1">Add Dream Entry</Text>
            <Pressable onPress={addNewEntry} className="bg-purple-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-medium">Save</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Kreyòl * (Required)</Text>
              <TextInput
                placeholder="Dream term in Kreyòl"
                placeholderTextColor="#64748b"
                value={newEntry.kreyol}
                onChangeText={(text) => setNewEntry(prev => ({ ...prev, kreyol: text }))}
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">English * (Required)</Text>
              <TextInput
                placeholder="Dream term in English"
                placeholderTextColor="#64748b"
                value={newEntry.english}
                onChangeText={(text) => setNewEntry(prev => ({ ...prev, english: text }))}
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Français (Optional)</Text>
              <TextInput
                placeholder="Dream term in French"
                placeholderTextColor="#64748b"
                value={newEntry.french}
                onChangeText={(text) => setNewEntry(prev => ({ ...prev, french: text }))}
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Español (Optional)</Text>
              <TextInput
                placeholder="Dream term in Spanish"
                placeholderTextColor="#64748b"
                value={newEntry.spanish}
                onChangeText={(text) => setNewEntry(prev => ({ ...prev, spanish: text }))}
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Lucky Numbers * (Required)</Text>
              <TextInput
                placeholder="e.g., 12, 21, 33"
                placeholderTextColor="#64748b"
                value={newEntry.luckyNumbers}
                onChangeText={(text) => setNewEntry(prev => ({ ...prev, luckyNumbers: text }))}
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
              <Text className="text-slate-500 text-xs mt-1">Separate numbers with commas</Text>
            </View>

            <View className="mb-6">
              <Text className="text-slate-400 text-sm mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.slice(1).map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setNewEntry(prev => ({ ...prev, category }))}
                    className={`px-4 py-3 rounded-lg mr-3 ${
                      newEntry.category === category ? "bg-purple-600" : "bg-slate-700"
                    }`}
                  >
                    <Text className={`font-medium ${
                      newEntry.category === category ? "text-white" : "text-slate-300"
                    }`}>
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Stats */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Entries</Text>
            <Text className="text-slate-100 text-xl font-bold">{dreamEntries.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active</Text>
            <Text className="text-green-400 text-xl font-bold">
              {dreamEntries.filter(e => e.isActive).length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Categories</Text>
            <Text className="text-purple-400 text-xl font-bold">
              {new Set(dreamEntries.map(e => e.category)).size}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}