import { apiClient } from "../api-client";
import type { LotteryTicket, LotteryRound } from "@/types";

export const lotteryAPI = {
  async placeBet(data: {
    vendorId: string;
    drawState: string;
    gameType: string;
    numbers: number[];
    betAmount: number;
    currency?: string;
  }): Promise<LotteryTicket> {
    const response = await apiClient.post("/lottery/bet", data);
    return response.data.data || response.data;
  },

  async getMyTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    drawState?: string;
    gameType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ tickets: LotteryTicket[]; total: number }> {
    const response = await apiClient.get("/lottery/tickets", { params });
    return response.data.data || response.data;
  },

  async getRounds(params?: {
    drawState?: string;
    status?: string;
    date?: string;
  }): Promise<LotteryRound[]> {
    const response = await apiClient.get("/lottery/rounds", { params });
    return response.data.data || response.data;
  },
};
