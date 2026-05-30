"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MoreHorizontalIcon,
  ChevronRightIcon,
  FileTextIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getTransactions, type DbTransaction } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

const categoryColors: Record<string, string> = {
  Entertainment: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  Technology: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  Income: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Design: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  "AI Tools": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  Productivity: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
}

const formatAmount = (tx: DbTransaction) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(tx.amount)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadTransactions() {
      const data = await getTransactions()
      if (!isMounted) return
      setTransactions(data.slice(0, 7))
      setIsLoading(false)
    }

    loadTransactions()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">
          Recent Transactions
        </CardTitle>
        <Button
          render={<Link href="/transactions" />}
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
        >
          See All
          <ChevronRightIcon className="size-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px] space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_100px_120px_32px] gap-4 border-b pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Merchant</span>
              <span className="hidden sm:inline">Transaction ID</span>
              <span className="text-right">Amount</span>
              <span className="hidden md:inline">Date</span>
              <span />
            </div>

            {/* Rows */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_140px_100px_120px_32px] items-center gap-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="hidden h-4 w-24 sm:block" />
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="hidden h-4 w-24 md:block" />
                  <span />
                </div>
              ))}

            {!isLoading && transactions.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No transactions yet.
              </div>
            )}

            {!isLoading && transactions.map((tx) => (
              <div
                key={tx.id}
                className="group grid grid-cols-[1fr_140px_100px_120px_32px] items-center gap-4 rounded-lg py-2.5 transition-colors hover:bg-muted/50"
              >
                {/* Merchant */}
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {tx.description || "Manual Transaction"}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-0.5 h-5 rounded-md px-1.5 text-[10px] font-medium",
                        categoryColors[tx.category]
                      )}
                    >
                      {tx.category}
                    </Badge>
                  </div>
                </div>

                {/* Transaction ID */}
                <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                  {tx.id.slice(0, 8).toUpperCase()}
                </span>

                {/* Amount */}
                <span
                  className={cn(
                    "text-right text-sm font-semibold tabular-nums",
                    tx.direction === "in"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {tx.direction === "in" ? "+" : "-"}
                  {formatAmount(tx)}
                </span>

                {/* Date */}
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {formatDate(tx.occurred_at)}
                </span>

                {/* Actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
