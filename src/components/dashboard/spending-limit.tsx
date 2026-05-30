"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheckIcon, Edit2Icon, Loader2Icon, CheckCircle2Icon } from "lucide-react"
import { getProfileBudgets, getTransactions, updateMonthlyBudget } from "@/lib/supabase"
import { motion } from "motion/react"

export function SpendingLimit() {
  const [budget, setBudget] = useState(30000)
  const [spent, setSpent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newBudgetVal, setNewBudgetVal] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    
    // Fetch budget settings from profile
    const budgetSettings = await getProfileBudgets()
    setBudget(budgetSettings.monthly_budget)
    
    // Fetch transactions
    const txData = await getTransactions()
    
    // Compute spending for the current calendar month
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed

    const currentMonthExpenses = txData.filter((t) => {
      const txDate = new Date(t.occurred_at)
      return (
        t.direction === "out" &&
        t.type !== "transfer" && // Transfers are not expenses
        t.type !== "goal_contribution" && // Goal contributions are savings, not spending
        txDate.getFullYear() === currentYear &&
        txDate.getMonth() === currentMonth
      )
    })

    const sum = currentMonthExpenses.reduce((acc, t) => acc + t.amount, 0)
    setSpent(Math.round(sum * 100) / 100)
    
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const percentUsed = Math.min(Math.round((spent / budget) * 100) || 0, 100)
  const remaining = Math.max(budget - spent, 0)

  // Formatter for current month label
  const getPeriodString = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const format = (d: Date) => d.toLocaleDateString("en-BD", { month: "short", day: "2-digit" })
    return `${format(start)} - ${format(end)}`
  }

  // Handle open editor dialog
  const handleOpenEdit = () => {
    setNewBudgetVal(String(budget))
    setSaveSuccess(false)
    setIsDialogOpen(true)
  }

  // Handle save monthly budget
  const handleSaveBudget = async () => {
    const amt = parseFloat(newBudgetVal)
    if (isNaN(amt) || amt <= 0) return

    setIsSaving(true)
    const success = await updateMonthlyBudget(amt)
    setIsSaving(false)

    if (success) {
      setBudget(amt)
      setSaveSuccess(true)
      setTimeout(() => {
        setIsDialogOpen(false)
        setSaveSuccess(false)
      }, 1200)
    }
  }

  return (
    <>
      <Card className="border-border/40 backdrop-blur-md overflow-hidden relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
            <span>Monthly Spending Limit</span>
            <button 
              onClick={handleOpenEdit}
              className="text-muted-foreground/40 hover:text-foreground transition-colors"
              title="Edit Limit"
            >
              <Edit2Icon className="size-3" />
            </button>
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <ShieldCheckIcon className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Budget Limit</p>
            <div className="flex items-baseline gap-1">
              {isLoading ? (
                <Skeleton className="h-8 w-28 bg-foreground/10 rounded" />
              ) : (
                <span className="text-2xl font-black tabular-nums tracking-tight">
                  ৳{budget.toLocaleString()}{" "}
                  <span className="text-xs font-semibold text-muted-foreground">
                    BDT
                  </span>
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-2 w-full bg-foreground/5" />
          ) : (
            <Progress value={percentUsed} className="h-2" />
          )}

          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current Spent</p>
              {isLoading ? (
                <Skeleton className="h-4 w-16 bg-foreground/5 mt-0.5" />
              ) : (
                <p className="font-bold tabular-nums">
                  ৳{spent.toLocaleString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Remaining</p>
              {isLoading ? (
                <Skeleton className="h-4 w-16 bg-foreground/5 mt-0.5 ml-auto" />
              ) : (
                <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  ৳{remaining.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {getPeriodString()}
          </p>
        </CardContent>
      </Card>

      {/* Spending Limit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Adjust Monthly Budget</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new maximum spending limit for this calendar month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {saveSuccess ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center space-y-2"
              >
                <CheckCircle2Icon className="size-12 text-emerald-500 animate-bounce" />
                <p className="font-semibold text-sm">Spending limit updated!</p>
                <p className="text-xs text-muted-foreground">Syncing dashboard values...</p>
              </motion.div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Limit (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      step="500"
                      className="pl-7 font-mono font-bold tracking-wide bg-background/50 border-white/5"
                      value={newBudgetVal}
                      onChange={(e) => setNewBudgetVal(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs h-9 border-white/5 bg-white/5"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 text-xs h-9 bg-primary text-primary-foreground font-semibold"
                    onClick={handleSaveBudget}
                    disabled={isSaving || !newBudgetVal}
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      "Apply Limit"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
