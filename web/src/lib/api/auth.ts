import { apiClient, setTokens, clearTokens } from "../api-client";
import type { User, AuthTokens } from "@/types";

export const authAPI = {
  async register(data: { email: string; password: string; name: string; role?: string }) {
    const response = await apiClient.post("/auth/register", data);
    const payload = response.data.data || response.data;
    const accessToken = payload.accessToken || payload.tokens?.accessToken;
    const refreshToken = payload.refreshToken || payload.tokens?.refreshToken;
    if (accessToken) setTokens(accessToken, refreshToken);
    return payload.user;
  },

  async login(data: { email: string; password: string }) {
    const response = await apiClient.post("/auth/login", data);
    const payload = response.data.data || response.data;
    const accessToken = payload.accessToken || payload.tokens?.accessToken;
    const refreshToken = payload.refreshToken || payload.tokens?.refreshToken;
    if (accessToken) setTokens(accessToken, refreshToken);
    return payload.user;
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearTokens();
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ data: User }>("/auth/profile");
    return response.data.data || response.data as unknown as User;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<{ data: User }>("/auth/profile", data);
    return response.data.data || response.data as unknown as User;
  },
};
