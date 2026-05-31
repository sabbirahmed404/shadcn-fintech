"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  readOfflineCache,
  subscribeToOfflineCacheInvalidations,
  writeOfflineCache,
} from "@/lib/offline-cache"

type UseCachedQueryOptions<T> = {
  key: string
  userId: string
  fetcher: () => Promise<T>
  initialData: T
}

export type CachedQueryResult<T> = {
  data: T
  isLoading: boolean
  isRefreshing: boolean
  isOffline: boolean
  error: Error | null
  cachedAt: string | null
  refresh: () => Promise<void>
}

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false
}

function invalidationMatches(queryKey: string, invalidatedKey: string) {
  if (invalidatedKey === queryKey) return true
  if (!invalidatedKey.endsWith("*")) return false

  return queryKey.startsWith(invalidatedKey.slice(0, -1))
}

export function useCachedQuery<T>({
  key,
  userId,
  fetcher,
  initialData,
}: UseCachedQueryOptions<T>): CachedQueryResult<T> {
  const fetcherRef = useRef(fetcher)
  const mountedRef = useRef(false)
  const hasDataRef = useRef(false)
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(isBrowserOffline)
  const [error, setError] = useState<Error | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const refresh = useCallback(async () => {
    if (isBrowserOffline()) {
      if (mountedRef.current) {
        setIsOffline(true)
        setIsLoading(false)
        setIsRefreshing(false)
      }
      return
    }

    if (mountedRef.current) {
      setIsOffline(false)
      setError(null)
      setIsRefreshing(hasDataRef.current)
      setIsLoading(!hasDataRef.current)
    }

    try {
      const freshData = await fetcherRef.current()
      const savedAt = writeOfflineCache(userId, key, freshData)

      if (!mountedRef.current) return

      setData(freshData)
      hasDataRef.current = true
      setCachedAt(savedAt)
      setError(null)
    } catch (unknownError) {
      if (!mountedRef.current) return

      setError(
        unknownError instanceof Error
          ? unknownError
          : new Error("Failed to refresh cached query")
      )
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [key, userId])

  useEffect(() => {
    mountedRef.current = true

    const cached = readOfflineCache<T>(userId, key)
    if (cached) {
      setData(cached.data)
      hasDataRef.current = true
      setCachedAt(cached.savedAt)
      setIsLoading(false)
    }

    void refresh()

    return () => {
      mountedRef.current = false
    }
  }, [key, refresh, userId])

  useEffect(() => {
    if (typeof window === "undefined") return

    window.addEventListener("online", refresh)
    const unsubscribe = subscribeToOfflineCacheInvalidations((detail) => {
      if (detail.userId !== userId) return
      if (detail.keys.some((invalidatedKey) => invalidationMatches(key, invalidatedKey))) {
        void refresh()
      }
    })

    return () => {
      window.removeEventListener("online", refresh)
      unsubscribe()
    }
  }, [key, refresh, userId])

  return {
    data,
    isLoading,
    isRefreshing,
    isOffline,
    error,
    cachedAt,
    refresh,
  }
}
