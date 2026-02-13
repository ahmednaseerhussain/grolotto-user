import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'grolotto',
    user: process.env.DB_USER || 'grolotto_user',
    password: process.env.DB_PASSWORD || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE_ME',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'CHANGE_ME_REFRESH',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  moonpay: {
    apiKey: process.env.MOONPAY_API_KEY || '',
    secretKey: process.env.MOONPAY_SECRET_KEY || '',
    webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET || '',
    baseUrl: process.env.MOONPAY_BASE_URL || 'https://api.moonpay.com',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:19006',

  // Win multipliers per game type
  winMultipliers: {
    senp: 50,     // 1 number correct out of 00-99 → 50x
    maryaj: 100,   // 2 numbers correct → 100x
    loto3: 500,    // 3 digits correct → 500x
    loto4: 5000,   // 4 digits correct → 5000x
    loto5: 50000,  // 5 digits correct → 50000x
  },
};

// Validate critical config in production
if (config.nodeEnv === 'production') {
  if (config.jwt.secret === 'CHANGE_ME') {
    throw new Error('JWT_SECRET must be set in production!');
  }
  if (config.jwt.refreshSecret === 'CHANGE_ME_REFRESH') {
    throw new Error('JWT_REFRESH_SECRET must be set in production!');
  }
  if (!config.db.connectionString) {
    throw new Error('DATABASE_URL must be set in production!');
  }
}

export default config;
