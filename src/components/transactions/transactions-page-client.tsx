"use client"

import { useMemo, useState } from "react"

import { TransactionSummary } from "@/components/transactions/transaction-summary"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { TransactionActions } from "@/components/transactions/transaction-actions"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { getTransactions, deleteTransactions, DEMO_USER_ID } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

export function TransactionsPageClient() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { data, isLoading, refresh } = useCachedQuery({
    key: CACHE_KEYS.transactions,
    userId: DEMO_USER_ID,
    fetcher: getTransactions,
    initialData: [],
  })

  const categories = useMemo(() => {
    const cats = new Set(data.map((t) => t.category))
    return Array.from(cats).sort()
  }, [data])

  const filteredData = useMemo(() => {
    let result = data

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          (t.description?.toLowerCase() || "").includes(q) ||
          t.account_name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter)
    }

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter)
    }

    return result
  }, [data, search, categoryFilter, typeFilter])

  function handleExport() {
    const selected = data.filter((t) => selectedIds.has(t.id))
    const header = "Description,Account,Amount,Date,Type"
    const rows = selected.map(
      (t) =>
        `"${t.description || ""}","${t.account_name}",${t.amount},"${new Date(t.occurred_at).toLocaleDateString()}","${t.type}"`
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "transactions.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Are you sure you want to delete ${ids.length} transactions?`)) return
    
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      alert("You are offline. Reconnect to delete transactions.")
      return
    }

    setIsDeleting(true)
    const success = await deleteTransactions(ids)
    if (success) {
      setSelectedIds(new Set())
      await refresh()
    } else {
      alert("Failed to delete transactions")
    }
    setIsDeleting(false)
  }

  if (isLoading || isDeleting) {
    return <TransactionsLoadingSkeleton />
  }

  return (
    <div className="flex flex-col gap-4">
      <TransactionSummary transactions={filteredData} />

      <TransactionFilters
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categories={categories}
        isSelecting={isSelecting}
        setIsSelecting={setIsSelecting}
      />

      <TransactionTable
        transactions={filteredData}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        isSelecting={isSelecting}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
      />

      <TransactionActions
        selectedCount={selectedIds.size}
        onExport={handleExport}
        onClear={() => setSelectedIds(new Set())}
        onDelete={handleDelete}
      />
    </div>
  )
}

function TransactionsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
        <Skeleton className="h-9 w-full rounded-lg sm:w-32" />
        <Skeleton className="h-9 w-full rounded-lg sm:w-32" />
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3"
          >
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:block">
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
