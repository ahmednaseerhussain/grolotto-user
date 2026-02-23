import { apiClient } from "../api-client";
import type { Reward } from "@/types";

export const rewardsAPI = {
  async getRewards(): Promise<Reward[]> {
    const response = await apiClient.get("/rewards");
    return response.data.data || response.data;
  },

  async claimReward(rewardId: string): Promise<Reward> {
    const response = await apiClient.post(`/rewards/${rewardId}/claim`);
    return response.data.data || response.data;
  },
};
