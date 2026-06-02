import { Request, Response, NextFunction } from 'express';
import * as lotteryService from '../services/lotteryService';
import { query } from '../database/pool';

export async function getDrawStates(_req: Request, res: Response, next: NextFunction) {
  try {
    const FALLBACK = [
      { code: 'NY', name: 'New York' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'TX', name: 'Texas' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'NJ', name: 'New Jersey' },
    ];
    let rows: any[] = [];
    try {
      // Return one row per (state, name) so the vendor/player UI can render
      // each draw window with its admin-configured drawTime and cutoffTime.
      const r = await query(
        `SELECT id, state AS code, name, draw_time, cutoff_time, is_active
         FROM draw_configs
         WHERE is_active = TRUE
         ORDER BY state, draw_time`
      );
      rows = r.rows;
    } catch { /* table missing */ }

    if (rows.length === 0) {
      res.json({ data: FALLBACK });
      return;
    }

    // Group by state code so callers that previously expected {code,name}
    // still receive that shape, plus a `times` array with the schedule details.
    const byState = new Map<string, { code: string; name: string; times: any[] }>();
    for (const row of rows) {
const entry: { code: string; name: string; times: any[] } = byState.get(row.code) || { code: row.code, name: row.name, times: [] };
      entry.times.push({
        id: row.id,
        name: row.name,
        drawTime: row.draw_time,
        cutoffTime: row.cutoff_time,
        isActive: row.is_active,
      });
      byState.set(row.code, entry);
    }
    res.json({ data: Array.from(byState.values()) });
  } catch (error) {
    next(error);
  }
}

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
    const { drawState, winningNumbers, drawDate, drawTime } = req.body;
    const result = await lotteryService.publishResults(drawState, winningNumbers, req.user!.id, drawDate, drawTime);
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
