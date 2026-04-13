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

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  giftCardAmount: number | null;
  status: string;
  createdAt: string;
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

export const paymentOrderAPI = {
  async createOrder(data: {
    amount: number;
    currency: string;
    paymentMethod: string;
    giftCardAmount?: number;
  }): Promise<PaymentOrder> {
    const response = await apiClient.post("/payments/orders", data);
    return response.data;
  },

  async getMyOrders(): Promise<PaymentOrder[]> {
    const response = await apiClient.get("/payments/orders/mine");
    return response.data;
  },

  async getPaymentConfig(): Promise<Record<string, string>> {
    const response = await apiClient.get("/payments/config");
    return response.data;
  },

  async createStripeIntent(data: { amount: number; currency: string; giftCardAmount?: number }) {
    const response = await apiClient.post("/payments/stripe/create-intent", data);
    return response.data as { clientSecret: string; paymentIntentId: string; orderId: string };
  },

  async confirmStripePayment(paymentIntentId: string) {
    const response = await apiClient.post("/payments/stripe/confirm", { paymentIntentId });
    return response.data;
  },
};
