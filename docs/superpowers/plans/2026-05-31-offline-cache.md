# Offline Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a central localStorage cache and PWA shell support so Supabase-backed pages render cached data immediately and remain readable offline.

**Architecture:** `src/lib/supabase.ts` remains the online source of truth. A new `src/lib/offline-cache.ts` stores versioned, user-scoped envelopes in localStorage, and `src/hooks/use-cached-query.ts` bridges cached reads with background Supabase refreshes. A service worker caches the app shell/static assets, while page components migrate repeated `useEffect(getX)` reads to the hook.

**Tech Stack:** Next.js 16 App Router, React 19 client components, Supabase JS, localStorage, browser Service Worker API, Node `node:test`.

---

### Task 1: Cache Service

**Files:**
- Create: `src/lib/offline-cache.ts`
- Test: `src/lib/offline-cache.test.mjs`

- [ ] **Step 1: Write failing cache service tests**

Create `src/lib/offline-cache.test.mjs` with behavioral tests for valid reads, version rejection, corrupt JSON removal, user namespacing, and scoped clearing.

- [ ] **Step 2: Run cache service tests and verify they fail**

Run: `node --test src/lib/offline-cache.test.mjs`

Expected: FAIL because `src/lib/offline-cache.ts` does not exist yet.

- [ ] **Step 3: Implement cache service**

Create `src/lib/offline-cache.ts` with `CACHE_VERSION`, `CACHE_PREFIX`, `CACHE_KEYS`, `readOfflineCache`, `writeOfflineCache`, `removeOfflineCache`, `clearOfflineCacheForUser`, `invalidateOfflineCache`, and `subscribeToOfflineCacheInvalidations`.

- [ ] **Step 4: Run cache service tests and verify they pass**

Run: `node --test src/lib/offline-cache.test.mjs`

Expected: PASS.

### Task 2: Cached Query Hook

**Files:**
- Create: `src/hooks/use-cached-query.ts`
- Test: `src/hooks/use-cached-query.test.mjs`

- [ ] **Step 1: Write failing hook wiring tests**

Create `src/hooks/use-cached-query.test.mjs` to assert the hook reads cached data first, writes fresh data after fetch, listens to browser `online`, and subscribes to cache invalidation events.

- [ ] **Step 2: Run hook wiring tests and verify they fail**

Run: `node --test src/hooks/use-cached-query.test.mjs`

Expected: FAIL because `src/hooks/use-cached-query.ts` does not exist yet.

- [ ] **Step 3: Implement `useCachedQuery`**

Create a client hook returning `{ data, isLoading, isRefreshing, isOffline, error, cachedAt, refresh }`. Use the cache service for initial reads and successful refresh writes. Revalidate on `online` and matching invalidation events.

- [ ] **Step 4: Run hook tests and cache tests**

Run: `node --test src/lib/offline-cache.test.mjs src/hooks/use-cached-query.test.mjs`

Expected: PASS.

### Task 3: Mutation Invalidation

**Files:**
- Modify: `src/lib/supabase.ts`

- [ ] **Step 1: Add failing source guard test**

Extend or create a test that checks Supabase mutation functions call `invalidateOfflineCache` with affected keys.

- [ ] **Step 2: Run the guard test and verify it fails**

Run the new test.

Expected: FAIL because mutation invalidation has not been wired.

- [ ] **Step 3: Import cache invalidation and wire successful mutations**

After successful mutations, invalidate the relevant cache keys from the design spec. Do not change the Supabase read/write behavior.

- [ ] **Step 4: Run the guard test**

Expected: PASS.

### Task 4: Core Page Integration

**Files:**
- Modify: `src/components/transactions/transactions-page-client.tsx`
- Modify: `src/components/accounts/accounts-page-client.tsx`
- Modify: `src/components/dashboard/total-balance.tsx`
- Modify: `src/components/dashboard/account-cards.tsx`
- Modify: `src/components/dashboard/recent-transactions.tsx`
- Modify: `src/components/budgets/month-projection.tsx`
- Modify: `src/components/budgets/spending-calendar.tsx`
- Modify: `src/components/transfers/transfers-page-client.tsx`

- [ ] **Step 1: Add source guard test for hook adoption**

Create a test that confirms these high-traffic components import `useCachedQuery` and no longer fetch their primary read through a mount-only `useEffect`.

- [ ] **Step 2: Run the guard test and verify it fails**

Expected: FAIL before component migration.

- [ ] **Step 3: Replace direct read effects with `useCachedQuery`**

Use stable cache keys from `CACHE_KEYS`. Keep existing skeleton behavior by treating `isLoading` as loading only when no cached data exists. After successful mutations, call the hook `refresh` where the component already reloads data.

- [ ] **Step 4: Run the guard test**

Expected: PASS.

### Task 5: PWA Service Worker And Mobile Polish

**Files:**
- Create: `public/sw.js`
- Create: `src/components/pwa-service-worker.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/pwa-service-worker.test.mjs`

- [ ] **Step 1: Add failing PWA source tests**

Assert the dashboard layout mounts `PwaServiceWorker`, the registration component calls `navigator.serviceWorker.register("/sw.js")`, and `public/sw.js` avoids caching Supabase API responses.

- [ ] **Step 2: Run the PWA tests and verify they fail**

Expected: FAIL before the service worker files exist.

- [ ] **Step 3: Implement service worker registration and shell cache**

Add a browser-only component for registration. Add a service worker that caches app shell/static GET requests, serves cached static responses offline, and bypasses Supabase URLs.

- [ ] **Step 4: Add mobile installed-app CSS polish**

Add safe-area/tap-highlight/overscroll rules in `src/app/globals.css` without changing the app palette.

- [ ] **Step 5: Run PWA tests**

Expected: PASS.

### Task 6: Verification

**Files:**
- No new files unless failures require focused fixes.

- [ ] **Step 1: Run targeted tests**

Run: `node --test src/lib/offline-cache.test.mjs src/hooks/use-cached-query.test.mjs src/lib/supabase-cache-invalidation.test.mjs src/components/offline-cache-adoption.test.mjs src/components/pwa-service-worker.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: PASS.

- [ ] **Step 3: Build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 4: Commit implementation**

Commit all implementation and tests with message `feat: add offline cache and pwa shell`.
