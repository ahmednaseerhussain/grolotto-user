import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminAPI, getErrorMessage } from "../api/apiClient";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  phone?: string;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-red-600",
  admin: "bg-blue-600",
  moderator: "bg-purple-600",
  support: "bg-green-600",
  vendor: "bg-orange-600",
  player: "bg-cyan-600",
};

const roles = [
  { key: "admin", name: "Admin", color: "bg-blue-600", permissions: "Most Operations" },
  { key: "moderator", name: "Moderator", color: "bg-purple-600", permissions: "Limited Operations" },
  { key: "support", name: "Support", color: "bg-green-600", permissions: "Read-Only + Reports" }
];

export default function AdminUserManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "admins" | "vendors" | "players">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "moderator"
  });

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminAPI.getAllUsers(1, 200);
      const userList = data.users || data.data || data || [];
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const getRoleColor = (role: string) => roleColors[role] || "bg-gray-600";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "suspended": return "bg-red-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const toggleUserStatus = async (user: AdminUser) => {
    if (user.role === "super_admin") return;
    setActionLoading(user.id);
    try {
      if (user.status === "active") {
        await adminAPI.suspendUser(user.id);
      } else {
        await adminAPI.activateUser(user.id);
      }
      // Refresh list after action
      await fetchUsers();
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const addNewUser = () => {
    Alert.alert(
      "Not Available",
      "Admin user creation requires a dedicated admin registration endpoint. Please create admin accounts through the backend directly."
    );
    setShowAddModal(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "admins") return matchesSearch && (user.role === "admin" || user.role === "super_admin");
    if (activeTab === "vendors") return matchesSearch && user.role === "vendor";
    if (activeTab === "players") return matchesSearch && user.role === "player";
    return matchesSearch;
  });

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 mt-4">Loading users...</Text>
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
        <Text className="text-xl font-bold text-slate-100 flex-1">User Management</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        {(["all", "admins", "vendors", "players"] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 ${activeTab === tab ? "border-b-2 border-blue-500" : ""}`}
          >
            <Text className={`text-center text-sm font-medium ${
              activeTab === tab ? "text-blue-400" : "text-slate-400"
            }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View className="p-4 bg-slate-800 border-b border-slate-700">
        <View className="flex-row items-center bg-slate-700 rounded-lg px-4 py-3">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search admin users..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-slate-100"
          />
        </View>
      </View>

      <ScrollView className="flex-1 p-4" refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }>
        {filteredUsers.length === 0 ? (
          <View className="items-center py-16">
            <Ionicons name="people-outline" size={64} color="#475569" />
            <Text className="text-slate-400 text-lg mt-4">No users found</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
              {/* User Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <View className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold text-lg">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-100 font-semibold text-lg">{user.name || "Unnamed"}</Text>
                    <Text className="text-slate-400 text-sm">{user.email}</Text>
                  </View>
                </View>
                <View className={`px-3 py-1 rounded-full ${getStatusColor(user.status)}`}>
                  <Text className="text-white text-xs font-medium capitalize">{user.status}</Text>
                </View>
              </View>

              {/* Role */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-slate-400 text-sm">Role</Text>
                <View className={`px-3 py-1 rounded-full ${getRoleColor(user.role)}`}>
                  <Text className="text-white text-xs font-medium capitalize">
                    {user.role.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {/* Activity Info */}
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-slate-400 text-sm mb-1">Joined</Text>
                  <Text className="text-slate-100 text-sm">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </Text>
                </View>
                {user.phone && (
                  <View>
                    <Text className="text-slate-400 text-sm mb-1">Phone</Text>
                    <Text className="text-slate-100 text-sm">{user.phone}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="flex-row">
                <Pressable 
                  onPress={() => toggleUserStatus(user)}
                  className={`flex-1 py-3 rounded-lg items-center justify-center ${
                    user.status === "active" ? "bg-red-600" : "bg-green-600"
                  }`}
                  disabled={user.role === "super_admin" || actionLoading === user.id}
                >
                  {actionLoading === user.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-center font-medium">
                      {user.status === "active" ? "Suspend" : "Activate"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
            <Pressable onPress={() => setShowAddModal(false)} className="mr-4">
              <Ionicons name="close" size={24} color="#e2e8f0" />
            </Pressable>
            <Text className="text-xl font-bold text-slate-100 flex-1">Add Admin User</Text>
            <Pressable onPress={addNewUser} className="bg-blue-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-medium">Create</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Name *</Text>
              <TextInput
                placeholder="Enter full name"
                placeholderTextColor="#64748b"
                value={newUser.name}
                onChangeText={(text) => setNewUser(prev => ({ ...prev, name: text }))}
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2">Email *</Text>
              <TextInput
                placeholder="Enter email address"
                placeholderTextColor="#64748b"
                value={newUser.email}
                onChangeText={(text) => setNewUser(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                className="bg-slate-800 text-slate-100 px-4 py-3 rounded-lg border border-slate-600"
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-400 text-sm mb-3">Role</Text>
              {roles.map((role) => (
                <Pressable
                  key={role.key}
                  onPress={() => setNewUser(prev => ({ ...prev, role: role.key }))}
                  className={`p-4 rounded-lg mb-3 border ${
                    newUser.role === role.key 
                      ? "border-blue-500 bg-slate-700" 
                      : "border-slate-600 bg-slate-800"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-slate-100 font-semibold">{role.name}</Text>
                      <Text className="text-slate-400 text-sm">{role.permissions}</Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 ${
                      newUser.role === role.key ? "border-blue-500 bg-blue-500" : "border-slate-400"
                    }`}>
                      {newUser.role === role.key && (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="bg-slate-800 rounded-lg p-4 border border-yellow-600/30">
              <Text className="text-yellow-400 font-medium mb-2">Note</Text>
              <Text className="text-slate-400 text-sm">
                Admin account creation requires backend access. Contact a super admin to create new admin accounts.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Stats */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total</Text>
            <Text className="text-slate-100 text-xl font-bold">{users.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active</Text>
            <Text className="text-green-400 text-xl font-bold">
              {users.filter(u => u.status === "active").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Suspended</Text>
            <Text className="text-red-400 text-xl font-bold">
              {users.filter(u => u.status === "suspended").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Vendors</Text>
            <Text className="text-blue-400 text-xl font-bold">
              {users.filter(u => u.role === "vendor").length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}