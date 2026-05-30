"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PalmtreeIcon,
  ShieldIcon,
  CarIcon,
  HomeIcon,
  PiggyBankIcon,
  MonitorIcon,
} from "lucide-react"
import { getSavingsGoals, DbSavingsGoal } from "@/lib/supabase"

const iconMap: Record<string, React.ReactNode> = {
  "palm-tree": <PalmtreeIcon className="size-5" />,
  vacation: <PalmtreeIcon className="size-5" />,
  shield: <ShieldIcon className="size-5" />,
  emergency: <ShieldIcon className="size-5" />,
  car: <CarIcon className="size-5" />,
  home: <HomeIcon className="size-5" />,
  "piggy-bank": <PiggyBankIcon className="size-5" />,
  savings: <PiggyBankIcon className="size-5" />,
  monitor: <MonitorIcon className="size-5" />,
  dream: <MonitorIcon className="size-5" />,
}

export function SavingsGoals() {
  const [goals, setGoals] = useState<DbSavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadGoals = async () => {
      setIsLoading(true)
      const data = await getSavingsGoals()
      setGoals(data)
      setIsLoading(false)
    }
    loadGoals()
  }, [])

  return (
    <Card className="col-span-full border-border/40 backdrop-blur-md overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Active Savings Goals</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-xl border p-4">
                <Skeleton className="size-10 rounded-lg bg-foreground/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-foreground/5" />
                    <Skeleton className="h-4 w-12 bg-foreground/5" />
                  </div>
                  <Skeleton className="h-6 w-32 bg-foreground/5" />
                  <Skeleton className="h-2 w-full bg-foreground/5" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 bg-foreground/5" />
                    <Skeleton className="h-3 w-20 bg-foreground/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No active savings goals found in the database.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((g) => {
              const percent = Math.min(
                Math.round((g.current_amount / g.target_amount) * 100) || 0,
                100
              )
              
              // Calculate projection and if they are on track
              const monthsLeft = g.monthly_contribution > 0
                ? Math.ceil((g.target_amount - g.current_amount) / g.monthly_contribution)
                : 0
                
              const projectedDate = new Date()
              projectedDate.setMonth(projectedDate.getMonth() + monthsLeft)
              
              const deadlineDate = g.target_date ? new Date(g.target_date) : null
              const onTrack = deadlineDate ? projectedDate <= deadlineDate : true
              
              const deadlineLabel = deadlineDate
                ? deadlineDate.toLocaleDateString("en-BD", { month: "short", year: "numeric" })
                : "Flexible"

              return (
                <div
                  key={g.id}
                  className="flex gap-4 rounded-xl border border-border/60 p-4 bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {iconMap[g.icon] || <PiggyBankIcon className="size-5" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{g.name}</p>
                      <Badge
                        variant={onTrack ? "secondary" : "destructive"}
                        className="text-[9px] font-bold uppercase tracking-wider h-4"
                      >
                        {onTrack ? "On track" : "Behind"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold tabular-nums">
                        ৳{g.current_amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / ৳{g.target_amount.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>৳{g.monthly_contribution.toLocaleString()}/mo</span>
                      <span>Target: {deadlineLabel}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
