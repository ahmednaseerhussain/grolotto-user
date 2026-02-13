import { Request, Response, NextFunction } from 'express';
import * as tchalaService from '../services/tchalaService';

export async function searchDreams(req: Request, res: Response, next: NextFunction) {
  try {
    const keyword = req.query.q as string;
    const language = req.query.lang as string;
    if (!keyword) {
      res.status(400).json({ error: 'Search query (q) required' });
      return;
    }
    const results = await tchalaService.searchDreams(keyword, language);
    res.json(results);
  } catch (error) {
    next(error);
  }
}

export async function getAllDreams(req: Request, res: Response, next: NextFunction) {
  try {
    const language = req.query.lang as string;
    const results = await tchalaService.getAllDreams(language);
    res.json(results);
  } catch (error) {
    next(error);
  }
}
