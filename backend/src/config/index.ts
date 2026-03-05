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
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  moncash: {
    clientId: process.env.MONCASH_CLIENT_ID || '',
    clientSecret: process.env.MONCASH_CLIENT_SECRET || '',
    baseUrl: process.env.MONCASH_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com',
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
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

// Validate critical config
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET environment variable must be set!');
}
if (!config.jwt.refreshSecret) {
  throw new Error('JWT_REFRESH_SECRET environment variable must be set!');
}
if (config.nodeEnv === 'production' && !config.db.connectionString) {
  throw new Error('DATABASE_URL must be set in production!');
}

export default config;
