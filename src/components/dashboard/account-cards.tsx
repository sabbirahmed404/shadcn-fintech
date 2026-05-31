"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  CreditCardIcon,
  PlusIcon,
  TrendingUpIcon,
  EuroIcon,
  BitcoinIcon,
  ChartLineIcon,
  NfcIcon,
  XIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  BanknoteIcon,
  CoinsIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "motion/react"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import { DEMO_USER_ID, getAccounts, addAccount } from "@/lib/supabase"
import { cn, getInstitutionLogo } from "@/lib/utils"

type AddState = "idle" | "form" | "adding" | "success"

// Card styling config based on provider / type
const getCardStyle = (provider: string | null, type: string, index: number) => {
  const normProvider = provider?.toLowerCase() || ""
  if (normProvider.includes("bkash")) {
    return {
      style: "bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 text-white border-none",
      icon: <CoinsIcon className="size-5 opacity-30 text-white" />,
      chipColor: "bg-white/20",
    }
  }
  if (normProvider.includes("nagad")) {
    return {
      style: "bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white border-none",
      icon: <CoinsIcon className="size-5 opacity-30 text-white" />,
      chipColor: "bg-white/20",
    }
  }
  if (normProvider.includes("rocket")) {
    return {
      style: "bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 text-white border-none",
      icon: <CoinsIcon className="size-5 opacity-30 text-white" />,
      chipColor: "bg-white/20",
    }
  }
  if (normProvider.includes("ucb")) {
    return {
      style: "bg-gradient-to-br from-blue-800 via-blue-900 to-slate-950 text-white border-none",
      icon: <CreditCardIcon className="size-5 opacity-30 text-white" />,
      chipColor: "bg-white/20",
    }
  }
  if (normProvider.includes("redot") || normProvider.includes("redhot") || normProvider.includes("reddot")) {
    return {
      style: "bg-gradient-to-br from-red-500 via-rose-600 to-red-700 text-white border-none",
      icon: <CreditCardIcon className="size-5 opacity-30 text-white" />,
      chipColor: "bg-white/20",
    }
  }

  // Fallbacks
  const palettes = [
    {
      style: "bg-muted text-foreground border-white/5",
      icon: <CreditCardIcon className="size-5 opacity-30" />,
      chipColor: "bg-foreground/10",
    },
    {
      style: "bg-primary text-primary-foreground border-none",
      icon: <ChartLineIcon className="size-5 opacity-30" />,
      chipColor: "bg-primary-foreground/20",
    },
    {
      style: "bg-gradient-to-br from-violet-600 to-purple-800 text-white border-none",
      icon: <CreditCardIcon className="size-5 opacity-30" />,
      chipColor: "bg-white/20",
    },
  ]
  return palettes[index % palettes.length]
}

const newCardOptions = [
  { value: "ucb", label: "UCB Bank Mastercard", type: "bank" as const, provider: "UCB" },
  { value: "redotpay", label: "Red Hot Pay", type: "bank" as const, provider: "ReddotPay" },
  { value: "rocket", label: "DB bill rocket", type: "mfs" as const, provider: "Rocket" },
  { value: "bkash", label: "bKash MFS", type: "mfs" as const, provider: "bKash" },
  { value: "nagad", label: "Nagad MFS", type: "mfs" as const, provider: "Nagad" },
]

export function AccountCards() {
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
  const [order, setOrder] = useState<string[]>([])
  
  // Card adding form states
  const [addState, setAddState] = useState<AddState>("idle")
  const [newCardType, setNewCardType] = useState("savings")
  const [newCardName, setNewCardName] = useState("")
  const [newCardInitialBalance, setNewCardInitialBalance] = useState("5000")

  const cardAccounts = useMemo(
    () => accounts.filter(a => a.type === "bank" || a.type === "mfs"),
    [accounts]
  )
  const baseOrder = useMemo(
    () => cardAccounts.map((account) => account.id),
    [cardAccounts]
  )
  const cardOrder =
    order.length === baseOrder.length && order.every((id) => baseOrder.includes(id))
      ? order
      : baseOrder

  // Rotate stack of cards
  const cycle = useCallback(() => {
    setOrder((prev) => {
      const current =
        prev.length === baseOrder.length && prev.every((id) => baseOrder.includes(id))
          ? prev
          : baseOrder
      if (current.length <= 1) return current
      const next = [...current]
      const front = next.pop()!
      next.unshift(front)
      return next
    })
  }, [baseOrder])

  // Automatic stack rotation
  useEffect(() => {
    if (addState !== "idle" || cardOrder.length <= 1) return
    const id = setInterval(cycle, 3000)
    return () => clearInterval(id)
  }, [cycle, addState, cardOrder.length])

  // Handle adding card to database
  const handleAdd = async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setAddState("form")
      return
    }

    const initialAmt = parseFloat(newCardInitialBalance) || 0
    const option = newCardOptions.find((o) => o.value === newCardType) || newCardOptions[0]
    
    setAddState("adding")
    
    const newAcc = await addAccount(
      newCardName || option.label,
      option.type,
      option.provider,
      initialAmt
    )

    if (newAcc) {
      setAddState("success")
      setTimeout(async () => {
        setAddState("idle")
        setNewCardName("")
        setNewCardInitialBalance("5000")
        await refresh()
      }, 1500)
    } else {
      setAddState("form")
    }
  }

  // Wallet balances
  const cashAccounts = accounts.filter(a => a.type === "cash" || a.type === "mfs")
  const walletBalanceAmount = cashAccounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <Card className="overflow-hidden border-border/40 backdrop-blur-md">
      <CardContent className="flex flex-col gap-5 pt-6">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex h-[200px] flex-col justify-center space-y-4">
              <Skeleton className="h-[120px] w-full rounded-2xl bg-foreground/5" />
              <Skeleton className="h-5 w-1/3 bg-foreground/5" />
            </div>
          ) : addState === "idle" ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Stacked cards */}
              {cardAccounts.length === 0 ? (
                <div className="flex h-[152px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 text-center p-4">
                  <CreditCardIcon className="size-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium text-muted-foreground">No accounts linked</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 mt-1 text-[10px]"
                    onClick={() => setAddState("form")}
                  >
                    Link account
                  </Button>
                </div>
              ) : (
                <div className="relative h-[180px]">
                  {cardOrder.map((accountId, stackPos) => {
                    const c = cardAccounts.find((account) => account.id === accountId)
                    if (!c) return null
                    const cardIndex = cardAccounts.findIndex((account) => account.id === accountId)
                    
                    const isFront = stackPos === order.length - 1
                    const maxOffset = 36 / Math.max(order.length - 1, 1)
                    
                    // Style config
                    const { style, icon, chipColor } = getCardStyle(c.provider, c.type, cardIndex)

                    return (
                      <motion.button
                        key={c.id}
                        onClick={cycle}
                        layout
                        animate={{
                          y: stackPos * Math.min(maxOffset, 12),
                          scale: 1 - (order.length - 1 - stackPos) * (0.08 / Math.max(order.length - 1, 1)),
                          zIndex: stackPos,
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className={cn(
                          "absolute inset-x-0 flex h-[140px] cursor-pointer flex-col justify-between rounded-2xl px-5 py-4 border text-left",
                          style,
                          isFront ? "shadow-lg shadow-black/10" : "shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold tracking-wide uppercase">
                            {c.name}
                          </span>
                          {c.provider ? (
                            <div className="flex h-6 w-12 items-center justify-center overflow-hidden">
                              <img
                                src={getInstitutionLogo(c.provider)}
                                alt={c.provider}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            icon
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-6 w-9 rounded-md shadow-inner", chipColor)} />
                          <NfcIcon className="size-3.5 opacity-20" />
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="font-mono text-[9px] tracking-widest opacity-50">
                            **** {c.account_number_last4 || "0000"}
                          </span>
                          <p className="text-lg font-black tabular-nums tracking-tight">
                            {c.currency === "USD" ? "$" : c.currency === "EUR" ? "€" : "৳"}{c.balance.toLocaleString()}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="add-flow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex h-[210px] flex-col"
            >
              {addState === "success" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2Icon className="size-10 text-emerald-500" />
                  </motion.div>
                  <p className="text-sm font-semibold">Account added!</p>
                  <p className="text-xs text-muted-foreground text-center">
                    {newCardName || newCardOptions.find((o) => o.value === newCardType)?.label} has been integrated.
                  </p>
                </div>
              ) : addState === "adding" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Linking account with Supabase...</p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Account</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full hover:bg-foreground/5"
                      onClick={() => setAddState("idle")}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                  
                  <Select value={newCardType} onValueChange={(v) => v && setNewCardType(v)}>
                    <SelectTrigger className="h-8 text-xs bg-background/50 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-md border-white/10">
                      {newCardOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label} ({o.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Account name (e.g. Savings Card)"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    className="h-8 text-xs bg-background/50 border-white/5"
                  />

                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      placeholder="Initial balance"
                      value={newCardInitialBalance}
                      onChange={(e) => setNewCardInitialBalance(e.target.value)}
                      className="h-8 pl-6 text-xs bg-background/50 border-white/5 font-mono"
                    />
                  </div>

                  <Button className="h-8 gap-2 text-xs font-semibold" onClick={handleAdd}>
                    <PlusIcon className="size-3.5" />
                    Link & Sync Account
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card count + add */}
        <div className="flex items-center justify-between border-t border-dashed border-border/60 pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCardIcon className="size-3.5" />
            <span>{isLoading ? "..." : cardAccounts.length} active accounts</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-full border-border/80 bg-background/50 hover:bg-foreground/5 hover:scale-105 active:scale-95 transition-all"
            onClick={() => addState === "idle" && setAddState("form")}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>

        {/* Wallet balance */}
        <div className="space-y-1.5 border-t border-border/40 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Wallet Balance</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black tabular-nums tracking-tight select-all">
              {isLoading ? (
                <Skeleton className="h-9 w-36 bg-foreground/10 rounded" />
              ) : (
                `৳${walletBalanceAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUpIcon className="size-3.5" />
            <span>Fully synced with transaction ledger</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
