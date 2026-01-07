import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "moderator" | "support";
  status: "active" | "suspended" | "pending";
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  avatar?: string;
}

interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

const mockAdminUsers: AdminUser[] = [
  {
    id: "1",
    username: "superadmin",
    email: "admin@groloto.com",
    role: "super_admin",
    status: "active",
    lastLogin: "2024-03-15 14:30",
    createdAt: "2024-01-01",
    permissions: ["all"]
  },
  {
    id: "2",
    username: "admin_jean",
    email: "jean.admin@groloto.com",
    role: "admin",
    status: "active",
    lastLogin: "2024-03-15 12:15",
    createdAt: "2024-01-15",
    permissions: ["players", "vendors", "games", "results", "payments"]
  },
  {
    id: "3",
    username: "mod_marie",
    email: "marie.mod@groloto.com",
    role: "moderator",
    status: "active",
    lastLogin: "2024-03-14 18:45",
    createdAt: "2024-02-01",
    permissions: ["players", "results", "reports"]
  },
  {
    id: "4",
    username: "support_pierre",
    email: "pierre.support@groloto.com",
    role: "support",
    status: "suspended",
    lastLogin: "2024-03-10 09:20",
    createdAt: "2024-02-15",
    permissions: ["players", "reports"]
  }
];

const mockActivityLogs: ActivityLog[] = [
  {
    id: "1",
    adminId: "1",
    adminName: "superadmin",
    action: "User Login",
    details: "Successful admin login",
    timestamp: "2024-03-15 14:30:12",
    ipAddress: "192.168.1.100"
  },
  {
    id: "2",
    adminId: "2",
    adminName: "admin_jean",
    action: "Player Suspended",
    details: "Suspended player ID: 12345 for suspicious activity",
    timestamp: "2024-03-15 12:15:34",
    ipAddress: "192.168.1.101"
  },
  {
    id: "3",
    adminId: "3",
    adminName: "mod_marie",
    action: "Results Published",
    details: "Published Senp results for 2024-03-14",
    timestamp: "2024-03-14 18:45:22",
    ipAddress: "192.168.1.102"
  }
];

const roles = [
  { key: "super_admin", name: "Super Admin", color: "bg-red-600", permissions: "All Permissions" },
  { key: "admin", name: "Admin", color: "bg-blue-600", permissions: "Most Operations" },
  { key: "moderator", name: "Moderator", color: "bg-purple-600", permissions: "Limited Operations" },
  { key: "support", name: "Support", color: "bg-green-600", permissions: "Read-Only + Reports" }
];

export default function AdminUserManagement() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [activityLogs] = useState<ActivityLog[]>(mockActivityLogs);
  const [activeTab, setActiveTab] = useState<"users" | "activity">("users");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    role: "moderator" as AdminUser["role"]
  });

  const getRoleColor = (role: AdminUser["role"]) => {
    const roleData = roles.find(r => r.key === role);
    return roleData?.color || "bg-gray-600";
  };

  const getStatusColor = (status: AdminUser["status"]) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "suspended": return "bg-red-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const toggleUserStatus = (userId: string) => {
    setAdminUsers(prev => prev.map(user =>
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "suspended" : "active" as const }
        : user
    ));
  };

  const addNewUser = () => {
    if (newUser.username && newUser.email) {
      const user: AdminUser = {
        id: Date.now().toString(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: "pending",
        lastLogin: "Never",
        createdAt: new Date().toISOString().split("T")[0],
        permissions: ["players", "reports"]
      };

      setAdminUsers(prev => [user, ...prev]);
      setNewUser({ username: "", email: "", role: "moderator" });
      setShowAddModal(false);
    }
  };

  const filteredUsers = adminUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-slate-800 border-b border-slate-700">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-100 flex-1">Admin User Management</Text>
        {activeTab === "users" && (
          <Pressable 
            onPress={() => setShowAddModal(true)}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Add Admin</Text>
          </Pressable>
        )}
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-slate-800 border-b border-slate-700">
        <Pressable
          onPress={() => setActiveTab("users")}
          className={`flex-1 py-4 ${activeTab === "users" ? "border-b-2 border-blue-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "users" ? "text-blue-400" : "text-slate-400"
          }`}>
            Admin Users ({adminUsers.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("activity")}
          className={`flex-1 py-4 ${activeTab === "activity" ? "border-b-2 border-blue-500" : ""}`}
        >
          <Text className={`text-center font-medium ${
            activeTab === "activity" ? "text-blue-400" : "text-slate-400"
          }`}>
            Activity Log ({activityLogs.length})
          </Text>
        </Pressable>
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

      <ScrollView className="flex-1 p-4">
        {activeTab === "users" ? (
          <View>
            {filteredUsers.map((user) => (
              <View key={user.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                {/* User Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center mr-3">
                      <Text className="text-white font-bold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-semibold text-lg">{user.username}</Text>
                      <Text className="text-slate-400 text-sm">{user.email}</Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(user.status)}`}>
                    <Text className="text-white text-xs font-medium capitalize">{user.status}</Text>
                  </View>
                </View>

                {/* Role and Permissions */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-slate-400 text-sm">Role</Text>
                    <View className={`px-3 py-1 rounded-full ${getRoleColor(user.role)}`}>
                      <Text className="text-white text-xs font-medium capitalize">
                        {user.role.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="bg-slate-700 rounded-lg p-3">
                    <Text className="text-slate-400 text-sm mb-2">Permissions</Text>
                    <View className="flex-row flex-wrap">
                      {user.permissions.map((permission, index) => (
                        <View key={index} className="bg-slate-600 px-2 py-1 rounded-full mr-2 mb-1">
                          <Text className="text-slate-300 text-xs capitalize">{permission}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Activity Info */}
                <View className="flex-row justify-between mb-4">
                  <View>
                    <Text className="text-slate-400 text-sm mb-1">Last Login</Text>
                    <Text className="text-slate-100">{user.lastLogin}</Text>
                  </View>
                  <View>
                    <Text className="text-slate-400 text-sm mb-1">Created</Text>
                    <Text className="text-slate-100">{user.createdAt}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row justify-between">
                  <Pressable 
                    onPress={() => toggleUserStatus(user.id)}
                    className={`flex-1 py-3 rounded-lg mr-2 ${
                      user.status === "active" ? "bg-red-600" : "bg-green-600"
                    }`}
                    disabled={user.role === "super_admin"}
                  >
                    <Text className="text-white text-center font-medium">
                      {user.status === "active" ? "Suspend" : "Activate"}
                    </Text>
                  </Pressable>

                  <Pressable className="flex-1 bg-slate-700 py-3 rounded-lg mx-1">
                    <Text className="text-slate-300 text-center font-medium">Edit Permissions</Text>
                  </Pressable>
                  
                  <Pressable className="flex-1 bg-blue-600 py-3 rounded-lg ml-2">
                    <Text className="text-white text-center font-medium">View Activity</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <Text className="text-slate-100 text-lg font-semibold mb-4">Recent Admin Activity</Text>
            {activityLogs.map((log) => (
              <View key={log.id} className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-slate-100 font-semibold">{log.action}</Text>
                  <Text className="text-slate-400 text-sm">{log.timestamp}</Text>
                </View>
                
                <Text className="text-slate-300 mb-3">{log.details}</Text>
                
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <View className="bg-blue-600 w-8 h-8 rounded-full items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">
                        {log.adminName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-sm">{log.adminName}</Text>
                  </View>
                  <Text className="text-slate-500 text-sm">{log.ipAddress}</Text>
                </View>
              </View>
            ))}
          </View>
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
              <Text className="text-slate-400 text-sm mb-2">Username *</Text>
              <TextInput
                placeholder="Enter username"
                placeholderTextColor="#64748b"
                value={newUser.username}
                onChangeText={(text) => setNewUser(prev => ({ ...prev, username: text }))}
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
              {roles.slice(1).map((role) => (
                <Pressable
                  key={role.key}
                  onPress={() => setNewUser(prev => ({ ...prev, role: role.key as AdminUser["role"] }))}
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
          </ScrollView>
        </View>
      </Modal>

      {/* Stats */}
      <View className="bg-slate-800 p-4 border-t border-slate-700">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Total Admins</Text>
            <Text className="text-slate-100 text-xl font-bold">{adminUsers.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Active</Text>
            <Text className="text-green-400 text-xl font-bold">
              {adminUsers.filter(u => u.status === "active").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Suspended</Text>
            <Text className="text-red-400 text-xl font-bold">
              {adminUsers.filter(u => u.status === "suspended").length}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-400 text-sm">Recent Actions</Text>
            <Text className="text-blue-400 text-xl font-bold">{activityLogs.length}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}