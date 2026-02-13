# GROLOTTO Backend — Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  React Native    │────▶│  Express.js API   │────▶│   PostgreSQL     │
│  Mobile App      │◀────│  (Node.js 20+)   │◀────│   Database       │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   MoonPay API     │
                        │  (Payments)       │
                        └──────────────────┘
```

## Prerequisites

- **Node.js**: 20.x or later
- **PostgreSQL**: 15.x or later
- **npm**: 10.x or later

## Local Development Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up PostgreSQL

```bash
# Create database
createdb grolotto

# Or via psql
psql -U postgres -c "CREATE DATABASE grolotto;"
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)
```

### 4. Run database migrations

```bash
npm run migrate
```

### 5. Seed initial data (development only)

```bash
npm run seed
```

### 6. Start development server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 7. Build for production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `PORT` | No | `3000` | Server listen port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 64 chars, use `openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | **Yes** | — | Refresh token secret (separate from JWT_SECRET) |
| `MOONPAY_API_KEY` | **Yes** | — | MoonPay publishable API key |
| `MOONPAY_SECRET_KEY` | **Yes** | — | MoonPay secret key for webhook HMAC signing |
| `MOONPAY_WEBHOOK_SECRET` | **Yes** | — | MoonPay webhook signing secret |
| `MOONPAY_BASE_URL` | No | `https://api.moonpay.com` | MoonPay API base URL |
| `CORS_ORIGIN` | No | `*` | CORS allowed origin(s) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Rate limit window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |

### Generating secrets

```bash
# JWT Secret (64 bytes hex = 128 chars)
openssl rand -hex 64

# Refresh Secret (separate key)
openssl rand -hex 64
```

## Production Deployment

### Option A: Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Option B: Traditional Server (Ubuntu/Debian)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Clone and setup
git clone <repo-url> /opt/grolotto
cd /opt/grolotto/backend
npm ci --only=production
npm run build

# Setup systemd service
sudo cp grolotto.service /etc/systemd/system/
sudo systemctl enable grolotto
sudo systemctl start grolotto
```

### Option C: Cloud Platforms

**Railway / Render / Fly.io:**
1. Connect your Git repository
2. Set build command: `cd backend && npm ci && npm run build`
3. Set start command: `cd backend && npm start`
4. Add all required environment variables
5. Provision a PostgreSQL database add-on
6. Run `npm run migrate` via one-off command after first deploy

**AWS (ECS / Elastic Beanstalk):**
1. Use Docker deployment (Option A)
2. Set up RDS PostgreSQL instance
3. Store secrets in AWS Secrets Manager
4. Use ALB for load balancing with SSL termination

## Database Management

### Running migrations

```bash
# Apply schema
npm run migrate

# Seed data (development/staging only)
npm run seed
```

### Backup strategy

```bash
# Daily automated backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_20240101_120000.sql
```

## Security Checklist

### Before Going Live

- [ ] **JWT Secrets**: Generated with `openssl rand -hex 64` (not hardcoded)
- [ ] **Database**: Separate user with minimum required privileges
- [ ] **CORS**: Set to specific mobile app origin (not `*`)
- [ ] **HTTPS**: TLS/SSL certificate configured (use Let's Encrypt or cloud provider)
- [ ] **Rate Limiting**: Configured per environment (stricter in production)
- [ ] **Helmet**: Security headers enabled (already configured in server.ts)
- [ ] **Input Validation**: Zod schemas validate all endpoints (already implemented)
- [ ] **SQL Injection**: Parameterized queries used everywhere (already implemented)
- [ ] **Password Hashing**: bcrypt with 12 rounds (already implemented)
- [ ] **Token Rotation**: Refresh tokens are single-use with rotation (already implemented)
- [ ] **MoonPay Webhooks**: HMAC-SHA256 signature verification (already implemented)
- [ ] **Error Messages**: Production errors don't leak stack traces (already implemented)
- [ ] **Database SSL**: `?sslmode=require` in production DATABASE_URL
- [ ] **Logging**: Morgan logs configured, pipe to external service (Datadog, CloudWatch)
- [ ] **Monitoring**: Health check endpoint at `GET /api/health`

### Rate Limiting (Pre-configured)

| Endpoint Group | Window | Max Requests |
|----------------|--------|--------------|
| General API | 15 min | 100 |
| Auth (login/register) | 15 min | 20 |

### Authentication Flow

1. **Login**: `POST /api/auth/login` → Returns `{ accessToken, refreshToken }`
2. **Access Token**: 15-minute expiry, sent in `Authorization: Bearer <token>`
3. **Refresh**: `POST /api/auth/refresh` → Rotates both tokens (old refresh invalidated)
4. **Logout**: `POST /api/auth/logout` → Invalidates refresh token

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login, returns tokens |
| POST | `/refresh` | No | Refresh access token |
| POST | `/logout` | Yes | Invalidate refresh token |
| GET | `/profile` | Yes | Get current user profile |
| PUT | `/profile` | Yes | Update profile |

### Vendor (`/api/vendors`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Yes | Register as vendor |
| GET | `/active` | Yes | List active vendors |
| GET | `/me` | Vendor | Get own vendor profile |
| GET | `/me/stats` | Vendor | Get vendor statistics |
| PUT | `/me/draws` | Vendor | Update draw settings |
| GET | `/me/history` | Vendor | Get play history |

### Lottery (`/api/lottery`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bet` | Yes | Place a bet |
| GET | `/tickets` | Yes | Get user's tickets |
| GET | `/rounds` | Yes | Get lottery rounds |
| POST | `/results` | Admin | Publish results |

### Wallet (`/api/wallet`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Get wallet balance |
| GET | `/transactions` | Yes | Get transaction history |

### Payment (`/api/payments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/intent` | Yes | Create payment intent |
| POST | `/webhook/moonpay` | No* | MoonPay webhook (*HMAC verified) |

### Admin (`/api/admin`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Admin | System statistics |
| GET | `/users` | Admin | List all users |
| PUT | `/users/:id/status` | Admin | Suspend/activate user |
| GET | `/vendors` | Admin | List all vendors |
| PUT | `/vendors/:id/approve` | Admin | Approve vendor |
| GET | `/payouts` | Admin | List pending payouts |
| PUT | `/payouts/:id` | Admin | Process payout |
| GET | `/advertisements` | Admin | Get advertisements |
| POST | `/advertisements` | Admin | Create advertisement |

### Tchala (`/api/tchala`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search?q=` | Yes | Search dream dictionary |

## Monitoring & Health

### Health Check

```bash
curl http://localhost:3000/api/health
# Response: { "status": "ok", "timestamp": "..." }
```

### Application Logs

In production, pipe stdout/stderr to your logging service:

```bash
node dist/server.js 2>&1 | tee -a /var/log/grolotto/app.log
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on DB | Check PostgreSQL is running, verify DATABASE_URL |
| JWT validation fails | Ensure JWT_SECRET is identical across restarts |
| MoonPay webhooks fail | Verify MOONPAY_WEBHOOK_SECRET matches dashboard |
| CORS errors | Set CORS_ORIGIN to your mobile app's origin |
| Rate limit hit | Adjust RATE_LIMIT_MAX or use Redis for distributed limits |
| Migrations fail | Check schema.sql syntax, verify DB user has CREATE privileges |
