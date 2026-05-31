import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

import {
  CACHE_VERSION,
  buildOfflineCacheKey,
  clearOfflineCacheForUser,
  readOfflineCache,
  removeOfflineCache,
  writeOfflineCache,
} from "./offline-cache.ts"

class MemoryStorage {
  constructor() {
    this.store = new Map()
  }

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  key(index) {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key) {
    this.store.delete(key)
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

test("writes and reads a versioned cache envelope", () => {
  const savedAt = writeOfflineCache("user-a", "accounts", [{ id: "acct-1" }])
  const entry = readOfflineCache("user-a", "accounts")

  assert.equal(entry.version, CACHE_VERSION)
  assert.equal(entry.key, "accounts")
  assert.equal(entry.savedAt, savedAt)
  assert.deepEqual(entry.data, [{ id: "acct-1" }])
})

test("rejects mismatched cache versions and removes the stale entry", () => {
  const key = buildOfflineCacheKey("user-a", "accounts")
  localStorage.setItem(
    key,
    JSON.stringify({
      version: CACHE_VERSION - 1,
      key: "accounts",
      savedAt: "2026-05-31T00:00:00.000Z",
      data: [{ id: "old" }],
    })
  )

  assert.equal(readOfflineCache("user-a", "accounts"), null)
  assert.equal(localStorage.getItem(key), null)
})

test("removes corrupt JSON without throwing", () => {
  const key = buildOfflineCacheKey("user-a", "transactions")
  localStorage.setItem(key, "{bad json")

  assert.equal(readOfflineCache("user-a", "transactions"), null)
  assert.equal(localStorage.getItem(key), null)
})

test("namespaces cache keys by user id", () => {
  writeOfflineCache("user-a", "accounts", [{ id: "a" }])
  writeOfflineCache("user-b", "accounts", [{ id: "b" }])

  assert.deepEqual(readOfflineCache("user-a", "accounts").data, [{ id: "a" }])
  assert.deepEqual(readOfflineCache("user-b", "accounts").data, [{ id: "b" }])
})

test("clears only cache entries for one user", () => {
  writeOfflineCache("user-a", "accounts", [{ id: "a" }])
  writeOfflineCache("user-a", "transactions", [{ id: "tx" }])
  writeOfflineCache("user-b", "accounts", [{ id: "b" }])
  localStorage.setItem("dashboard-layout", "keep-me")

  clearOfflineCacheForUser("user-a")

  assert.equal(readOfflineCache("user-a", "accounts"), null)
  assert.equal(readOfflineCache("user-a", "transactions"), null)
  assert.deepEqual(readOfflineCache("user-b", "accounts").data, [{ id: "b" }])
  assert.equal(localStorage.getItem("dashboard-layout"), "keep-me")
})

test("removes a single cache entry", () => {
  writeOfflineCache("user-a", "accounts", [{ id: "a" }])
  writeOfflineCache("user-a", "transactions", [{ id: "tx" }])

  removeOfflineCache("user-a", "accounts")

  assert.equal(readOfflineCache("user-a", "accounts"), null)
  assert.deepEqual(readOfflineCache("user-a", "transactions").data, [
    { id: "tx" },
  ])
})
