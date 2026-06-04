import { apiClient, setTokens, clearTokens } from "../api-client";
import type { User, AuthTokens } from "@/types";

export const authAPI = {
  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    dateOfBirth?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    operatingCurrency?: "HTG" | "USD";
    acceptedTerms?: boolean;
    verifyByEmail?: boolean;
  }): Promise<{ user: User; requiresEmailVerification?: boolean }> {
    const response = await apiClient.post("/auth/register", data);
    const payload = response.data.data || response.data;
    const accessToken = payload.accessToken || payload.tokens?.accessToken;
    const refreshToken = payload.refreshToken || payload.tokens?.refreshToken;
    if (accessToken) setTokens(accessToken, refreshToken);
    return { user: payload.user, requiresEmailVerification: !!payload.requiresEmailVerification };
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

  async forgotPassword(email: string): Promise<{ message: string; otp?: string }> {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post("/auth/reset-password", { email, otp, newPassword });
    return response.data;
  },

  async verifyEmail(email: string, otp: string): Promise<{ user: User }> {
    const response = await apiClient.post("/auth/verify-email", { email, otp });
    const payload = response.data.data || response.data;
    const accessToken = payload.accessToken || payload.tokens?.accessToken;
    const refreshToken = payload.refreshToken || payload.tokens?.refreshToken;
    if (accessToken) setTokens(accessToken, refreshToken);
    return { user: payload.user };
  },

  async resendVerification(email: string): Promise<{ message: string; otp?: string }> {
    const response = await apiClient.post("/auth/resend-verification", { email });
    return response.data;
  },
};
