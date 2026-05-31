export const CACHE_VERSION = 1
export const CACHE_PREFIX = "wealthos"
export const CACHE_INVALIDATION_EVENT = "wealthos-cache-invalidated"

export const CACHE_KEYS = {
  accounts: "accounts",
  transactions: "transactions",
  categories: "categories",
  profileBudgets: "profile-budgets",
  savingsGoals: "savings-goals",
  contacts: "contacts",
  debts: "debts",
  transfers: "transfers",
  monthlyOverview: "monthly-overview",
  moneyMovement: (period: string) => `money-movement:${period}`,
  financialHealth: "financial-health",
} as const

export type CacheEnvelope<T> = {
  version: typeof CACHE_VERSION
  key: string
  savedAt: string
  data: T
}

type CacheInvalidationDetail = {
  userId: string
  keys: string[]
}

function getStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null
  return localStorage
}

function cacheUserPrefix(userId: string) {
  return `${CACHE_PREFIX}:v${CACHE_VERSION}:${userId}:`
}

export function buildOfflineCacheKey(userId: string, key: string) {
  return `${cacheUserPrefix(userId)}${key}`
}

function parseEnvelope<T>(
  userId: string,
  key: string,
  rawValue: string
): CacheEnvelope<T> | null {
  try {
    const parsed = JSON.parse(rawValue) as Partial<CacheEnvelope<T>>

    if (
      parsed.version !== CACHE_VERSION ||
      parsed.key !== key ||
      typeof parsed.savedAt !== "string" ||
      !("data" in parsed)
    ) {
      removeOfflineCache(userId, key)
      return null
    }

    return parsed as CacheEnvelope<T>
  } catch {
    removeOfflineCache(userId, key)
    return null
  }
}

export function readOfflineCache<T>(
  userId: string,
  key: string
): CacheEnvelope<T> | null {
  const storage = getStorage()
  if (!storage) return null

  const rawValue = storage.getItem(buildOfflineCacheKey(userId, key))
  if (!rawValue) return null

  return parseEnvelope<T>(userId, key, rawValue)
}

export function writeOfflineCache<T>(
  userId: string,
  key: string,
  data: T
): string | null {
  const storage = getStorage()
  if (!storage) return null

  const savedAt = new Date().toISOString()
  const envelope: CacheEnvelope<T> = {
    version: CACHE_VERSION,
    key,
    savedAt,
    data,
  }

  try {
    storage.setItem(buildOfflineCacheKey(userId, key), JSON.stringify(envelope))
    return savedAt
  } catch {
    return null
  }
}

export function removeOfflineCache(userId: string, key: string) {
  const storage = getStorage()
  if (!storage) return

  storage.removeItem(buildOfflineCacheKey(userId, key))
}

export function clearOfflineCacheForUser(userId: string) {
  const storage = getStorage()
  if (!storage) return

  const prefix = cacheUserPrefix(userId)
  const keysToRemove: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key)
  }
}

function removeMatchingKeys(userId: string, keyPattern: string) {
  const storage = getStorage()
  if (!storage) return

  if (!keyPattern.endsWith("*")) {
    removeOfflineCache(userId, keyPattern)
    return
  }

  const cachePrefix = buildOfflineCacheKey(userId, keyPattern.slice(0, -1))
  const keysToRemove: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(cachePrefix)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key)
  }
}

function dispatchInvalidation(detail: CacheInvalidationDetail) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent<CacheInvalidationDetail>(CACHE_INVALIDATION_EVENT, {
      detail,
    })
  )
}

export function invalidateOfflineCache(userId: string, keys: string[]) {
  for (const key of keys) {
    removeMatchingKeys(userId, key)
  }

  dispatchInvalidation({ userId, keys })
}

export function subscribeToOfflineCacheInvalidations(
  callback: (detail: CacheInvalidationDetail) => void
) {
  if (typeof window === "undefined") return () => {}

  const listener = (event: Event) => {
    callback((event as CustomEvent<CacheInvalidationDetail>).detail)
  }

  window.addEventListener(CACHE_INVALIDATION_EVENT, listener)
  return () => window.removeEventListener(CACHE_INVALIDATION_EVENT, listener)
}
