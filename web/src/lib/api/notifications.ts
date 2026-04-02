import { apiClient } from "../api-client";
import type { Notification } from "@/types";

export const notificationsAPI = {
  async getNotifications(): Promise<Notification[]> {
    const response = await apiClient.get("/notifications");
    const data = response.data.data || response.data;
    // Backend returns { notifications: [...], total: N } or just an array
    return Array.isArray(data) ? data : data.notifications || [];
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get("/notifications/unread-count");
    return response.data.data?.unreadCount || response.data.unreadCount || response.data.data?.count || response.data.count || 0;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.put("/notifications/read-all");
  },
};
