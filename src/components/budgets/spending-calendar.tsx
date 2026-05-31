"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { DEMO_USER_ID, getTransactions } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function SpendingCalendar() {
  const { data: transactions, isLoading } = useCachedQuery({
    key: CACHE_KEYS.transactions,
    userId: DEMO_USER_ID,
    fetcher: getTransactions,
    initialData: [],
  })

  const { weeks, maxAmount, monthName, year } = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (
        t.direction === "out" && 
        t.type !== "transfer" && 
        t.type !== "goal_contribution"
      ) {
        const dStr = t.occurred_at.split("T")[0]
        map.set(dStr, (map.get(dStr) || 0) + t.amount)
      }
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed
    
    const monthName = now.toLocaleString('default', { month: 'long' })
    const year = currentYear

    const firstDay = new Date(currentYear, currentMonth, 1)
    const startPad = firstDay.getDay() // day of week offset
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    
    const cells: { day: number | null; amount: number; date: string }[] = []

    for (let i = 0; i < startPad; i++) cells.push({ day: null, amount: 0, date: "" })
    let max = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const amount = map.get(dateStr) ?? 0
      if (amount > max) max = amount
      cells.push({ day: d, amount, date: dateStr })
    }

    const weeks: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }
    // Pad last week
    if (weeks.length > 0) {
      const last = weeks[weeks.length - 1]
      while (last.length < 7) last.push({ day: null, amount: 0, date: "" })
    }

    return { weeks, maxAmount: max, monthName, year }
  }, [transactions])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {monthName} {year} Spending
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full rounded-xl bg-foreground/5" />
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
              {DAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            {/* Weeks */}
            <div className="mt-1 grid gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((cell, ci) => {
                    if (cell.day === null) {
                      return <div key={ci} />
                    }
                    const intensity =
                      cell.amount === 0
                        ? 0
                        : maxAmount === 0 
                          ? 1
                          : Math.min(Math.round((cell.amount / maxAmount) * 4), 4)
                          
                    const isToday = cell.day === new Date().getDate()
                    return (
                      <div
                        key={ci}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg py-1.5 text-center transition-colors",
                          intensity === 0 && "bg-transparent",
                          intensity === 1 && "bg-primary/10",
                          intensity === 2 && "bg-primary/20",
                          intensity === 3 && "bg-primary/35",
                          intensity === 4 && "bg-primary/50",
                          isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                        )}
                      >
                        <span className="text-[11px] font-medium">{cell.day}</span>
                        {cell.amount > 0 && (
                          <span className="hidden text-[9px] tabular-nums text-muted-foreground sm:inline">
                            ৳{cell.amount}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
