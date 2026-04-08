import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { query } from '../database/pool';

export interface AuthUser {
  id: string;
  email: string;
  role: 'player' | 'vendor' | 'admin';
  adminRole?: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ─── Role → Permitted Resources Mapping ──────────────────
// Each admin_role grants access to specific resource groups.
// super_admin & admin get full access. Specialized roles get limited scopes.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],       // full access to everything
  admin:       ['*'],       // full access to everything
  moderator:   ['dashboard', 'players', 'vendors', 'notifications', 'reports', 'transactions'],
  viewer:      ['dashboard', 'reports', 'transactions'],
  result_manager: ['dashboard', 'results', 'draws', 'state-lotteries'],
  payout_manager: ['dashboard', 'payouts', 'payments', 'transactions'],
  ads_manager:    ['dashboard', 'ads', 'app-management'],
  player_manager: ['dashboard', 'players', 'notifications', 'gift-cards'],
};

export function getPermissionsForRole(adminRole: string): string[] {
  return ROLE_PERMISSIONS[adminRole] || [];
}

export function hasResourceAccess(adminRole: string, resource: string): boolean {
  const perms = getPermissionsForRole(adminRole);
  return perms.includes('*') || perms.includes(resource);
}

/**
 * Verify JWT token from Authorization header.
 * Attaches user info to req.user.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, email, role, admin_role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User account not found' });
      return;
    }

    if (!result.rows[0].is_active) {
      // Fetch suspension reason if available
      let suspensionMsg = 'Account is suspended. Please contact support.';
      try {
        const reasonResult = await query(
          `SELECT value FROM app_settings WHERE key = $1`,
          [`suspension_reason_${result.rows[0].id}`]
        );
        if (reasonResult.rows.length > 0) {
          const val = typeof reasonResult.rows[0].value === 'string'
            ? JSON.parse(reasonResult.rows[0].value)
            : reasonResult.rows[0].value;
          if (val?.reason) {
            suspensionMsg = `Account suspended: ${val.reason}`;
          }
        }
      } catch { /* non-critical */ }
      res.status(403).json({ error: suspensionMsg, code: 'ACCOUNT_SUSPENDED' });
      return;
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role,
      adminRole: result.rows[0].admin_role || undefined,
      permissions: result.rows[0].role === 'admin'
        ? getPermissionsForRole(result.rows[0].admin_role || 'admin')
        : undefined,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Require specific role(s) to access endpoint.
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Require access to a specific admin resource.
 * Checks the user's admin_role against ROLE_PERMISSIONS.
 * Must be used AFTER authenticate + authorize('admin').
 */
export const authorizeResource = (resource: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const adminRole = req.user.adminRole || 'admin';
    if (!hasResourceAccess(adminRole, resource)) {
      res.status(403).json({ error: `Access denied: you do not have permission to manage ${resource}` });
      return;
    }
    next();
  };
};
