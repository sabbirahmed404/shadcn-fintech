"use client"

import { useMemo, useState, useEffect } from "react"

import type { BankAccount } from "@/data/seed"
import { cn } from "@/lib/utils"
import { AccountSummary } from "@/components/accounts/account-summary"
import { AccountCard } from "@/components/accounts/account-grid"
import { AddAccount } from "@/components/accounts/add-account"
import { EmptyState } from "@/components/empty-state"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { DEMO_USER_ID, getAccounts } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { getInstitutionLogo } from "@/lib/utils"

const filterTabs = [
  { value: "all", label: "All" },
  { value: "bank", label: "Bank Accounts" },
  { value: "cash", label: "Cash Wallet" },
  { value: "mfs", label: "Mobile Money" },
] as const

type AccountType = (typeof filterTabs)[number]["value"]

function mapDbAccount(d: Awaited<ReturnType<typeof getAccounts>>[number]): BankAccount {
  return {
    id: d.id,
    name: d.name,
    type: d.type as BankAccount["type"],
    institution: d.provider || "Self",
    institutionLogo: getInstitutionLogo(d.provider),
    accountNumber: d.account_number_last4 ? `****${d.account_number_last4}` : "****",
    balance: d.balance,
    currency: d.currency === "USD" ? "$" : d.currency === "EUR" ? "€" : "৳",
    change: 0,
    changePercent: 0,
    lastActivity: "Live",
    color: d.type === "cash" ? "bg-emerald-500" : d.type === "mfs" ? "bg-pink-500" : "bg-blue-500",
  }
}

export function AccountsPageClient() {
  const [selectedType, setSelectedType] = useState<AccountType>("all")
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const {
    data: dbAccounts,
    isLoading,
    refresh,
  } = useCachedQuery({
    key: CACHE_KEYS.accounts,
    userId: DEMO_USER_ID,
    fetcher: getAccounts,
    initialData: [],
  })

  useEffect(() => {
    setAccounts(dbAccounts.map(mapDbAccount))
  }, [dbAccounts])

  const filtered = useMemo(
    () =>
      selectedType === "all"
        ? accounts
        : accounts.filter((a) => a.type === selectedType),
    [accounts, selectedType]
  )

  function handleAddAccount(account: BankAccount) {
    setAccounts((prev) => [...prev, account])
    void refresh()
  }

  function handleUpdateAccount(updated: BankAccount) {
    setAccounts((prev) =>
      prev.map((account) => (account.id === updated.id ? updated : account))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      {isLoading ? (
        <Skeleton className="h-[120px] w-full rounded-xl bg-foreground/5" />
      ) : (
        <AccountSummary accounts={accounts} />
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedType(tab.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedType === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account grid + add card */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl bg-foreground/5" />
          <Skeleton className="h-32 w-full rounded-xl bg-foreground/5" />
          <Skeleton className="h-32 w-full rounded-xl bg-foreground/5" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AddAccount onAdd={handleAddAccount} />
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <EmptyState
              variant="filter"
              title="No accounts in this category"
              description="You don't have any accounts of this type yet. Try a different filter or link a new account."
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account, i) => (
            <AccountCard
              key={account.id}
              account={account}
              index={i}
              onUpdate={handleUpdateAccount}
            />
          ))}
          <AddAccount onAdd={handleAddAccount} />
        </div>
      )}
    </div>
  )
}
