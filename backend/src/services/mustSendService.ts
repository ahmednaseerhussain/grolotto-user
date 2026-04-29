import { query } from '../database/pool';
import { AppError } from '../middleware/errorHandler';
import * as notificationService from './notificationService';

export interface MustSendRecord {
  id: string;
  vendorId: string;
  drawId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  amount: number;
  currency: 'HTG' | 'USD';
  status: 'pending' | 'submitted' | 'paid' | 'waived';
  proofUrl: string | null;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

function map(row: any): MustSendRecord {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    drawId: row.draw_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amount: parseFloat(row.amount),
    currency: row.currency,
    status: row.status,
    proofUrl: row.proof_url,
    notes: row.notes,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

/**
 * Record a "must send" amount the vendor owes back to the platform
 * (typically because the round produced more wins than tickets sold).
 */
export async function createMustSend(input: {
  vendorId: string;
  amount: number;
  currency?: 'HTG' | 'USD';
  drawId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  notes?: string | null;
}): Promise<MustSendRecord> {
  if (!input.amount || input.amount <= 0) {
    throw new AppError('Amount must be positive', 400);
  }
  const result = await query(
    `INSERT INTO vendor_must_send
      (vendor_id, draw_id, period_start, period_end, amount, currency, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     RETURNING *`,
    [
      input.vendorId,
      input.drawId || null,
      input.periodStart || null,
      input.periodEnd || null,
      input.amount,
      input.currency || 'HTG',
      input.notes || null,
    ]
  );
  const record = map(result.rows[0]);

  // Notify the vendor.
  notificationService.createVendorNotification(
    input.vendorId,
    'must_send',
    'Action required: send funds',
    `You owe ${record.amount} ${record.currency} to the platform from the latest draw.`,
    { role: 'system' }
  ).catch(() => {});

  // Notify admins so they can chase it up.
  notificationService.notifyAdmins(
    'must_send_created',
    'New vendor must-send',
    `Vendor owes ${record.amount} ${record.currency} from a losing draw.`,
    { role: 'system' },
    { mustSendId: record.id, vendorId: input.vendorId }
  ).catch(() => {});

  return record;
}

export async function listForVendor(vendorId: string): Promise<MustSendRecord[]> {
  const result = await query(
    `SELECT * FROM vendor_must_send WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [vendorId]
  );
  return result.rows.map(map);
}

export async function listForAdmin(status?: string): Promise<(MustSendRecord & { vendorName?: string })[]> {
  const params: any[] = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE ms.status = $1`;
  }
  const result = await query(
    `SELECT ms.*, v.business_name AS vendor_name
       FROM vendor_must_send ms
       LEFT JOIN vendors v ON v.id = ms.vendor_id
       ${where}
      ORDER BY ms.created_at DESC`,
    params
  );
  return result.rows.map((r: any) => ({ ...map(r), vendorName: r.vendor_name }));
}

export async function markSubmitted(
  vendorId: string,
  id: string,
  proofUrl?: string | null,
  notes?: string | null
): Promise<MustSendRecord> {
  const result = await query(
    `UPDATE vendor_must_send
        SET status = 'submitted',
            proof_url = COALESCE($1, proof_url),
            notes = COALESCE($2, notes)
      WHERE id = $3 AND vendor_id = $4 AND status = 'pending'
      RETURNING *`,
    [proofUrl || null, notes || null, id, vendorId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Must-send record not found or not pending', 404);
  }
  notificationService.notifyAdmins(
    'must_send_submitted',
    'Vendor submitted must-send proof',
    'A vendor reported sending the funds. Please verify.',
    { role: 'vendor', id: vendorId },
    { mustSendId: id }
  ).catch(() => {});
  return map(result.rows[0]);
}

export async function processByAdmin(
  id: string,
  adminUserId: string,
  status: 'paid' | 'waived',
  notes?: string | null
): Promise<MustSendRecord> {
  if (!['paid', 'waived'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }
  const result = await query(
    `UPDATE vendor_must_send
        SET status = $1,
            notes = COALESCE($2, notes),
            resolved_at = NOW(),
            resolved_by = $3
      WHERE id = $4
      RETURNING *`,
    [status, notes || null, adminUserId, id]
  );
  if (result.rows.length === 0) {
    throw new AppError('Must-send record not found', 404);
  }
  const record = map(result.rows[0]);
  notificationService.createVendorNotification(
    record.vendorId,
    'must_send_resolved',
    status === 'paid' ? 'Must-send marked paid' : 'Must-send waived',
    status === 'paid'
      ? `Your payment of ${record.amount} ${record.currency} has been received.`
      : `Your must-send obligation of ${record.amount} ${record.currency} was waived.`,
    { role: 'admin', id: adminUserId }
  ).catch(() => {});
  return record;
}
