import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/pool';

// Ensure uploads dir exists
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const VENDOR_DOCS_DIR = path.join(UPLOAD_ROOT, 'vendor-documents');
if (!fs.existsSync(VENDOR_DOCS_DIR)) {
  fs.mkdirSync(VENDOR_DOCS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VENDOR_DOCS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.'));
};

export const uploadVendorDoc = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('file');

/**
 * Upload a vendor document.
 * Body (multipart): file, docType (id_card | business_license)
 * Auth: vendor role. Vendor can only upload to their own record.
 */
export async function uploadVendorDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const docType = (req.body.docType || '').trim();
    if (!['id_card', 'business_license'].includes(docType)) {
      // cleanup file
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Invalid docType. Must be id_card or business_license.' });
      return;
    }

    // Find vendor by user id
    const vendorRes = await query('SELECT id FROM vendors WHERE user_id = $1', [userId]);
    if (vendorRes.rows.length === 0) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(404).json({ success: false, message: 'Vendor profile not found. Register first.' });
      return;
    }
    const vendorId = vendorRes.rows[0].id;

    const fileUrl = `/uploads/vendor-documents/${req.file.filename}`;

    const insertRes = await query(
      `INSERT INTO vendor_documents (vendor_id, doc_type, file_url)
       VALUES ($1, $2, $3)
       RETURNING id, vendor_id, doc_type, file_url, verified, uploaded_at`,
      [vendorId, docType, fileUrl]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current vendor's documents.
 */
export async function getMyVendorDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await query(
      `SELECT d.id, d.vendor_id, d.doc_type, d.file_url, d.verified, d.uploaded_at
       FROM vendor_documents d
       JOIN vendors v ON v.id = d.vendor_id
       WHERE v.user_id = $1
       ORDER BY d.uploaded_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}
