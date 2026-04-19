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
https://grolotto-user-wk3b.onrender.com/api
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

---

## Recent Changes (Session 3 — Bug Fixes)

### Bugs Fixed

| Bug                                      | File(s)                                                                                                                                                        | Fix                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Gift card `purchased_by` NOT NULL error  | `backend/src/server.ts` (inline migration)                                                                                                                     | Removed NOT NULL from inline CREATE TABLE, added ALTER TABLE safety to drop NOT NULL, added missing columns (batch_id, pin_code, is_redeemed) |
| Rate limiting / server timeout           | `backend/src/config/index.ts`, `backend/src/server.ts`, `backend/src/database/pool.ts`                                                                         | maxRequests 100→1000, auth limiter 10→30, DB pool 20→50, timeout 2s→10s                                                                       |
| Midday label everywhere                  | `grolotto-admin/src/screens/ResultPublishing.tsx`, `backend/src/services/lotteryService.ts`, `backend/src/server.ts`, `backend/src/database/migration-005.sql` | Fixed `getDrawTimeSlot()` broken time matching, added evening draw configs for all states, removed silent midday default                      |
| Admin player details modal not scrolling | `grolotto-admin/src/screens/PlayerManagement.tsx`                                                                                                              | Rewrote modal to use FlatList with explicit height from Dimensions                                                                            |
| React Hooks order violation              | `grolotto-admin/src/screens/PlayerManagement.tsx`                                                                                                              | Moved `if (!player) return null` after all hooks                                                                                              |

---

## Client Change Request — Phased Implementation Plan

> Reference: `GroLotto_Change_Request.txt` (40+ items across Vendor, Player, Admin, Platform)

### Feature Audit Summary

| Feature                          | Status      | Notes                                                                                 |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| Vendor currency separation       | ⚠️ PARTIAL  | DB field `operating_currency` exists, backend returns it, frontend filtering NOT done |
| Vendor signup approval flow      | ⚠️ PARTIAL  | Status flow complete, document upload endpoint missing                                |
| Vendor draw open/close timer     | ❌ MISSING  | No time-based scheduling, only on/off toggle per state                                |
| Gift card system                 | ✅ COMPLETE | Full purchase/generate/redeem pipeline                                                |
| Notifications                    | ⚠️ PARTIAL  | DB tables & service exist, NO push notifications, NO UI display                       |
| Tchala (dream book)              | ✅ COMPLETE | Full CRUD, multilingual support, player & admin UI                                    |
| Wallet recharge (MonCash/PayPal) | ✅ COMPLETE | MonCash for HTG, PayPal for USD, gift cards                                           |
| Admin roles/permissions          | ⚠️ PARTIAL  | Basic role check (admin/vendor/player), no granular permissions                       |
| Vendor play history/export       | ⚠️ PARTIAL  | View history works, no CSV/PDF export                                                 |
| Help section / multilingual      | ⚠️ PARTIAL  | Help page exists but hardcoded English                                                |

### Phase 1: Critical Bugs & Fixes

| #   | Task                              | CR Ref | Status  |
| --- | --------------------------------- | ------ | ------- |
| 1.1 | Admin settings page crash         | 3.10   | ✅ DONE |
| 1.2 | Player vendor list crash          | 2.9    | ✅ DONE |
| 1.3 | Admin payout shortcut not working | 3.1    | ✅ DONE |
| 1.4 | Midday/evening draw label fix     | 3.2    | ✅ DONE |
| 1.5 | Gift card purchased_by error      | 3.4    | ✅ DONE |
| 1.6 | Rate limiting / timeout           | —      | ✅ DONE |

### Phase 2: Currency Separation

| #   | Task                                                        | CR Ref        |
| --- | ----------------------------------------------------------- | ------------- |
| 2.1 | Frontend vendor filtering by player currency (web + mobile) | 1.1, 1.3, 2.1 |
| 2.2 | Wallet color: HTG=red, USD=green (web + mobile)             | 1.2, 2.2      |
| 2.3 | Remove $ sign for HTG currency display                      | 2.2           |
| 2.4 | Currency-specific withdrawal methods                        | 1.6           |
| 2.5 | Currency-specific recharge methods                          | 2.5           |
| 2.6 | Transaction history currency tabs (admin)                   | 3.8           |

### Phase 3: Vendor Features

| #   | Task                                       | CR Ref |
| --- | ------------------------------------------ | ------ |
| 3.1 | Vendor draw schedule — open/close timer    | 1.7    |
| 3.2 | Vendor play history enhanced fields        | 1.8    |
| 3.3 | Vendor pre-result export (CSV)             | 1.9    |
| 3.4 | Vendor post-result export (CSV + filters)  | 1.10   |
| 3.5 | Document upload endpoint for vendor signup | 1.5    |

### Phase 4: Player Features

| #   | Task                                             | CR Ref   |
| --- | ------------------------------------------------ | -------- |
| 4.1 | Replace Wallet shortcut with Withdraw            | 2.3      |
| 4.2 | Enforce wallet-only gameplay                     | 2.4      |
| 4.3 | Gift card buy→website redirect, redeem→PIN entry | 2.6, 2.7 |
| 4.4 | Withdrawal method limits display                 | 2.8      |
| 4.5 | Banner ads auto-slide + manual swipe             | 2.12     |

### Phase 5: Admin Panel

| #   | Task                                              | CR Ref |
| --- | ------------------------------------------------- | ------ |
| 5.1 | Simplified result publishing                      | 3.2    |
| 5.2 | Gift card management polish (HTG/USD tabs, stats) | 3.4    |
| 5.3 | Admin roles & permissions                         | 3.9    |
| 5.4 | Admin payments logic                              | 3.11   |
| 5.5 | Account suspension enforcement                    | 3.12   |
| 5.6 | Ads editor improvements                           | 3.7    |

### Phase 6: Platform-Wide Polish

| #   | Task                                            | CR Ref    |
| --- | ----------------------------------------------- | --------- |
| 6.1 | Push notifications (Expo/FCM) + notification UI | 3.5, 3.6  |
| 6.2 | Full multilingual translation                   | 4.2, 2.10 |
| 6.3 | Tchala reflection fix                           | 2.11, 3.3 |
| 6.4 | Text orthography & formatting fixes             | 4.1       |
| 6.5 | Performance optimization                        | 4.3       |
| 6.6 | Admin notification page fix                     | 3.6       |

---

## Session 4 — Full Change Request Implementation (All 6 Phases Complete)

### Phase 1-3: Completed in earlier session chunks

### Phase 4: Player Features ✅

- 4.1: Wallet → Withdraw quick action (mobile + web)
- 4.3: Gift card Buy tab → website redirect on mobile (web keeps Buy form since web IS the website)
- 4.4: Withdrawal limits display (min/max per method, validation on both platforms)

### Phase 5: Admin Panel ✅

- 5.1: Simplified result publishing (state + time buttons instead of draw list)
- 5.2: Gift card management (status filter, recent redemptions section)
- 5.3: Admin roles & permissions (migration-011, backend CRUD, auth middleware)
- 5.4: Admin payments ("To Vendors" earnings tab added)
- 5.5: Account suspension (401 vs 403 error separation, clear messages)
- 5.6: Ads editor (expanded colors, custom hex, font size/weight controls)

### Phase 6: Platform-Wide Polish ✅

- 6.1: Push notifications — full Expo Push pipeline
  - `push_device_tokens` table (migration in server.ts)
  - Backend: token registration/removal endpoints at `/notifications/device-token`
  - Backend: Expo Push API integration in `notificationService.ts` (sends to exp.host, handles batching, auto-deactivates invalid tokens)
  - Backend: `createPlayerNotification` and `createVendorNotification` now auto-trigger push
  - Backend: `broadcastNotification` now sends push to all devices of target role
  - Mobile: `src/utils/pushNotifications.ts` — permission request, token retrieval, foreground handler (setNotificationHandler)
  - Mobile: `AppNavigator.tsx` — auto-registers push on login, unregisters on logout
  - Mobile API: `registerPushToken`/`removePushToken` added to `notificationsAPI`
- 6.2: Multilingual — added missing translation keys (notifications, gift card redirect, schedule times, help/support, tchala screen, settings alerts) to both mobile and web translation files
- 6.3: Tchala reflection fix — TWO root causes fixed:
  - Mobile: `tchalaStore.ts` was 100% hardcoded — rewritten to fetch from `/tchala/all` API with fallback
  - Web: `web/src/lib/api/public.ts` used wrong query param `keyword` instead of `q` — fixed
- 6.4: Text orthography — replaced all hardcoded English strings in TchalaScreen and SettingsScreen with `t()` translation calls
- 6.5: Performance optimization:
  - Backend: Cache-Control headers on public endpoints (settings 5min, ads 10min, tchala 30min)
  - Web: next.config.ts image optimization (avif/webp formats)
  - Mobile: FlatList renderNotification memoized with useCallback
- 6.6: Admin notification page fix:
  - `broadcast_history` table (migration in server.ts) — logs every broadcast with sender, count, timestamp
  - `GET /admin/notifications/history` endpoint with pagination
  - Admin app: `AppManagement.tsx` now fetches and displays broadcast history from backend
  - Success alert shows "Sent to N users" count

### New Files Created This Session

- `backend/src/database/migration-012.sql` — push_device_tokens DDL (also embedded in server.ts startup migrations)
- `src/utils/pushNotifications.ts` — Expo push notification registration/unregistration utility

### Key Database Changes

- `push_device_tokens` table: user_id, token, platform, is_active
- `broadcast_history` table: title, message, type, target_audience, total_sent, sent_by
- `admin_role` column on users table (from Phase 5.3)
