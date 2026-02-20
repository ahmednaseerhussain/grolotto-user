import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const role = (req.user!.role === 'vendor' ? 'vendor' : 'player') as 'player' | 'vendor';

    const result = await notificationService.getUserNotifications(req.user!.id, role, limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const role = (req.user!.role === 'vendor' ? 'vendor' : 'player') as 'player' | 'vendor';
    const count = await notificationService.getUnreadCount(req.user!.id, role);
    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const role = (req.user!.role === 'vendor' ? 'vendor' : 'player') as 'player' | 'vendor';
    await notificationService.markAsRead(req.params.id, req.user!.id, role);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const role = (req.user!.role === 'vendor' ? 'vendor' : 'player') as 'player' | 'vendor';
    await notificationService.markAllAsRead(req.user!.id, role);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
