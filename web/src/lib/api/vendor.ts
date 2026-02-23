import { apiClient } from "../api-client";
import type { Vendor, VendorStats, DrawConfig, NumberLimit, LotteryRound, LotteryTicket, Payout, VendorReview } from "@/types";

export const vendorAPI = {
  // Public
  async getVendors(): Promise<Vendor[]> {
    const response = await apiClient.get("/vendors");
    return response.data.data || response.data;
  },

  async getVendorById(id: string): Promise<Vendor> {
    const response = await apiClient.get(`/vendors/${id}`);
    return response.data.data || response.data;
  },

  async getVendorReviews(vendorId: string): Promise<VendorReview[]> {
    const response = await apiClient.get(`/vendors/${vendorId}/reviews`);
    return response.data.data || response.data;
  },

  // Vendor auth required
  async getMyProfile(): Promise<Vendor> {
    const response = await apiClient.get("/vendors/me");
    return response.data.data || response.data;
  },

  async getMyStats(): Promise<VendorStats> {
    const response = await apiClient.get("/vendors/me/stats");
    return response.data.data || response.data;
  },

  async getMyHistory(params?: { page?: number; limit?: number; drawState?: string; gameType?: string; status?: string; startDate?: string; endDate?: string }): Promise<{ tickets: LotteryTicket[]; total: number }> {
    const response = await apiClient.get("/vendors/me/history", { params });
    return response.data.data || response.data;
  },

  async register(data: { firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; businessName?: string; password: string }): Promise<Vendor> {
    const response = await apiClient.post("/vendors/register", data);
    return response.data.data || response.data;
  },

  async updateDrawSettings(drawState: string, settings: Partial<DrawConfig>): Promise<DrawConfig> {
    const response = await apiClient.put(`/vendors/draws/${drawState}`, settings);
    return response.data.data || response.data;
  },

  // Number limits
  async getNumberLimits(): Promise<NumberLimit[]> {
    const response = await apiClient.get("/vendors/me/number-limits");
    return response.data.data || response.data;
  },

  async createNumberLimit(data: Partial<NumberLimit>): Promise<NumberLimit> {
    const response = await apiClient.post("/vendors/me/number-limits", data);
    return response.data.data || response.data;
  },

  async updateNumberLimit(limitId: string, data: Partial<NumberLimit>): Promise<NumberLimit> {
    const response = await apiClient.put(`/vendors/me/number-limits/${limitId}`, data);
    return response.data.data || response.data;
  },

  async deleteNumberLimit(limitId: string): Promise<void> {
    await apiClient.delete(`/vendors/me/number-limits/${limitId}`);
  },

  // Payouts
  async requestPayout(data: { amount: number; method: string; currency?: string }): Promise<Payout> {
    const response = await apiClient.post("/vendors/me/payouts", data);
    return response.data.data || response.data;
  },

  // Rounds
  async getMyRounds(params?: { status?: string; drawState?: string }): Promise<LotteryRound[]> {
    const response = await apiClient.get("/vendors/me/rounds", { params });
    return response.data.data || response.data;
  },

  async getRoundDetails(roundId: string): Promise<LotteryRound & { tickets: LotteryTicket[] }> {
    const response = await apiClient.get(`/vendors/me/rounds/${roundId}`);
    return response.data.data || response.data;
  },

  // Aliases used by screens
  async getProfile() {
    const response = await apiClient.get("/vendors/me");
    return response;
  },

  async updateProfile(data: Record<string, unknown>) {
    const response = await apiClient.put("/vendors/me", data);
    return response;
  },

  async respondToReview(reviewId: string, response: string) {
    const res = await apiClient.post(`/vendors/me/reviews/${reviewId}/response`, { response });
    return res;
  },

  async getPlayHistory(page = 1, limit = 200) {
    const response = await apiClient.get("/vendors/me/history", { params: { page, limit } });
    return response;
  },

  async getMyRoundDetails(roundId: string) {
    const response = await apiClient.get(`/vendors/me/rounds/${roundId}`);
    return response;
  },

  async getDrawSettings() {
    const response = await apiClient.get("/vendors/me/draws");
    return response;
  },

  async toggleDraw(drawState: string, enabled: boolean) {
    const response = await apiClient.put(`/vendors/draws/${drawState}`, { enabled });
    return response;
  },

  async toggleGame(drawState: string, gameType: string, enabled: boolean) {
    const response = await apiClient.put(`/vendors/draws/${drawState}/games/${gameType}`, { enabled });
    return response;
  },

  async updateGamePricing(drawState: string, gameType: string, data: { minBet?: number; maxBet?: number }) {
    const response = await apiClient.put(`/vendors/draws/${drawState}/games/${gameType}`, data);
    return response;
  },
};
