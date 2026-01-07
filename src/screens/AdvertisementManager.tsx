import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { 
  subscribeToAdvertisements, 
  updateAdvertisement as updateAdInFirebase,
  deleteAdvertisement as deleteAdFromFirebase
} from "../api/firebase-service";
import AdEditor from "./AdEditor";

const adTypes = ["All", "Slideshow", "Banner", "Popup"];
const statusTypes = ["All", "Active", "Paused", "Scheduled", "Expired"];

interface Advertisement {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  priority: string;
  impressions: number;
  clicks: number;
  startDate: any;
  endDate: any;
  linkUrl?: string;
  targetAudience: string;
}

export default function AdvertisementManager() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | undefined>(undefined);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [adToDelete, setAdToDelete] = useState<string | null>(null);

  // Subscribe to real-time Firebase updates
  useEffect(() => {
    const unsubscribe = subscribeToAdvertisements((ads) => {
      setAdvertisements(ads as Advertisement[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredAds = advertisements.filter((ad) => {
    const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ad.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || ad.type === selectedType.toLowerCase();
    const matchesStatus = selectedStatus === "All" || ad.status === selectedStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "paused": return "bg-yellow-500";
      case "scheduled": return "bg-blue-500";
      case "expired": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "slideshow": return "images";
      case "banner": return "image";
      case "popup": return "alert-circle";
      default: return "document";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-gray-400";
    }
  };

  const toggleAdStatus = async (adId: string) => {
    const ad = advertisements.find((a) => a.id === adId);
    if (ad) {
      await updateAdInFirebase(adId, { 
        status: ad.status === "active" ? "paused" : "active" 
      });
    }
  };

  const handleDeleteAd = (adId: string) => {
    setAdToDelete(adId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (adToDelete) {
      await deleteAdFromFirebase(adToDelete);
      setDeleteModalVisible(false);
      setAdToDelete(null);
    }
  };

  const handleCreateAd = () => {
    setEditingAdId(undefined);
    setEditorVisible(true);
  };

  const handleEditAd = (adId: string) => {
    setEditingAdId(adId);
    setEditorVisible(true);
  };

  const handleCloseEditor = () => {
    setEditorVisible(false);
    setEditingAdId(undefined);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-slate-400 mt-4">Loading advertisements...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Advertisement Manager</Text>
        <Pressable onPress={handleCreateAd} className="bg-orange-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Create Ad</Text>
        </Pressable>
      </View>

      {/* Search and Filters */}
      <View className="p-4 bg-slate-800 border-b border-slate-700">
        <View className="flex-row items-center bg-slate-700 rounded-lg px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search advertisements..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-100"
          />
        </View>

        <View className="mb-3">
          <Text className="text-slate-400 text-sm mb-2">Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {adTypes.map((type) => (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full mr-3 ${
                  selectedType === type ? "bg-orange-600" : "bg-slate-700"
                }`}
              >
                <Text className={`font-medium ${
                  selectedType === type ? "text-white" : "text-slate-300"
                }`}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text className="text-slate-400 text-sm mb-2">Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {statusTypes.map((status) => (
              <Pressable
                key={status}
                onPress={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-full mr-3 ${
                  selectedStatus === status ? "bg-orange-600" : "bg-slate-700"
                }`}
              >
                <Text className={`font-medium ${
                  selectedStatus === status ? "text-white" : "text-slate-300"
                }`}>
                  {status}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Ads List */}
      <ScrollView className="flex-1 p-4">
        {filteredAds.map((ad) => (
          <View key={ad.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
            {/* Ad Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View className="bg-orange-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name={getTypeIcon(ad.type) as any} size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-100 font-semibold text-lg">{ad.title}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-slate-400 text-sm capitalize mr-2">{ad.type}</Text>
                    <Text className={`text-xs font-medium capitalize ${getPriorityColor(ad.priority)}`}>
                      {ad.priority} Priority
                    </Text>
                  </View>
                </View>
              </View>
              <View className={`px-3 py-1 rounded-full ${getStatusColor(ad.status)}`}>
                <Text className="text-white text-xs font-medium capitalize">{ad.status}</Text>
              </View>
            </View>

            {/* Ad Content */}
            <Text className="text-slate-300 mb-2">{ad.content}</Text>
            {ad.linkUrl && (
              <Text className="text-blue-400 text-sm mb-4">🔗 {ad.linkUrl}</Text>
            )}

            {/* Stats */}
            <View className="flex-row justify-between mb-4 bg-slate-700 rounded-lg p-3">
              <View className="items-center">
                <Text className="text-slate-400 text-sm">Impressions</Text>
                <Text className="text-slate-100 font-bold text-lg">{ad.impressions.toLocaleString()}</Text>
              </View>
              <View className="items-center">
                <Text className="text-slate-400 text-sm">Clicks</Text>
                <Text className="text-blue-400 font-bold text-lg">{ad.clicks.toLocaleString()}</Text>
              </View>
              <View className="items-center">
                <Text className="text-slate-400 text-sm">CTR</Text>
                <Text className="text-green-400 font-bold text-lg">
                  {((ad.clicks / ad.impressions) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Campaign Details */}
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-slate-400 text-sm mb-1">Start Date</Text>
                <Text className="text-slate-100">{new Date(ad.startDate).toLocaleDateString()}</Text>
              </View>
              <View>
                <Text className="text-slate-400 text-sm mb-1">End Date</Text>
                <Text className="text-slate-100">{new Date(ad.endDate).toLocaleDateString()}</Text>
              </View>
              <View>
                <Text className="text-slate-400 text-sm mb-1">Target</Text>
                <Text className="text-slate-100 capitalize">{ad.targetAudience.replace("_", " ")}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-between">
              <Pressable 
                onPress={() => toggleAdStatus(ad.id)}
                className={`flex-1 py-3 rounded-lg mr-2 ${
                  ad.status === "active" ? "bg-yellow-600" : "bg-green-600"
                }`}
              >
                <Text className="text-white text-center font-medium">
                  {ad.status === "active" ? "Pause" : "Activate"}
                </Text>
              </Pressable>

              <Pressable onPress={() => handleEditAd(ad.id)} className="flex-1 bg-blue-600 py-3 rounded-lg mx-1">
                <Text className="text-white text-center font-medium">Edit</Text>
              </Pressable>
              
              <Pressable 
                className="flex-1 bg-red-600 py-3 rounded-lg ml-2"
                onPress={() => handleDeleteAd(ad.id)}
              >
                <Text className="text-white text-center font-medium">Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {filteredAds.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="megaphone-outline" size={64} color="#64748b" />
            <Text className="text-slate-400 text-lg mt-4">No advertisements found</Text>
            <Text className="text-slate-500 text-center mt-2">
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Ads</Text>
            <Text className="text-slate-100 text-xl font-bold">{advertisements.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active</Text>
            <Text className="text-green-400 text-xl font-bold">
              {advertisements.filter((a) => a.status === "active").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Clicks</Text>
            <Text className="text-blue-400 text-xl font-bold">
              {advertisements.reduce((sum, a) => sum + a.clicks, 0).toLocaleString()}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Avg CTR</Text>
            <Text className="text-orange-400 text-xl font-bold">
              {advertisements.length > 0 
                ? ((advertisements.reduce((sum, a) => sum + (a.impressions > 0 ? (a.clicks / a.impressions) : 0), 0) / advertisements.length) * 100).toFixed(1)
                : "0.0"}%
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between">
          <Pressable className="flex-1 bg-purple-600 py-3 rounded-lg mr-2">
            <Text className="text-white text-center font-medium">Push Notification</Text>
          </Pressable>
          <Pressable className="flex-1 bg-orange-600 py-3 rounded-lg ml-2">
            <Text className="text-white text-center font-medium">Bulk Actions</Text>
          </Pressable>
        </View>
      </View>

      {/* Ad Editor Modal */}
      <AdEditor 
        visible={editorVisible} 
        onClose={handleCloseEditor} 
        adId={editingAdId} 
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
            <View className="items-center mb-4">
              <View className="bg-red-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Ionicons name="trash" size={32} color="#ef4444" />
              </View>
              <Text className="text-xl font-bold text-slate-100 mb-2">Delete Advertisement</Text>
              <Text className="text-slate-400 text-center">
                Are you sure you want to delete this advertisement? This action cannot be undone.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => setDeleteModalVisible(false)}
                className="flex-1 bg-slate-700 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-medium">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={confirmDelete}
                className="flex-1 bg-red-600 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-medium">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}