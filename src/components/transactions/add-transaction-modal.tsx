"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  UtensilsIcon,
  CarIcon,
  Gamepad2Icon,
  ShoppingBagIcon,
  RepeatIcon,
  HeartPulseIcon,
  GraduationCapIcon,
  PlaneIcon,
  ZapIcon,
  UsersIcon,
  CpuIcon,
  BriefcaseIcon,
  LaptopIcon,
  RotateCcwIcon,
  CircleDollarSignIcon,
  CheckCircle2Icon,
  Loader2Icon,
  CoffeeIcon,
  HomeIcon,
  WifiIcon,
  DropletIcon,
  MonitorIcon,
  GiftIcon,
  SmileIcon,
} from "lucide-react"

import { getCategories, getAccounts, addTransaction, type DbCategory, type AccountWithBalance } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const ICONS: Record<string, React.ReactNode> = {
  utensils: <UtensilsIcon className="size-4" />,
  car: <CarIcon className="size-4" />,
  "gamepad-2": <Gamepad2Icon className="size-4" />,
  "shopping-bag": <ShoppingBagIcon className="size-4" />,
  repeat: <RepeatIcon className="size-4" />,
  "heart-pulse": <HeartPulseIcon className="size-4" />,
  "graduation-cap": <GraduationCapIcon className="size-4" />,
  plane: <PlaneIcon className="size-4" />,
  zap: <ZapIcon className="size-4" />,
  users: <UsersIcon className="size-4" />,
  cpu: <CpuIcon className="size-4" />,
  briefcase: <BriefcaseIcon className="size-4" />,
  laptop: <LaptopIcon className="size-4" />,
  "rotate-ccw": <RotateCcwIcon className="size-4" />,
  "circle-dollar-sign": <CircleDollarSignIcon className="size-4" />,
  coffee: <CoffeeIcon className="size-4" />,
  home: <HomeIcon className="size-4" />,
  wifi: <WifiIcon className="size-4" />,
  droplet: <DropletIcon className="size-4" />,
  monitor: <MonitorIcon className="size-4" />,
  gift: <GiftIcon className="size-4" />,
  smile: <SmileIcon className="size-4" />
}

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Form State
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"expense" | "income">("expense")
  const [accountId, setAccountId] = useState("")
  const [categoryId, setCategoryId] = useState("none")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState<string>("circle-dollar-sign")

  useEffect(() => {
    if (open) {
      loadData()
      // Reset form
      setAmount("")
      setType("expense")
      setDescription("")
      setCategoryId("none")
      setAccountId("") // Reset to prevent raw ID flashing
      setIcon("circle-dollar-sign")
      setSaveSuccess(false)
    }
  }, [open])

  async function loadData() {
    setIsLoading(true)
    try {
      const [cats, accs] = await Promise.all([getCategories(), getAccounts()])
      setCategories(cats)
      setAccounts(accs)
      if (accs.length > 0) {
        setAccountId(accs[0].id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0 || !accountId || !description) return

    setIsSaving(true)
    const success = await addTransaction({
      amount: numAmount,
      type,
      direction: type === "expense" ? "out" : "in",
      description,
      account_id: accountId,
      category_id: categoryId === "none" ? undefined : categoryId,
      metadata: { icon }
    })
    setIsSaving(false)

    if (success) {
      setSaveSuccess(true)
      setTimeout(() => {
        onSuccess()
        onOpenChange(false)
      }, 1500)
    }
  }

  // Filter categories by type
  const filteredCategories = categories.filter((c) => c.kind === type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new expense or income manually to your ledger.
          </DialogDescription>
        </DialogHeader>

        {saveSuccess ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 space-y-3"
          >
            <CheckCircle2Icon className="size-16 text-emerald-500 animate-bounce" />
            <p className="font-semibold text-lg">Transaction Saved!</p>
            <p className="text-sm text-muted-foreground">Updating ledger...</p>
          </motion.div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Amount (৳)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description / Merchant</Label>
              <Input
                placeholder="e.g. Groceries at Walmart"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={(v) => v && setAccountId(v)} disabled={isLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Account">
                      {(() => {
                        if (isLoading) return "Loading accounts..."
                        const acc = accounts.find((a) => a.id === accountId)
                        return acc ? `${acc.name} (৳${acc.balance.toLocaleString()})` : undefined
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} (৳{acc.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} disabled={isLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category">
                      {(() => {
                        if (isLoading) return "Loading categories..."
                        if (categoryId === "none") return "No Category"
                        const cat = categories.find((c) => c.id === categoryId)
                        if (!cat) return undefined
                        return (
                          <div className="flex items-center gap-2">
                            {cat.icon && ICONS[cat.icon] ? ICONS[cat.icon] : null}
                            <span>{cat.name}</span>
                          </div>
                        )
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          {c.icon && ICONS[c.icon] ? ICONS[c.icon] : null}
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Custom Icon</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
                  {ICONS[icon]}
                </div>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" size="sm">Choose Icon</Button>
                    }
                  >
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="grid grid-cols-6 gap-1">
                      {Object.keys(ICONS).map((iconKey) => (
                        <Button
                          key={iconKey}
                          variant={icon === iconKey ? "default" : "ghost"}
                          size="icon"
                          className="size-8"
                          onClick={() => setIcon(iconKey)}
                        >
                          {ICONS[iconKey]}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleSave}
              disabled={isSaving || !amount || !description || !accountId}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Transaction"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
