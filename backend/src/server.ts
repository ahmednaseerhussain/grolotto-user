import { query } from './database/pool';

// ─── Startup migrations ─────────────────────────────────
async function runStartupMigrations() {
  try {
    // Migration 006: operating_currency on vendors
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'vendors' AND column_name = 'operating_currency'
        ) THEN
          ALTER TABLE vendors ADD COLUMN operating_currency VARCHAR(3) DEFAULT 'HTG';
        END IF;
      END $$;
    `);

    // Migration 007: gift_cards table
    await query(`
      CREATE TABLE IF NOT EXISTS gift_cards (
        id            SERIAL PRIMARY KEY,
        code          VARCHAR(20) UNIQUE NOT NULL,
        amount        NUMERIC(12,2) NOT NULL,
        currency      VARCHAR(3) NOT NULL DEFAULT 'HTG',
        status        VARCHAR(20) NOT NULL DEFAULT 'active',
        purchased_by  UUID NOT NULL REFERENCES users(id),
        redeemed_by   UUID REFERENCES users(id),
        recipient_name VARCHAR(100),
        message       TEXT,
        purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        redeemed_at   TIMESTAMPTZ,
        expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year')
      );
      CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
      CREATE INDEX IF NOT EXISTS idx_gift_cards_purchased_by ON gift_cards(purchased_by);
      CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
    `);

    // Migration 008: extend transaction_type enum for gift cards & refunds
    // ALTER TYPE ADD VALUE cannot run inside a transaction block — run each separately
    await query(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gift_card_purchase'`).catch(() => {});
    await query(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gift_card_redeem'`).catch(() => {});
    await query(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'refund'`).catch(() => {});

    console.log('[Migration] Startup migrations applied successfully');
  } catch (err) {
    console.error('[Migration] Startup migration error:', err);
    // Non-fatal — server still starts
  }
}

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import vendorRoutes from './routes/vendorRoutes';
import lotteryRoutes from './routes/lotteryRoutes';
import walletRoutes from './routes/walletRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import tchalaRoutes from './routes/tchalaRoutes';
import rewardRoutes from './routes/rewardRoutes';
import notificationRoutes from './routes/notificationRoutes';
import giftCardRoutes from './routes/giftCardRoutes';

const app = express();

// ─── Security ────────────────────────────────────────────
app.use(helmet());

const ALLOWED_WEB_ORIGINS = [
  config.frontendUrl,
  'https://grolotto.com',
  'https://www.grolotto.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:19006',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // No origin = mobile app, Postman, server-to-server → allow
    if (!origin) return callback(null, true);
    // Known web origin → allow
    if (ALLOWED_WEB_ORIGINS.includes(origin)) return callback(null, true);
    // Unknown browser origin → block
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Rate limiting ───────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth routes get stricter rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Logging ─────────────────────────────────────────────
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// ─── Body parsing ────────────────────────────────────────
// Note: payment webhook route uses raw() parser, registered in its own route file
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gift-cards', giftCardRoutes);

// Public app settings (non-sensitive only)
app.get('/api/settings/public', async (_req, res, next) => {
  try {
    const { query: dbQuery } = require('./database/pool');
    const result = await dbQuery(
      `SELECT key, value FROM app_settings
       WHERE key IN ('allowed_states', 'game_availability', 'win_multipliers', 'min_bet_amount', 'max_bet_amount', 'htg_exchange_rate', 'maintenance_mode')`
    );
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      const val = row.value;
      settings[row.key] = typeof val === 'string' ? val : val;
    }
    res.json(settings);
  } catch (error) { next(error); }
});

// Public advertisements (no auth required)
app.get('/api/advertisements/active', async (req, res, next) => {
  try {
    const { query: dbQuery } = require('./database/pool');
    const result = await dbQuery(
      `SELECT id, title, subtitle, content, background_color, text_color, image_url, 
              link_url, link_text, ad_type, target_audience, priority, display_order
       FROM advertisements 
       WHERE status = 'active' AND start_date <= NOW() AND end_date >= NOW()
       ORDER BY display_order ASC`
    );
    res.json(result.rows.map((r: any) => ({
      id: r.id, title: r.title, subtitle: r.subtitle, content: r.content,
      backgroundColor: r.background_color, textColor: r.text_color, imageUrl: r.image_url,
      linkUrl: r.link_url, linkText: r.link_text, type: r.ad_type,
      targetAudience: r.target_audience, priority: r.priority, order: r.display_order,
    })));
  } catch (error) { next(error); }
});

// Public ad analytics (players can record clicks/impressions)
app.post('/api/advertisements/:adId/click', async (req, res, next) => {
  try {
    const { query: dbQuery } = require('./database/pool');
    await dbQuery('UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1', [req.params.adId]);
    res.json({ success: true });
  } catch (error) { next(error); }
});
app.post('/api/advertisements/:adId/impression', async (req, res, next) => {
  try {
    const { query: dbQuery } = require('./database/pool');
    await dbQuery('UPDATE advertisements SET impressions = impressions + 1 WHERE id = $1', [req.params.adId]);
    res.json({ success: true });
  } catch (error) { next(error); }
});

app.use('/api/admin', adminRoutes);
app.use('/api/tchala', tchalaRoutes);

// ─── 404 ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error handler (must be last) ────────────────────────
app.use(errorHandler);

// ─── Start server ────────────────────────────────────────
const PORT = config.port;
app.listen(PORT, async () => {
  await runStartupMigrations();
  console.log(`
╔══════════════════════════════════════════════════╗
║           GROLOTTO API SERVER                    ║
║──────────────────────────────────────────────────║
║  Port:        ${String(PORT).padEnd(34)}║
║  Environment: ${(config.nodeEnv === 'production' ? 'production' : 'development').padEnd(34)}║
║  Database:    ${config.db.host.padEnd(34)}║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
