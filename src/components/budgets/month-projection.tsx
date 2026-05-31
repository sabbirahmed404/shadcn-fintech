"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { DEMO_USER_ID, getProfileBudgets, getTransactions } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  cumulative: {
    label: "Spending",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig

export function MonthProjection() {
  const { data: transactions, isLoading: transactionsLoading } = useCachedQuery({
    key: CACHE_KEYS.transactions,
    userId: DEMO_USER_ID,
    fetcher: getTransactions,
    initialData: [],
  })
  const { data: profileBudgets, isLoading: profileLoading } = useCachedQuery({
    key: CACHE_KEYS.profileBudgets,
    userId: DEMO_USER_ID,
    fetcher: getProfileBudgets,
    initialData: { monthly_budget: 0, category_budgets: {} },
  })
  const totalBudget = profileBudgets.monthly_budget
  const isLoading = transactionsLoading || profileLoading

  const stats = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    
    // Group txs by day of current month
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`
    
    const dailySpendMap = new Map<number, number>()
    let totalSpent = 0

    for (const t of transactions) {
      if (
        t.direction === "out" && 
        t.type !== "transfer" && 
        t.type !== "goal_contribution" && 
        t.occurred_at.startsWith(currentMonthPrefix)
      ) {
        const dayStr = t.occurred_at.split('T')[0].split('-')[2]
        const day = parseInt(dayStr, 10)
        dailySpendMap.set(day, (dailySpendMap.get(day) || 0) + t.amount)
        totalSpent += t.amount
      }
    }
    
    const currentDay = now.getDate()
    const avgDaily = currentDay > 0 ? totalSpent / currentDay : 0
    const daysLeft = daysInMonth - currentDay
    const projected = totalSpent + avgDaily * daysLeft
    const overBudget = projected > totalBudget

    // Build cumulative chart data
    const chartData = []
    let cumulative = 0
    for (let i = 1; i <= daysInMonth; i++) {
      if (i <= currentDay) {
        cumulative += dailySpendMap.get(i) || 0
      }
      chartData.push({ 
        day: i, 
        cumulative: i <= currentDay ? cumulative : null,
        budget: (totalBudget / daysInMonth) * i 
      })
    }

    return { totalBudget, totalSpent, avgDaily, daysLeft, projected, overBudget, chartData }
  }, [transactions, totalBudget])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Month Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-[250px] w-full rounded-xl bg-foreground/5" />
        ) : (
          <>
            {/* Status */}
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                stats.overBudget
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              )}
            >
              {stats.overBudget ? (
                <AlertTriangleIcon className="size-4" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              {stats.overBudget
                ? "Projected to exceed budget"
                : "On track this month"}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Days Left
                </p>
                <p className="text-lg font-bold tabular-nums">{stats.daysLeft}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Avg/Day
                </p>
                <p className="text-lg font-bold tabular-nums">
                  ৳{Math.round(stats.avgDaily)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Spent So Far
                </p>
                <p className="text-lg font-bold tabular-nums">
                  ৳{stats.totalSpent.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Projected
                </p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    stats.overBudget && "text-destructive"
                  )}
                >
                  ৳{Math.round(stats.projected).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Cumulative spend chart */}
            <ChartContainer config={chartConfig} className="h-[140px] w-full">
              <AreaChart
                data={stats.chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
              >
                <defs>
                  <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickMargin={4}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickMargin={4}
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `৳${Number(value).toLocaleString()}`}
                    />
                  }
                />
                <ReferenceLine
                  y={stats.totalBudget}
                  stroke="var(--color-destructive)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <Area
                  dataKey="budget"
                  type="linear"
                  stroke="var(--color-muted-foreground)"
                  strokeOpacity={0.2}
                  strokeDasharray="4 4"
                  fill="transparent"
                  dot={false}
                />
                <Area
                  dataKey="cumulative"
                  type="monotone"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#fillSpend)"
                  dot={false}
                  connectNulls={false}
                />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
