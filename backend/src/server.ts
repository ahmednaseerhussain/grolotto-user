import { query } from './database/pool';

// ─── Startup migrations ─────────────────────────────────
async function runStartupMigrations() {
  try {
    // Migration 005: draw_configs table + gift_card_batches + admin_commission enum
    await query(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'admin_commission'`).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS draw_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        state draw_state NOT NULL,
        name VARCHAR(100) NOT NULL,
        draw_time VARCHAR(20) NOT NULL,
        cutoff_time VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(state, name)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS gift_card_batches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        quantity INTEGER NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed default draw configs if table is empty
    await query(`
      INSERT INTO draw_configs (state, name, draw_time, cutoff_time, is_active) VALUES
        ('NY', 'New York Midday', '14:30', '14:00', TRUE),
        ('NY', 'New York Evening', '22:30', '22:00', TRUE),
        ('FL', 'Florida Midday', '13:30', '13:00', TRUE),
        ('GA', 'Georgia Midday', '12:29', '12:00', TRUE),
        ('CT', 'Connecticut Midday', '13:40', '13:10', TRUE),
        ('TX', 'Texas Day', '12:27', '12:00', TRUE),
        ('PA', 'Pennsylvania Midday', '13:00', '12:30', TRUE),
        ('TN', 'Tennessee Midday', '12:28', '12:00', TRUE),
        ('NJ', 'New Jersey Midday', '12:59', '12:30', TRUE)
      ON CONFLICT (state, name) DO NOTHING;
    `);

    // Migration 005b: add last_login column to users (required by getAllUsers)
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'last_login'
        ) THEN
          ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
        END IF;
      END $$;
    `);

    // Migration 005c: add payout_multipliers JSONB column to vendors
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'vendors' AND column_name = 'payout_multipliers'
        ) THEN
          ALTER TABLE vendors ADD COLUMN payout_multipliers JSONB;
        END IF;
      END $$;
    `);

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

    // Migration 009: bank details on vendor_payouts
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'vendor_payouts' AND column_name = 'bank_name'
        ) THEN
          ALTER TABLE vendor_payouts ADD COLUMN bank_name VARCHAR(100);
          ALTER TABLE vendor_payouts ADD COLUMN bank_account_name VARCHAR(100);
          ALTER TABLE vendor_payouts ADD COLUMN bank_account_number VARCHAR(50);
          ALTER TABLE vendor_payouts ADD COLUMN bank_routing_number VARCHAR(50);
          ALTER TABLE vendor_payouts ADD COLUMN moncash_phone VARCHAR(20);
        END IF;
      END $$;
    `);

    // Migration 010: create advertisements table + enums if missing
    await query(`DO $$ BEGIN CREATE TYPE ad_type AS ENUM ('slideshow','banner','popup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await query(`DO $$ BEGIN CREATE TYPE ad_status AS ENUM ('active','paused','scheduled','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await query(`DO $$ BEGIN CREATE TYPE ad_audience AS ENUM ('all','new_players','active_players'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await query(`DO $$ BEGIN CREATE TYPE ad_priority AS ENUM ('high','medium','low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title            VARCHAR(255) NOT NULL,
        subtitle         VARCHAR(255),
        content          TEXT,
        background_color VARCHAR(20)  DEFAULT '#3b82f6',
        text_color       VARCHAR(20)  DEFAULT '#ffffff',
        image_url        VARCHAR(500),
        link_url         VARCHAR(500),
        link_text        VARCHAR(100),
        ad_type          ad_type      DEFAULT 'slideshow',
        status           ad_status    DEFAULT 'active',
        start_date       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        end_date         TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
        clicks           INTEGER      DEFAULT 0,
        impressions      INTEGER      DEFAULT 0,
        target_audience  ad_audience  DEFAULT 'all',
        priority         ad_priority  DEFAULT 'medium',
        display_order    INTEGER      DEFAULT 0,
        created_by       UUID REFERENCES users(id),
        created_at       TIMESTAMPTZ  DEFAULT NOW(),
        updated_at       TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
      CREATE INDEX IF NOT EXISTS idx_advertisements_dates  ON advertisements(start_date, end_date);
    `);

    // Seed default advertisements if table is empty
    const adCount = await query('SELECT COUNT(*) FROM advertisements');
    if (parseInt(adCount.rows[0].count) === 0) {
      await query(`
        INSERT INTO advertisements (title, subtitle, content, background_color, text_color, link_text, ad_type, status, start_date, end_date, display_order)
        VALUES
          ('Welcome to GroLotto!', 'Your lucky numbers await', 'Play the biggest lottery games in Haiti. Pick your numbers and win big today!', '#166534', '#ffffff', 'Play Now', 'slideshow', 'active', NOW(), NOW() + INTERVAL '5 years', 0),
          ('Tchala Dream Numbers', 'Turn dreams into winnings', 'Use Tchala to discover your lucky numbers from dreams. A Haitian tradition meets modern lottery!', '#4c1d95', '#ffffff', 'Try Tchala', 'slideshow', 'active', NOW(), NOW() + INTERVAL '5 years', 1),
          ('Refer & Earn', 'Invite friends, get rewards', 'Share GroLotto with friends and earn bonus credits when they place their first bet!', '#991b1b', '#ffffff', 'Learn More', 'slideshow', 'active', NOW(), NOW() + INTERVAL '5 years', 2)
      `);
    }

    // Migration 011: create number_limits table if missing
    await query(`
      CREATE TABLE IF NOT EXISTS number_limits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        draw_state draw_state NOT NULL,
        number VARCHAR(10) NOT NULL,
        bet_limit DECIMAL(10,2) NOT NULL,
        current_total DECIMAL(10,2) DEFAULT 0.00,
        is_stopped BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(vendor_id, draw_state, number)
      );
      CREATE INDEX IF NOT EXISTS idx_number_limits_vendor_draw ON number_limits(vendor_id, draw_state);
    `);

    // Migration 012: create dream_dictionary table if missing
    await query(`
      CREATE TABLE IF NOT EXISTS dream_dictionary (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        keyword VARCHAR(100) NOT NULL,
        numbers INTEGER[] NOT NULL,
        description TEXT,
        language VARCHAR(5) DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_dream_dictionary_keyword ON dream_dictionary(keyword);
      CREATE INDEX IF NOT EXISTS idx_dream_dictionary_lang ON dream_dictionary(language);
    `);

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
  max: 30, // 30 attempts per window
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
       WHERE status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())
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
