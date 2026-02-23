import { apiClient } from "../api-client";
import type { WalletBalance, Transaction } from "@/types";

export const walletAPI = {
  async getBalance(): Promise<WalletBalance> {
    const response = await apiClient.get("/wallet");
    return response.data.data || response.data;
  },

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const response = await apiClient.get("/wallet/transactions", { params });
    return response.data.data || response.data;
  },
};
