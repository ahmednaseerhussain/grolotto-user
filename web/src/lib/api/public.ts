import { apiClient } from "../api-client";
import type { Advertisement, AppSettings } from "@/types";

export const publicAPI = {
  async getPublicSettings(): Promise<AppSettings> {
    const response = await apiClient.get("/settings/public");
    return response.data.data || response.data;
  },

  async getActiveAds(): Promise<Advertisement[]> {
    const response = await apiClient.get("/advertisements/active");
    return response.data.data || response.data;
  },

  async recordAdClick(adId: string): Promise<void> {
    await apiClient.post(`/advertisements/${adId}/click`);
  },

  async recordAdImpression(adId: string): Promise<void> {
    await apiClient.post(`/advertisements/${adId}/impression`);
  },
};

export const tchalaAPI = {
  async search(keyword: string): Promise<Array<{ keyword: string; numbers: number[]; description?: string }>> {
    const response = await apiClient.get("/tchala/search", { params: { keyword } });
    return response.data.data || response.data;
  },

  async getAll(): Promise<Array<{ id: string; keyword: string; numbers: number[]; description?: string }>> {
    const response = await apiClient.get("/tchala/all");
    return response.data.data || response.data;
  },
};
