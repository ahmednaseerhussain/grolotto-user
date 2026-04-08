import { Request, Response, NextFunction } from 'express';
import { query } from '../database/pool';

let maintenanceMode = false;
let lastCheck = 0;
const CHECK_INTERVAL = 30_000; // 30 seconds

async function refreshMaintenanceStatus() {
  const now = Date.now();
  if (now - lastCheck < CHECK_INTERVAL) return;
  lastCheck = now;
  try {
    const result = await query(
      `SELECT value FROM app_settings WHERE key = 'maintenance_mode' LIMIT 1`
    );
    if (result.rows.length > 0) {
      const val = result.rows[0].value;
      maintenanceMode = val === true || val === 'true' || val === '"true"';
    } else {
      maintenanceMode = false;
    }
  } catch {
    // On DB error, don't change state
  }
}

export function maintenanceGuard(req: Request, res: Response, next: NextFunction) {
  refreshMaintenanceStatus();

  if (!maintenanceMode) return next();

  // Always allow admin routes, health check, and auth
  const path = req.path;
  if (
    path.startsWith('/api/admin') ||
    path.startsWith('/api/auth') ||
    path === '/health' ||
    path === '/api/settings/public'
  ) {
    return next();
  }

  res.status(503).json({
    error: 'The app is currently under maintenance. Please try again later.',
    code: 'MAINTENANCE_MODE',
  });
}
