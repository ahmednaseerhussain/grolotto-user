# Deep-Dive Web App Review & Fix Plan

## Problem Summary

The Next.js web app at `d:\grolotto-fresh\web` has **3 critical issues** causing `/login` to 404 and all player routes to be unreachable. The root cause is a **route architecture mismatch**: the `(player)` folder is a route group (parentheses = invisible in URL), producing routes like `/dashboard` instead of `/player/dashboard`. But ALL 60+ navigation links use the `/player/` prefix. This also creates a **route conflict** between `(player)/vendor/[id]` (→ `/vendor/[id]`) and the physical `vendor/` directory.

---

## Steps

### Step 1 — Rename `src/app/(player)/` → `src/app/player/`

**Why:** `(player)` is a Next.js route group — the parenthesized segment is excluded from the URL. Pages inside map to `/dashboard`, `/play`, `/history`, etc. But ALL sidebar links in `player-sidebar.tsx` (L12-21), ALL `router.push()` calls across 13+ player pages, and the root page redirect at `page.tsx:17` reference `/player/dashboard`, `/player/play`, etc. — routes that **don't exist**.

**Fix:** Rename `src/app/(player)/` → `src/app/player/` so it becomes a real URL segment matching all navigation links.

**Bonus:** Eliminates the route conflict between `(player)/vendor/[id]` (which maps to `/vendor/[id]`) and the physical `vendor/` directory — this conflict likely breaks the entire route tree including `(auth)` pages, causing the `/login` 404.

**Files affected:**
- `src/app/(player)/` → `src/app/player/` (folder rename, 14 files move)
- No code changes needed — all links already use `/player/` prefix

---

### Step 2 — Fix vendor layout redirect

**File:** `web/src/app/vendor/layout.tsx` line 18

**Problem:** When a non-vendor user visits a vendor page, it redirects to `/dashboard`. This route doesn't exist (it's `/player/dashboard` after Step 1).

**Fix:** Change `router.replace("/dashboard")` → `router.replace("/player/dashboard")`

---

### Step 3 — Redirect `/vendor/pricing` → `/vendor/draws`

**File:** `web/src/components/layout/vendor-sidebar.tsx` line 33

**Problem:** Sidebar links to `/vendor/pricing` but no `vendor/pricing/page.tsx` exists. The draws page already has pricing controls (min/max per game).

**Fix:** Change `href: "/vendor/pricing"` → `href: "/vendor/draws"`

---

### Step 4 — Remove `turbopack.root` from next.config.ts

**File:** `web/next.config.ts` line 5-7

**Problem:** `turbopack: { root: path.resolve(__dirname) }` was added as a build workaround but can cause dev-mode path resolution issues.

**Fix:** Remove the turbopack config and the `path` import. Return to minimal config.

---

### Step 5 — Fix Zustand hydration mismatch

**File:** `web/src/store/app-store.ts`

**Problem:** Store uses `persist` middleware with `localStorage`. During SSR, store has default values (not authenticated). On client hydration, it reads from `localStorage`. This mismatch causes:
- Flash of spinner before redirect
- Potential hydration errors
- Layouts making wrong auth decisions before rehydration completes

**Fix:** Add `_hasHydrated` field with `onRehydrateStorage` callback. Update auth guard layouts (`player/layout.tsx`, `vendor/layout.tsx`, `page.tsx`) to wait for hydration before checking auth state.

---

### Step 6 — Fix `Vendor.draws` type

**File:** `web/src/types/index.ts`

**Problem:** `Vendor` type defines `draws` as `DrawConfig[]` (array), but vendor pages like `draws/page.tsx:45` and `number-limits/page.tsx:50` index it as a dictionary (`draws["NY"]`). The API likely returns an object keyed by state code, not an array.

**Fix:** Change `draws` type to `Record<string, any> | DrawConfig[]` or `Record<string, DrawConfig>` with proper type guards where needed.

---

### Step 7 — Full build + dev test

- `npx next build` — verify 0 TypeScript errors, all 28+ routes in output
- `npx next dev` — verify:
  - `localhost:3000` → redirects to `/login`
  - `/login` → shows role selection (Player / Vendor)
  - `/player-login` → login form → redirects to `/player/dashboard`
  - `/vendor-login` → login form → redirects to `/vendor/dashboard`
  - All 10 player sidebar links navigate correctly
  - All vendor sidebar links navigate correctly

---

## Route Map (After Fix)

| Auth (route group) | Player (real folder) | Vendor (real folder) |
|---|---|---|
| `/login` | `/player/dashboard` | `/vendor/dashboard` |
| `/player-login` | `/player/play` | `/vendor/draws` |
| `/vendor-login` | `/player/history` | `/vendor/number-limits` |
| `/vendor-register` | `/player/results` | `/vendor/payouts` |
| | `/player/tchala` | `/vendor/history` |
| | `/player/rewards` | `/vendor/today` |
| | `/player/transactions` | `/vendor/results` |
| | `/player/payment` | `/vendor/profile` |
| | `/player/payment-methods` | `/vendor/settings` |
| | `/player/notifications` | |
| | `/player/settings` | |
| | `/player/profile` | |
| | `/player/vendor/[id]` | |
