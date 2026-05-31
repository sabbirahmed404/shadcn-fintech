import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const hookSource = () => readFileSync("src/hooks/use-cached-query.ts", "utf8")

test("cached query hook exposes the v1 cache query contract", () => {
  const source = hookSource()

  assert.match(source, /export type CachedQueryResult<T>/)
  assert.match(source, /data: T/)
  assert.match(source, /isLoading: boolean/)
  assert.match(source, /isRefreshing: boolean/)
  assert.match(source, /isOffline: boolean/)
  assert.match(source, /cachedAt: string \| null/)
  assert.match(source, /refresh: \(\) => Promise<void>/)
})

test("cached query hook reads cached data before running the fetcher", () => {
  const source = hookSource()

  assert.match(source, /readOfflineCache<T>\(userId, key\)/)
  assert.match(source, /setData\(cached\.data\)/)
  assert.match(source, /setCachedAt\(cached\.savedAt\)/)
})

test("cached query hook writes fresh data and listens for revalidation triggers", () => {
  const source = hookSource()

  assert.match(source, /writeOfflineCache\(userId, key, freshData\)/)
  assert.match(source, /window\.addEventListener\("online", refresh\)/)
  assert.match(source, /subscribeToOfflineCacheInvalidations/)
  assert.match(source, /detail\.keys\.some/)
})
