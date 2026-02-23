"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { rewardsAPI } from "@/lib/api/rewards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ArrowLeft, Gift, Star, Clock, CheckCircle, Loader2, Trophy, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Reward } from "@/types";
import toast from "react-hot-toast";

const REWARD_ICONS: Record<string, { icon: any; color: string }> = {
  welcome_bonus: { icon: Star, color: "text-amber-500 bg-amber-50" },
  daily_reward: { icon: Gift, color: "text-blue-500 bg-blue-50" },
  first_deposit_bonus: { icon: Zap, color: "text-purple-500 bg-purple-50" },
  referral_bonus: { icon: Trophy, color: "text-emerald-500 bg-emerald-50" },
  loyalty_reward: { icon: Star, color: "text-pink-500 bg-pink-50" },
};

export default function RewardsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const currency = useAppStore((s) => s.currency);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    try {
      const res = await rewardsAPI.getRewards();
      setRewards(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load rewards", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRewards(); }, [loadRewards]);

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await rewardsAPI.claimReward(id);
      toast.success("Reward claimed successfully!");
      loadRewards();
    } catch (err) {
      toast.error("Failed to claim reward");
    } finally {
      setClaimingId(null);
    }
  };

  const available = rewards.filter((r) => r.status === "available");
  const claimed = rewards.filter((r) => r.status === "claimed");
  const totalEarned = claimed.reduce((s, r) => s + (r.amount || 0), 0);

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return "";
    try {
      return formatDistanceToNow(new Date(expiresAt), { addSuffix: false }) + " left";
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Rewards & Bonuses</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-600">Available</p>
            <p className="text-2xl font-bold text-emerald-700">{available.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-blue-600">Claimed</p>
            <p className="text-2xl font-bold text-blue-700">{claimed.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-amber-600">Total Earned</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(totalEarned, currency)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : rewards.length === 0 ? (
        <EmptyState
          icon={<Gift className="h-16 w-16 text-gray-300" />}
          title="No Rewards Yet"
          description="Keep playing to earn rewards and bonuses!"
        />
      ) : (
        <>
          {/* Available Rewards */}
          {available.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Available Rewards</h2>
              <div className="space-y-3">
                {available.map((reward) => {
                  const iconConfig = REWARD_ICONS[reward.type] || REWARD_ICONS.daily_reward;
                  const IconComp = iconConfig.icon;
                  return (
                    <Card key={reward.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-full ${iconConfig.color}`}>
                          <IconComp className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{reward.title}</h3>
                          <p className="text-sm text-gray-500 truncate">{reward.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold text-emerald-600">
                              {formatCurrency(reward.amount, currency)}
                            </span>
                            {reward.expiresAt && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeRemaining(reward.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleClaim(reward.id)}
                          loading={claimingId === reward.id}
                        >
                          Claim
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Claimed Rewards */}
          {claimed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Claimed Rewards</h2>
              <div className="space-y-3 opacity-70">
                {claimed.map((reward) => {
                  const iconConfig = REWARD_ICONS[reward.type] || REWARD_ICONS.daily_reward;
                  const IconComp = iconConfig.icon;
                  return (
                    <Card key={reward.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-full ${iconConfig.color}`}>
                          <IconComp className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{reward.title}</h3>
                          <p className="text-sm text-gray-500 truncate">{reward.description}</p>
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(reward.amount, currency)}
                          </span>
                        </div>
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Claimed
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
