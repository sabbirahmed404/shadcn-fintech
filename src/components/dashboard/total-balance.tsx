"use client"

import { useState } from "react"
import { motion } from "motion/react"
import {
  PlusIcon,
  ArrowDownLeftIcon,
  BanknoteIcon,
  CoinsIcon,
  EyeIcon,
  EyeOffIcon,
  Settings2Icon,
  Loader2Icon,
  CheckCircle2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { DEMO_USER_ID, getAccounts, updateAccountBalance } from "@/lib/supabase"

// Bangladesh English locale formatting helper
const fmt = (n: number) => {
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return `৳${formatted}`
}

export function TotalBalance() {
  const [isVisible, setIsVisible] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const {
    data: accounts,
    isLoading,
    refresh,
  } = useCachedQuery({
    key: CACHE_KEYS.accounts,
    userId: DEMO_USER_ID,
    fetcher: getAccounts,
    initialData: [],
  })
  
  // Dialog state
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [newBalanceValue, setNewBalanceValue] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Aggregate dynamically
  const bankAccounts = accounts.filter((a) => a.type === "bank")
  const walletAccounts = accounts.filter((a) => a.type === "cash" || a.type === "mfs")
  
  const bankBalance = bankAccounts.reduce((sum, a) => sum + a.balance, 0)
  const walletAmount = walletAccounts.reduce((sum, a) => sum + a.balance, 0)
  const totalBalance = bankBalance + walletAmount

  // Mock historical balance trend for sparkline (adapted to live total)
  const sparklineData = [
    totalBalance * 0.95,
    totalBalance * 0.96,
    totalBalance * 0.955,
    totalBalance * 0.98,
    totalBalance * 0.99,
    totalBalance * 1.002,
    totalBalance
  ]
  const minVal = Math.min(...sparklineData) - (totalBalance * 0.01)
  const maxVal = Math.max(...sparklineData) + (totalBalance * 0.01)
  
  // Construct the SVG path for the sparkline
  const width = 160
  const height = 40
  const points = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * width
    const delta = maxVal - minVal
    const y = height - (delta > 0 ? ((val - minVal) / delta) * (height - 10) : height / 2) - 5
    return { x, y }
  })

  let pathD = ""
  let fillD = ""
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cpX1 = curr.x + (next.x - curr.x) / 2
      const cpY1 = curr.y
      const cpX2 = curr.x + (next.x - curr.x) / 2
      const cpY2 = next.y
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`
    }
    fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`
  }

  // Handle opening adjust balance dialog
  const openAdjustDialog = () => {
    if (accounts.length > 0) {
      const firstAcc = accounts[0]
      setSelectedAccountId(firstAcc.id)
      setNewBalanceValue(String(firstAcc.balance))
    }
    setSaveSuccess(false)
    setIsDialogOpen(true)
  }

  // Sync selected account balance in dialog
  const handleAccountSelect = (id: string) => {
    setSelectedAccountId(id)
    const acc = accounts.find((a) => a.id === id)
    if (acc) {
      setNewBalanceValue(String(acc.balance))
    }
  }

  // Save the adjusted balance
  const handleSaveBalance = async () => {
    const targetVal = parseFloat(newBalanceValue)
    if (isNaN(targetVal) || !selectedAccountId) return
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      alert("You are offline. Reconnect to adjust balances.")
      return
    }

    setIsSaving(true)
    const success = await updateAccountBalance(selectedAccountId, targetVal)

    if (success) {
      await refresh()
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => {
        setIsDialogOpen(false)
        setSaveSuccess(false)
      }, 1200)
    } else {
      setIsSaving(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-emerald-500/5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-2xl">
          {/* Glow ambient background elements */}
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

          <CardContent className="py-3 px-6 sm:py-4 sm:px-8">
            <div className="flex flex-col gap-6 items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
              {/* Balance information */}
              <div className="flex flex-col items-center md:items-start space-y-2.5">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
                    Total Available Balance
                  </span>
                  <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
                    aria-label={isVisible ? "Hide balance" : "Show balance"}
                  >
                    {isVisible ? (
                      <EyeIcon className="size-3.5" />
                    ) : (
                      <EyeOffIcon className="size-3.5" />
                    )}
                  </button>
                  
                  <button
                    onClick={openAdjustDialog}
                    className="rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
                    aria-label="Adjust budgets or balances"
                    title="Adjust Balances"
                  >
                    <Settings2Icon className="size-3.5" />
                  </button>
                </div>

                {/* Big, bold typography section */}
                <div className="flex justify-center md:justify-start min-h-[60px] items-center">
                  {isLoading ? (
                    <Skeleton className="h-12 w-48 bg-foreground/10 rounded-lg" />
                  ) : (
                    <span className="font-sans text-4xl font-black tracking-tight text-foreground tabular-nums sm:text-5xl md:text-6xl select-all text-center">
                      {isVisible ? fmt(totalBalance) : "••••••••"}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline & Quick Actions */}
              <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
                {/* Sparkline trend display */}
                <div className="relative h-12 w-36 self-center md:self-end">
                  {isLoading ? (
                    <Skeleton className="size-full bg-foreground/5 rounded-md" />
                  ) : (
                    <svg
                      className="size-full overflow-visible"
                      viewBox={`0 0 ${width} ${height}`}
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="sparkline-stroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="rgb(99, 102, 241)" />
                          <stop offset="100%" stopColor="rgb(16, 185, 129)" />
                        </linearGradient>
                      </defs>
                      <path d={fillD} fill="url(#sparkline-grad)" />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="url(#sparkline-stroke)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.length > 0 && (
                        <circle
                          cx={points[points.length - 1].x}
                          cy={points[points.length - 1].y}
                          r="4"
                          className="fill-emerald-500 stroke-background stroke-2 animate-ping"
                        />
                      )}
                      {points.length > 0 && (
                        <circle
                          cx={points[points.length - 1].x}
                          cy={points[points.length - 1].y}
                          r="3"
                          className="fill-emerald-500 stroke-background stroke-2"
                        />
                      )}
                    </svg>
                  )}
                  <div className="absolute right-0 top-full text-[10px] font-medium text-muted-foreground/60 w-full text-center md:text-right">
                    Live balance trend
                  </div>
                </div>

                {/* Action Center - Fintech quick buttons */}
                <div className="flex flex-wrap justify-center md:justify-end gap-2 pt-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTransactionDialogOpen(true)}
                    className="flex-1 gap-1.5 border-border/80 bg-background/50 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] sm:flex-initial"
                  >
                    <ArrowDownLeftIcon className="size-4" />
                    Expense
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openAdjustDialog}
                    className="flex-1 gap-1.5 border-border/80 bg-background/50 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] sm:flex-initial"
                  >
                    <PlusIcon className="size-4" />
                    Adjust Balance
                  </Button>
                </div>

                {/* Dynamic Bank & Wallet Breakdown */}
                <div className="flex flex-wrap justify-center md:justify-end items-center gap-x-4 sm:gap-x-5 text-[11px] text-muted-foreground pt-1 w-full">
                  <div 
                    onClick={openAdjustDialog} 
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <BanknoteIcon className="size-3.5 text-indigo-500/80 group-hover:scale-110 transition-transform" />
                    <span>
                      Bank Accounts:{" "}
                      <strong className="font-bold text-foreground text-xs group-hover:underline">
                        {isLoading ? "..." : isVisible ? fmt(bankBalance) : "••••••••"}
                      </strong>
                    </span>
                  </div>
                  <div className="hidden size-1 rounded-full bg-muted-foreground/30 sm:block" />
                  <div 
                    onClick={openAdjustDialog} 
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <CoinsIcon className="size-3.5 text-emerald-500/80 group-hover:scale-110 transition-transform" />
                    <span>
                      Wallet Balance:{" "}
                      <strong className="font-bold text-foreground text-xs group-hover:underline">
                        {isLoading ? "..." : isVisible ? fmt(walletAmount) : "••••••••"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Premium Glassmorphic Dialog for Balance Adjustment */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Adjust Account Balance</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the balance of any cash wallet or linked bank account. Changes sync with Supabase immediately.
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
                <p className="font-semibold text-sm">Balance adjusted successfully!</p>
                <p className="text-xs text-muted-foreground">Refreshing accounts...</p>
              </motion.div>
            ) : (
              <>
                {/* Account Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Account</label>
                  <Select value={selectedAccountId} onValueChange={(val) => val && handleAccountSelect(val)}>
                    <SelectTrigger className="w-full bg-background/50 border-white/5">
                      {selectedAccountId ? (
                        <span className="truncate">
                          {(() => {
                            const acc = accounts.find((a) => a.id === selectedAccountId)
                            return acc ? `${acc.name} (${acc.provider || acc.type}) — ${fmt(acc.balance)}` : ""
                          })()}
                        </span>
                      ) : (
                        <SelectValue placeholder="Choose an account" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-md border-white/10">
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name} ({a.provider || a.type}) — {fmt(a.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Balance Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Balance (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7 font-mono font-bold tracking-wide bg-background/50 border-white/5 text-base sm:text-sm"
                      value={newBalanceValue}
                      onChange={(e) => setNewBalanceValue(e.target.value)}
                    />
                  </div>
                </div>

                {/* Actions */}
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
                    onClick={handleSaveBalance}
                    disabled={isSaving || !newBalanceValue}
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      "Apply Balance"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddTransactionModal
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSuccess={() => {
          void refresh()
        }}
      />
    </>
  )
}
