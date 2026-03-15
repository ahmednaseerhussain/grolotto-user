# GROLOTTO — System Context Document

> Last updated: February 20, 2026

## Overview

Grolotto is a Haitian lottery platform (borlette) where **vendors accept bets and bear the risk**. Players buy tickets from vendors, and the **admin publishes winning numbers globally per state per day**. Payouts are multiplier-based and automatic — vendors pay winners, and admin takes a 10% commission from vendors.

---

## Architecture

| Layer       | Technology                       | Location                                 |
| ----------- | -------------------------------- | ---------------------------------------- |
| Mobile App  | React Native (Expo) + NativeWind | `src/`                                   |
| Backend API | Express.js + TypeScript          | `backend/src/`                           |
| Database    | PostgreSQL (Neon)                | Hosted on Neon                           |
| Hosting     | Render                           | `grolotto-user.onrender.com`             |
| Payments    | MonCash                          | `backend/src/services/moncashService.ts` |
| State       | Zustand + AsyncStorage           | `src/state/appStore.ts`                  |
| Auth        | JWT (access + refresh tokens)    | `backend/src/middleware/auth.ts`         |

### API Base URL

```
https://grolotto-user.onrender.com/api
```

### Database Connection

```
postgresql://neondb_owner:npg_WNM7muvkX4Eb@ep-nameless-brook-ait2d4uq-pooler.c-4.us-east-1.aws.neon.tech/neondb
```

---

## Business Model — Vendor-Funded, Admin-Published Lottery

### How It Works

1. **Vendor configures draws** — Vendor enables states/game types with min/max bet amounts
2. **Players place bets** — Player picks a vendor → selects state → game type → numbers → bet amount
3. **100% of bet goes to vendor** — No commission split at bet time. Full bet amount credited to vendor's `available_balance`
4. **Rounds are global** — One round per state per day (not per-vendor). Auto-created on first bet.
5. **Admin publishes winning numbers** — One set of winning numbers per state per day, same for ALL vendors
6. **Winners get multiplier-based payouts** — `winAmount = betAmount × multiplier`
7. **Vendor pays winners** — Winner payout amounts deducted from vendor's balance (can go negative = debt)
8. **Admin takes 10% commission** — After round completes, 10% of each vendor's total bets is charged as admin commission
9. **Winners notified** — Players get push notifications with winning amounts

### Win Multipliers (from `app_settings.win_multipliers`)

| Game Type | Numbers   | Range      | Multiplier | Example ($1 bet) |
| --------- | --------- | ---------- | ---------- | ---------------- |
| Senp      | 1 number  | 00-99      | 50x        | Win $50          |
| Maryaj    | 2 numbers | 00-99 each | 100x       | Win $100         |
| Loto 3    | 3 digits  | 0-9 each   | 500x       | Win $500         |
| Loto 4    | 4 digits  | 0-9 each   | 5,000x     | Win $5,000       |
| Loto 5    | 5 digits  | 0-9 each   | 50,000x    | Win $50,000      |

### Financial Flow

```
Player places $10 bet on Senp through Vendor A:
  → $10 credited to Vendor A's balance (100%)
  → Ticket created, linked to global round for that state+date

Admin publishes winning numbers for NY:
  → All tickets for NY that day are checked
  → If Player X wins Senp: winAmount = $10 × 50 = $500
  → $500 deducted from Vendor A's balance (Vendor A pays the winner)
  → $500 credited to Player X's wallet
  → Admin commission: 10% of all bets through Vendor A = deducted from Vendor A
  → Player X gets notification: "You won $500!"
```

### Who Bears Risk?

| Entity             | Risk                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Vendor**         | Bears ALL payout risk. If many players win, vendor's balance can go negative (debt). |
| **Admin/Platform** | No risk. Gets 10% commission from vendor's bet total regardless of outcomes.         |
| **Player**         | Only risks bet amount. Wins are guaranteed and credited to wallet.                   |

### Vendor Balance Rules

- `vendors.available_balance` has **NO CHECK constraint** — can go negative
- Vendor receives 100% of all bets
- Vendor pays all winner payouts
- Vendor pays 10% admin commission on total bets
- Net profit = bets_received - winner_payouts - admin_commission

### Player Wallet Rules

- `wallets.balance_usd` has `CHECK (balance_usd >= 0)` — players cannot go negative
- Player can only bet with available balance
- Winnings credited automatically when admin publishes results

---

## Key Files

### Backend

| File                                           | Purpose                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `backend/src/services/lotteryService.ts`       | Core logic: `placeBet()`, `publishResults()`, `getVendorRounds()`, `getVendorRoundDetails()` |
| `backend/src/controllers/lotteryController.ts` | REST handlers for lottery endpoints                                                          |
| `backend/src/controllers/vendorController.ts`  | Vendor endpoints (read-only rounds, no publish)                                              |
| `backend/src/routes/lotteryRoutes.ts`          | `POST /lottery/bet`, `POST /lottery/results` (admin-only), `GET /lottery/rounds`             |
| `backend/src/routes/vendorRoutes.ts`           | `GET /vendors/me/rounds` (read-only), no publish endpoint                                    |
| `backend/src/validators/schemas.ts`            | Zod schemas — `publishResultsSchema` uses `drawState` not `roundId`                          |
| `backend/src/database/migration-004.sql`       | Global rounds migration (reversed per-vendor rounds from migration-003)                      |

### Frontend

| File                                     | Purpose                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `src/api/apiClient.ts`                   | API client — `lotteryAPI.publishResults(drawState, winningNumbers, drawDate?)` |
| `src/screens/ResultPublishing.tsx`       | Admin screen — publish winning numbers per state                               |
| `src/screens/VendorResultPublishing.tsx` | Vendor screen — read-only round/ticket viewer                                  |
| `src/screens/VendorDashboard.tsx`        | Vendor home — "View Rounds" quick action                                       |

---

## Database Schema (Key Tables)

### lottery_rounds

- `id` UUID PK
- `draw_state` VARCHAR (NY, FL, GA, TX, PA, CT, TN, NJ)
- `draw_date` DATE
- `draw_time` VARCHAR
- `status` VARCHAR (open, closed, completed)
- `winning_numbers` JSONB
- `total_bets` DECIMAL
- `total_payouts` DECIMAL
- `total_tickets` INTEGER
- `admin_commission_total` DECIMAL — 10% of all vendor bets after publishing
- `winner_count` INTEGER
- `vendor_id` UUID NULLABLE (legacy, always NULL for global rounds)
- `prize_pool` DECIMAL (legacy, unused in new model)
- UNIQUE: `(draw_state, draw_date, draw_time)` — one round per state+date+time

### lottery_tickets

- `id` UUID PK
- `player_id` UUID FK → users
- `vendor_id` UUID FK → vendors
- `round_id` UUID FK → lottery_rounds
- `draw_state` VARCHAR
- `game_type` VARCHAR (senp, maryaj, loto3, loto4, loto5)
- `numbers` INTEGER[]
- `bet_amount` DECIMAL
- `currency` VARCHAR (USD, HTG)
- `status` VARCHAR (pending, won, lost)
- `win_amount` DECIMAL

### app_settings

- `key = 'win_multipliers'` → `{"senp": 50, "maryaj": 100, "loto3": 500, "loto4": 5000, "loto5": 50000}`
- `key = 'system_commission'` → `0.10` (10% admin commission rate)

---

## API Endpoints

### Admin Publish (POST /api/lottery/results)

```json
{
  "drawState": "NY",
  "winningNumbers": {
    "senp": [42],
    "maryaj": [12, 55],
    "loto3": [3, 7, 1],
    "loto4": [8, 2, 5, 9],
    "loto5": [1, 4, 7, 2, 6]
  },
  "drawDate": "2026-02-20" // optional, defaults to today
}
```

### Place Bet (POST /api/lottery/bet)

```json
{
  "vendorId": "uuid",
  "drawState": "NY",
  "gameType": "senp",
  "numbers": [42],
  "betAmount": 10,
  "currency": "USD"
}
```

---

## Migrations Applied

1. **migration-001.sql** — Initial schema (users, wallets, vendors, lottery_rounds, lottery_tickets, transactions)
2. **migration-002.sql** — Added vendor_draw_configs, vendor_game_configs, number_limits, app_settings
3. **migration-003.sql** — Added per-vendor rounds (vendor_id on rounds, prize_pool, vendor_commission_total) — **SUPERSEDED by 004**
4. **migration-004.sql** — Reverted to global rounds. Made vendor_id nullable, restored global UNIQUE constraint, added admin_commission_total, merged duplicate rounds

---

## Recent Changes (Session — Latest)

### Web App (`web/src/`)

| Change                        | File                                           | Details                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payment page light theme      | `web/src/app/player/payment/page.tsx`          | Converted dark theme (bg-slate-900) to light (bg-white, bg-gray-50). Auto-selects payment method based on currency: moncash for HTG, paypal for USD.                   |
| Play page vendor loading      | `web/src/app/player/play/page.tsx`             | Uses `vendorAPI.getVendorById(vendorId)` for full vendor details with draws config. Uses `String()` comparison for IDs.                                                |
| Results banner always visible | `web/src/app/player/dashboard/page.tsx`        | Banner always shows (empty state: "No results yet today" with "View All Results" link). Fixed drawTime label: 'morning' → 'midday' (☀️ Midi).                          |
| Player withdrawal page (NEW)  | `web/src/app/player/withdraw/page.tsx`         | Bank-only withdrawal form (bankName, accountHolderName, accountNumber, routingNumber, notes). Calls `walletAPI.requestWithdrawal()`.                                   |
| Wallet API withdrawal method  | `web/src/lib/api/wallet.ts`                    | Added `requestWithdrawal(data)` → POST `/wallet/withdraw`.                                                                                                             |
| Player sidebar nav            | `web/src/components/layout/player-sidebar.tsx` | Added Banknote icon + `/player/withdraw` nav item.                                                                                                                     |
| Vendor currency toggle hidden | `web/src/components/layout/top-nav.tsx`        | Currency toggle hidden when `pathname?.startsWith("/vendor")`.                                                                                                         |
| Vendor settings cleaned       | `web/src/app/vendor/settings/page.tsx`         | Removed CURRENCIES constant and currency picker Card section.                                                                                                          |
| Vendor payouts bank-only      | `web/src/app/vendor/payouts/page.tsx`          | Removed moncash option, selectedMethod state, moncashPhone. Always uses `method: "bank_transfer"`. Bank detail fields added.                                           |
| Vendor results fix            | `web/src/app/vendor/results/page.tsx`          | Uses `vendorProfile?.operatingCurrency` instead of store currency. Round interface has both `state?` and `drawState?`. DRAW_STATES lookups use `drawState \|\| state`. |

### Mobile App (`src/`)

| Change                         | File                                     | Details                                                                                                                                                           |
| ------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Results banner always visible  | `src/screens/PlayerDashboard.tsx`        | Banner always shows with empty state fallback. Fixed drawTime: 'morning' → 'midday'. Added "Withdraw" quick action button navigating to PlayerWithdrawalScreen.   |
| Player withdrawal screen (NEW) | `src/screens/PlayerWithdrawalScreen.tsx` | Bank-only withdrawal form matching web version. Balance card, bank detail fields, info section, success screen.                                                   |
| Navigation registration        | `src/navigation/AppNavigator.tsx`        | Added PlayerWithdrawalScreen import, type, and Stack.Screen in player group.                                                                                      |
| Wallet API withdrawal method   | `src/api/apiClient.ts`                   | Added `walletAPI.requestWithdrawal(data)` → POST `/wallet/withdraw`.                                                                                              |
| Vendor payouts bank-only       | `src/screens/PayoutManagement.tsx`       | Removed moncash/currency toggle. Bank-only with detail fields (bankName, bankAccountName, bankAccountNumber, bankRoutingNumber). Uses vendor's operatingCurrency. |

### Key Business Rules

- **Withdrawals are bank-only** — Both player and vendor withdrawals use bank transfer exclusively (no moncash withdrawal).
- **Deposits**: MonCash for HTG, PayPal for USD — auto-selected based on active currency.
- **Vendor has no currency switch** — Vendors operate in their `operatingCurrency` (set at registration). No toggle in navbar or settings.
- **Draw times**: `midday` and `evening` (not `morning`). Labels: "☀️ Midi" / "🌙 Aswè".
- **Results banner**: Always visible on player dashboard (both web and mobile). Shows empty state when no results published yet today.

---

## Recent Changes (Session 2 — Admin/Backend Sync)

### Backend (`backend/src/`)

| Change                                  | File                                          | Details                                                                                                                                                                                                                                                                               |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player withdrawal endpoint (NEW)        | `backend/src/routes/walletRoutes.ts`          | Added `POST /wallet/withdraw` route with `authenticate` middleware                                                                                                                                                                                                                    |
| Withdrawal controller (NEW)             | `backend/src/controllers/walletController.ts` | `requestWithdrawal()` — validates input (amount > 0, valid currency, bank details required, min $5/$50G), generates idempotency key, calls `debitWallet()`, stores bank metadata in transaction JSONB                                                                                 |
| Withdrawal metadata storage (NEW)       | `backend/src/services/walletService.ts`       | `updateWithdrawalMetadata()` — stores bank details (bankName, accountHolderName, accountNumber, routingNumber, notes) in `transactions.metadata` JSONB column                                                                                                                         |
| Admin withdrawal list endpoint (NEW)    | `backend/src/routes/adminRoutes.ts`           | `GET /admin/withdrawals/pending` — lists all pending player withdrawals                                                                                                                                                                                                               |
| Admin withdrawal process endpoint (NEW) | `backend/src/routes/adminRoutes.ts`           | `POST /admin/withdrawals/:withdrawalId/process` — approve/reject a player withdrawal                                                                                                                                                                                                  |
| Admin withdrawal controller (NEW)       | `backend/src/controllers/adminController.ts`  | `getPendingWithdrawals()` and `processPlayerWithdrawal()` handlers                                                                                                                                                                                                                    |
| Admin withdrawal service (NEW)          | `backend/src/services/adminService.ts`        | `getPendingWithdrawals()` — queries transactions WHERE type='withdrawal' AND status='pending', JOINs users, extracts bank details from metadata JSONB. `processPlayerWithdrawal()` — updates status to completed/failed, stores admin action in metadata, refunds wallet on rejection |

### Admin App (`grolotto-admin/src/`)

| Change                          | File                                                    | Details                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payout action fix               | `grolotto-admin/src/api/adminAPI.ts`                    | Fixed `processPayout()` to convert 'approve'→'approved', 'reject'→'rejected' (backend expects past tense)                                                                                                                                                                                                               |
| Player withdrawal API (NEW)     | `grolotto-admin/src/api/adminAPI.ts`                    | Added `PlayerWithdrawal` interface, `getPlayerWithdrawals()` → `GET /admin/withdrawals/pending`, `processPlayerWithdrawal()` → `POST /admin/withdrawals/:id/process`                                                                                                                                                    |
| PayoutManagement routing number | `grolotto-admin/src/screens/PayoutManagement.tsx`       | Added `bankRoutingNumber` to Payout interface, mapping, and details modal                                                                                                                                                                                                                                               |
| AdminPaymentManagement rewrite  | `grolotto-admin/src/screens/AdminPaymentManagement.tsx` | Replaced local-only mock logic with real API calls. Player Withdrawals tab now fetches from backend via `getPlayerWithdrawals()`. Approve/reject call `processPlayerWithdrawal()`. Review modal shows flat PlayerWithdrawal fields (playerName, playerEmail, bankName, accountHolderName, accountNumber, routingNumber) |

### Mobile App (`src/`)

| Change                        | File                                     | Details                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PlayerWithdrawalScreen TS fix | `src/screens/PlayerWithdrawalScreen.tsx` | Fixed: replaced `useAppStore(s => s.wallet)` with `walletAPI.getWallet()` + local state. Replaced `useAppStore(s => s.t)` with `getTranslation(key, language)` pattern. |

### Key Architecture Decisions

- **Player withdrawal data flow**: Mobile/Web → `POST /wallet/withdraw` → `walletService.debitWallet()` creates pending transaction → `walletService.updateWithdrawalMetadata()` stores bank details in `transactions.metadata` JSONB → Admin reviews via `GET /admin/withdrawals/pending` → Admin approves/rejects via `POST /admin/withdrawals/:id/process` → On rejection, balance refunded via `walletService.creditWallet()`
- **Transaction metadata**: Bank details for withdrawals are stored in the `transactions.metadata` JSONB column (not in a separate table). Fields: `bankName`, `accountHolderName`, `accountNumber`, `routingNumber`, `notes`, `adminAction`, `adminNotes`, `processedAt`
- **Admin payout actions**: Backend expects past tense: `'approved'` / `'rejected'` (not `'approve'` / `'reject'`). Admin API layer converts before sending.
- **Mobile AppState patterns**: `wallet` and `t` (translation) are NOT in the Zustand store. Wallet data fetched via `walletAPI.getWallet()` into local state. Translations via `getTranslation(key, language)` from `src/utils/translations`.
