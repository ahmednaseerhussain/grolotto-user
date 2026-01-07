import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { 
  createAdvertisement, 
  updateAdvertisement as updateAdInFirebase,
  getAdvertisements
} from "../api/firebase-service";

interface AdEditorProps {
  visible: boolean;
  onClose: () => void;
  adId?: string; // If provided, edit mode; otherwise create mode
}

const AD_TYPES = [
  { value: "slideshow", label: "Slideshow", icon: "images" },
  { value: "banner", label: "Banner", icon: "image" },
  { value: "popup", label: "Popup", icon: "alert-circle" }
];

const PRIORITY_LEVELS = [
  { value: "high", label: "High", color: "#ef4444" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "low", label: "Low", color: "#10b981" }
];

const TARGET_AUDIENCES = [
  { value: "all", label: "All Users" },
  { value: "active_players", label: "Active Players" },
  { value: "new_players", label: "New Players" }
];

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Yellow", value: "#eab308" },
  { name: "Cyan", value: "#06b6d4" }
];

const TEXT_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Light Gray", value: "#e5e7eb" },
  { name: "Dark Gray", value: "#374151" }
];

export default function AdEditor({ visible, onClose, adId }: AdEditorProps) {
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#3b82f6");
  const [textColor, setTextColor] = useState("#ffffff");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [type, setType] = useState<"slideshow" | "banner" | "popup">("slideshow");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [targetAudience, setTargetAudience] = useState<"all" | "active_players" | "new_players">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [order, setOrder] = useState("1");

  // Load existing ad data if in edit mode
  useEffect(() => {
    if (adId && visible) {
      const loadAd = async () => {
        const ads = await getAdvertisements();
        setAdvertisements(ads);
        const ad: any = ads.find((a: any) => a.id === adId);
        if (ad) {
          setTitle(ad.title || "");
          setSubtitle(ad.subtitle || "");
          setContent(ad.content || "");
          setBackgroundColor(ad.backgroundColor || "#3b82f6");
          setTextColor(ad.textColor || "#ffffff");
          setLinkUrl(ad.linkUrl || "");
          setLinkText(ad.linkText || "");
          setType(ad.type || "slideshow");
          setPriority(ad.priority || "medium");
          setTargetAudience(ad.targetAudience || "all");
          setStartDate(ad.startDate ? new Date(ad.startDate).toISOString().split("T")[0] : "");
          setEndDate(ad.endDate ? new Date(ad.endDate).toISOString().split("T")[0] : "");
          setOrder(ad.order?.toString() || "1");
        }
      };
      loadAd();
    } else if (!visible) {
      // Reset form when modal closes
      resetForm();
    }
  }, [adId, visible]);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setContent("");
    setBackgroundColor("#3b82f6");
    setTextColor("#ffffff");
    setLinkUrl("");
    setLinkText("");
    setType("slideshow");
    setPriority("medium");
    setTargetAudience("all");
    setStartDate("");
    setEndDate("");
    setOrder("1");
  };

  const validateForm = () => {
    if (!title.trim()) {
      setErrorMessage("Title is required");
      return false;
    }
    if (!content.trim()) {
      setErrorMessage("Content is required");
      return false;
    }
    if (!startDate) {
      setErrorMessage("Start date is required");
      return false;
    }
    if (!endDate) {
      setErrorMessage("End date is required");
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage("End date must be after start date");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const adData = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        content: content.trim(),
        backgroundColor,
        textColor,
        linkUrl: linkUrl.trim(),
        linkText: linkText.trim(),
        type,
        priority,
        targetAudience,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        order: parseInt(order) || 1,
        status: "active" as const
      };

      if (adId) {
        // Edit mode
        await updateAdInFirebase(adId, adData);
        setSuccessMessage("Advertisement updated successfully!");
      } else {
        // Create mode - generate ID and add required fields
        const newAd = {
          ...adData,
          id: `ad_${Date.now()}`,
          clicks: 0,
          impressions: 0,
          imageUrl: undefined
        };
        await createAdvertisement(newAd);
        setSuccessMessage("Advertisement created successfully!");
      }

      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 1500);
    } catch (error) {
      setErrorMessage("Failed to save advertisement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-slate-900">
        {/* Header */}
        <View className="bg-slate-800 px-4 py-4 border-b border-slate-700 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={onClose} className="mr-4">
              <Ionicons name="close" size={28} color="#e2e8f0" />
            </Pressable>
            <Text className="text-xl font-bold text-slate-100">
              {adId ? "Edit Advertisement" : "Create Advertisement"}
            </Text>
          </View>
          <Pressable onPress={handleSave} className="bg-orange-600 px-6 py-2 rounded-lg">
            <Text className="text-white font-semibold">Save</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Preview Card */}
          <View className="mb-6">
            <Text className="text-slate-300 text-sm font-medium mb-2">Preview</Text>
            <View 
              style={{ backgroundColor }} 
              className="rounded-lg p-6 items-center"
            >
              <Text style={{ color: textColor }} className="text-2xl font-bold text-center mb-2">
                {title || "Ad Title"}
              </Text>
              {subtitle && (
                <Text style={{ color: textColor }} className="text-lg opacity-90 text-center mb-3">
                  {subtitle}
                </Text>
              )}
              <Text style={{ color: textColor }} className="text-base opacity-80 text-center">
                {content || "Ad content will appear here"}
              </Text>
              {linkText && (
                <View className="bg-white mt-4 px-4 py-2 rounded-lg">
                  <Text className="font-semibold">{linkText}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Basic Info */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Basic Information</Text>
            
            <Text className="text-slate-400 text-sm mb-2">Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter ad title (e.g., 🎯 GROLOTO)"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />

            <Text className="text-slate-400 text-sm mb-2">Subtitle</Text>
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Enter subtitle (e.g., Win Big Today!)"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />

            <Text className="text-slate-400 text-sm mb-2">Content *</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Enter ad content/description"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />
          </View>

          {/* Link Settings */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Link (Optional)</Text>
            
            <Text className="text-slate-400 text-sm mb-2">Link URL</Text>
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://example.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />

            <Text className="text-slate-400 text-sm mb-2">Link Button Text</Text>
            <TextInput
              value={linkText}
              onChangeText={setLinkText}
              placeholder="Learn More"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />
          </View>

          {/* Colors */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Colors</Text>
            
            <Text className="text-slate-400 text-sm mb-2">Background Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {PRESET_COLORS.map((color) => (
                <Pressable
                  key={color.value}
                  onPress={() => setBackgroundColor(color.value)}
                  className="mr-3 items-center"
                >
                  <View
                    style={{ backgroundColor: color.value }}
                    className={`w-14 h-14 rounded-lg ${backgroundColor === color.value ? 'border-4 border-white' : ''}`}
                  />
                  <Text className="text-slate-400 text-xs mt-1">{color.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text className="text-slate-400 text-sm mb-2">Text Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {TEXT_COLORS.map((color) => (
                <Pressable
                  key={color.value}
                  onPress={() => setTextColor(color.value)}
                  className="mr-3 items-center"
                >
                  <View
                    style={{ backgroundColor: color.value }}
                    className={`w-14 h-14 rounded-lg border-2 border-slate-600 ${textColor === color.value ? 'border-4 border-orange-500' : ''}`}
                  />
                  <Text className="text-slate-400 text-xs mt-1">{color.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Ad Type */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Advertisement Type</Text>
            <View className="flex-row">
              {AD_TYPES.map((adType) => (
                <Pressable
                  key={adType.value}
                  onPress={() => setType(adType.value as any)}
                  className={`flex-1 mr-2 py-3 rounded-lg items-center ${
                    type === adType.value ? 'bg-orange-600' : 'bg-slate-800'
                  }`}
                >
                  <Ionicons 
                    name={adType.icon as any} 
                    size={24} 
                    color={type === adType.value ? '#ffffff' : '#94a3b8'} 
                  />
                  <Text className={`text-sm mt-1 ${type === adType.value ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    {adType.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Priority Level</Text>
            <View className="flex-row">
              {PRIORITY_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  onPress={() => setPriority(level.value as any)}
                  className={`flex-1 mr-2 py-3 rounded-lg items-center ${
                    priority === level.value ? 'border-2' : 'bg-slate-800'
                  }`}
                  style={priority === level.value ? { borderColor: level.color, backgroundColor: level.color + '20' } : {}}
                >
                  <Text 
                    className="font-semibold"
                    style={{ color: priority === level.value ? level.color : '#94a3b8' }}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Target Audience */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Target Audience</Text>
            {TARGET_AUDIENCES.map((audience) => (
              <Pressable
                key={audience.value}
                onPress={() => setTargetAudience(audience.value as any)}
                className={`flex-row items-center justify-between p-4 mb-2 rounded-lg ${
                  targetAudience === audience.value ? 'bg-orange-600' : 'bg-slate-800'
                }`}
              >
                <Text className={targetAudience === audience.value ? 'text-white font-semibold' : 'text-slate-300'}>
                  {audience.label}
                </Text>
                {targetAudience === audience.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                )}
              </Pressable>
            ))}
          </View>

          {/* Campaign Duration */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Campaign Duration</Text>
            
            <Text className="text-slate-400 text-sm mb-2">Start Date *</Text>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />

            <Text className="text-slate-400 text-sm mb-2">End Date *</Text>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />
          </View>

          {/* Display Order */}
          <View className="mb-6">
            <Text className="text-slate-300 text-lg font-semibold mb-4">Display Order</Text>
            <Text className="text-slate-400 text-sm mb-2">Order (lower numbers appear first)</Text>
            <TextInput
              value={order}
              onChangeText={setOrder}
              placeholder="1"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 mb-4 border border-slate-700"
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row mb-8">
            <Pressable
              onPress={onClose}
              className="flex-1 bg-slate-700 py-4 rounded-lg mr-2"
            >
              <Text className="text-slate-300 text-center font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={loading}
              className={`flex-1 py-4 rounded-lg ml-2 ${loading ? "bg-orange-400" : "bg-orange-600"}`}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-center font-semibold">
                  {adId ? "Update Advertisement" : "Create Advertisement"}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {/* Error Modal */}
        {errorMessage !== "" && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
            <View className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-red-500">
              <View className="items-center mb-4">
                <View className="bg-red-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                  <Ionicons name="alert-circle" size={32} color="#ef4444" />
                </View>
                <Text className="text-xl font-bold text-slate-100 mb-2">Validation Error</Text>
                <Text className="text-slate-400 text-center">{errorMessage}</Text>
              </View>
              <Pressable 
                onPress={() => setErrorMessage("")}
                className="bg-red-600 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-medium">OK</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Success Modal */}
        {successMessage !== "" && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
            <View className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-green-500">
              <View className="items-center">
                <View className="bg-green-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                  <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                </View>
                <Text className="text-xl font-bold text-slate-100 mb-2">Success!</Text>
                <Text className="text-slate-400 text-center">{successMessage}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
