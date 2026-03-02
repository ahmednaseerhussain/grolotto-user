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

const app = express();

// ─── Security ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    config.frontendUrl,
    'https://grolotto.com',
    'https://www.grolotto.com',
    'http://localhost:3001',
    'http://localhost:19006',
  ].filter(Boolean),
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
app.listen(PORT, () => {
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
