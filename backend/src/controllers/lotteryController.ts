import { Request, Response, NextFunction } from 'express';
import * as lotteryService from '../services/lotteryService';

export async function placeBet(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await lotteryService.placeBet({
      playerId: req.user!.id,
      ...req.body,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMyTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const tickets = await lotteryService.getPlayerTickets(req.user!.id, page, limit);
    res.json(tickets);
  } catch (error) {
    next(error);
  }
}

export async function getLotteryRounds(req: Request, res: Response, next: NextFunction) {
  try {
    const rounds = await lotteryService.getLotteryRounds({
      drawState: req.query.drawState as string,
      status: req.query.status as string,
      date: req.query.date as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json(rounds);
  } catch (error) {
    next(error);
  }
}

export async function publishResults(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId, winningNumbers } = req.body;
    const result = await lotteryService.publishResults(roundId, winningNumbers, req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function generateRandomNumbers(req: Request, res: Response, next: NextFunction) {
  try {
    const numbers = lotteryService.generateWinningNumbers();
    res.json(numbers);
  } catch (error) {
    next(error);
  }
}
