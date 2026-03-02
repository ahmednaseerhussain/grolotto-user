import { apiClient } from "../api-client";

export const paymentAPI = {
  async createPaymentIntent(data: {
    amount: number;
    currency?: string;
    phoneNumber: string;
  }): Promise<{ paymentUrl: string; orderId: string; transactionId?: string; redirectUrl?: string }> {
    const response = await apiClient.post("/payments/intent", data);
    return response.data.data || response.data;
  },

  async verifyPayment(orderId: string): Promise<{ status: string; amount?: number }> {
    const response = await apiClient.post("/payments/verify", { orderId });
    return response.data.data || response.data;
  },

  async checkStatus(transactionId: string): Promise<{ status: string }> {
    const response = await apiClient.get(`/payments/status/${transactionId}`);
    return response.data.data || response.data;
  },
};
