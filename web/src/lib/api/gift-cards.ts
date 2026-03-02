import { apiClient } from "../api-client";

export interface GiftCard {
  id: number;
  code: string;
  amount: number;
  currency: "HTG" | "USD";
  status: "active" | "redeemed" | "expired" | "cancelled";
  recipientName?: string;
  message?: string;
  purchasedAt: string;
  redeemedAt?: string;
  expiresAt: string;
}

export const giftCardAPI = {
  async purchase(data: {
    amount: number;
    currency: string;
    recipientName?: string;
    message?: string;
  }): Promise<GiftCard> {
    const response = await apiClient.post("/gift-cards/purchase", data);
    return response.data.data || response.data;
  },

  async redeem(code: string): Promise<{ amount: number; currency: "HTG" | "USD"; message: string }> {
    const response = await apiClient.post("/gift-cards/redeem", { code });
    return response.data.data || response.data;
  },

  async getMyCards(): Promise<GiftCard[]> {
    const response = await apiClient.get("/gift-cards/my-cards");
    return response.data.data || response.data;
  },
};
