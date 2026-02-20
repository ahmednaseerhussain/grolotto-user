import { Request, Response, NextFunction } from 'express';
import * as rewardService from '../services/rewardService';

export async function getUserRewards(req: Request, res: Response, next: NextFunction) {
  try {
    const rewards = await rewardService.getUserRewards(req.user!.id);

    // Also check/create daily reward on dashboard load
    await rewardService.checkAndCreateDailyReward(req.user!.id);

    // Re-fetch to include any newly created daily reward
    const updatedRewards = await rewardService.getUserRewards(req.user!.id);
    res.json(updatedRewards);
  } catch (error) {
    next(error);
  }
}

export async function claimReward(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await rewardService.claimReward(req.user!.id, req.params.rewardId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
