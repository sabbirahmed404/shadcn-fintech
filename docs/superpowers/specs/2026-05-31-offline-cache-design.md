# Offline Cache Design

## Goal

Add a hard local data cache for the installed/mobile web app so Supabase-backed pages can render useful data immediately and remain readable while offline.

Supabase remains the source of truth. Version 1 supports read-only offline access and online-first mutations. The app will not queue offline writes in this phase.

## Scope

The cache will cover client-side reads that currently call functions from `src/lib/supabase.ts` directly:

- accounts
- transactions
- categories
- profile budgets
- savings goals
- contacts
- debts
- transfers
- monthly overview
- money movement
- financial health

Local UI preferences, such as dashboard widget order and install prompt dismissal, stay separate from this data cache for now.

## Architecture

Add `src/lib/offline-cache.ts` as a small browser-only localStorage cache service. It will expose typed helpers for reading, writing, removing, and clearing cached entries.

Each entry is stored as a versioned envelope:

```ts
type CacheEnvelope<T> = {
  version: 1
  key: string
  savedAt: string
  data: T
}
```

Cache keys are namespaced by app version and user:

```ts
wealthos:v1:${userId}:${key}
```

For this app, the initial user namespace can use the existing demo user id because the app currently auto-authenticates with the seeded demo account. The cache service should still accept a user id parameter so real multi-user auth can use the same mechanism later.

## Typed Query Hook

Add a reusable client hook similar to:

```ts
useCachedQuery<T>({
  key: "accounts",
  userId: DEMO_USER_ID,
  fetcher: getAccounts,
  initialData: [],
})
```

The hook behavior:

1. Read cached data on mount and render it immediately if available.
2. If `navigator.onLine` is false, keep cached data and report offline/stale status.
3. If online, call the Supabase fetcher in the background.
4. On successful fetch, update localStorage and component state.
5. On fetch failure, keep existing cached data if present and expose an error state.
6. Listen for `online` events and revalidate the active query.

Return shape:

```ts
type CachedQueryResult<T> = {
  data: T
  isLoading: boolean
  isRefreshing: boolean
  isOffline: boolean
  error: Error | null
  cachedAt: string | null
  refresh: () => Promise<void>
}
```

`isLoading` is true only when there is no cached data and an online fetch is still pending. `isRefreshing` is true when the UI already has cached or previous data and a fresh fetch is running.

## Mutations

All mutations continue to call `src/lib/supabase.ts` and require network access.

Mutation components should:

- Check online status before attempting a write.
- Show a concise offline message when a write is unavailable.
- Perform the Supabase mutation when online.
- Invalidate or refresh related cache keys after a successful mutation.

Examples:

- `addTransaction` refreshes `transactions`, `accounts`, `monthly-overview`, `money-movement:*`, and `financial-health`.
- `deleteTransactions` refreshes the same transaction-derived keys.
- `addAccount`, `updateAccountBalance`, and `updateAccountDetails` refresh `accounts`, `monthly-overview`, and `financial-health`.
- Budget updates refresh `profile-budgets` and any budget page queries that depend on transactions.
- `addContact`, `updateContact`, and `deleteContact` refresh `contacts`, `debts`, `transfers`, and `transactions`.
- `recordMoneyMovement` and `repayDebt` refresh `debts`, `transfers`, `transactions`, `accounts`, `money-movement:*`, and `financial-health`.

No offline mutation queue is included in v1. This avoids financial conflicts and false success states.

## Page Integration

Replace direct `useEffect(() => getX())` patterns in client components with `useCachedQuery`.

Dashboard components that read the same data should converge on the same cache keys so one fresh fetch improves later page loads. Components can still compute derived values locally from cached raw data when that keeps the existing component boundaries simple.

Initial integration should prioritize the pages users are most likely to open from an installed mobile app:

- dashboard
- accounts
- transactions
- budgets
- transfers
- contacts

The remaining analytics-style widgets can adopt the same hook after the core flows are stable.

## PWA And Mobile Feel

Add a `public/sw.js` service worker and a tiny client registration component mounted from the dashboard layout.

The service worker should cache the app shell and static assets needed for installed-app startup. It should not cache Supabase API responses directly in v1 because app data is handled by the typed localStorage cache.

Mobile polish:

- Preserve the existing manifest and install prompt.
- Make installed mode feel more native with safe-area-aware layout, no tap highlight, restrained overscroll, and stable bottom navigation spacing.
- Keep offline status subtle: users should see cached content first, with small status affordances only where useful.

## Error Handling

If localStorage is unavailable, full, or contains invalid JSON, the cache service should fail soft:

- Ignore invalid entries.
- Remove corrupt entries when safe.
- Continue using live Supabase data when online.
- Avoid crashing render paths.

Fetch errors should not erase existing cached data. The UI should prefer stale-but-visible financial data over empty screens.

## Testing

Add focused tests for the cache service:

- Serializes and reads a valid envelope.
- Rejects mismatched cache versions.
- Removes corrupt JSON.
- Namespaces keys by user id.
- Clears entries for a user without touching unrelated localStorage keys.

Add a hook-level test for `useCachedQuery`:

- Cached data renders before the fetch resolves.
- Online refresh updates cache and state.
- Offline mode skips the fetch and returns cached data.

Manual verification should include:

- Load dashboard online, then reload with network disabled and confirm cached data renders.
- Install/open as a PWA where supported and confirm route shell loads quickly.
- Attempt a mutation while offline and confirm it is blocked with a clear message.

## Non-Goals

- Offline write queues.
- Conflict resolution.
- IndexedDB migration.
- Supabase schema changes.
- Server-side Next.js cache component work.
- Direct caching of Supabase REST responses in the service worker.
