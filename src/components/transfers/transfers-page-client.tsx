"use client"

import { useMemo, useState } from "react"

import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { DEMO_USER_ID, getTransfers } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { TransferStats } from "@/components/transfers/transfer-stats"
import { TransferList } from "@/components/transfers/transfer-list"
import { QuickSend } from "@/components/transfers/quick-send"

type TabKey = "all" | "sent" | "received" | "debts"

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
  { key: "debts", label: "Debts" },
]

export function TransfersPageClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const {
    data: transfers,
    isLoading: loading,
    refresh,
  } = useCachedQuery({
    key: CACHE_KEYS.transfers,
    userId: DEMO_USER_ID,
    fetcher: getTransfers,
    initialData: [],
  })

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "sent":
        return transfers.filter((t) => t.direction === "out")
      case "received":
        return transfers.filter((t) => t.direction === "in")
      case "debts":
        return transfers.filter((t) => ["lend", "borrow", "repay"].includes(t.intent))
      default:
        return transfers
    }
  }, [activeTab, transfers])

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <TransferStats transfers={transfers} />

      {/* Tab filter bar */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transfer list */}
      <TransferList transfers={filtered} loading={loading} />

      {/* Quick send */}
      <QuickSend onSent={refresh} />
    </div>
  )
}
