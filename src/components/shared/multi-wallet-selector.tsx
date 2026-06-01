import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type AccountWithBalance } from "@/lib/supabase"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

export type WalletAllocation = { accountId: string; amount: number }

interface MultiWalletSelectorProps {
  accounts: AccountWithBalance[]
  targetAmount: number
  allocations: WalletAllocation[]
  onAllocationsChange: (allocations: WalletAllocation[]) => void
  mode: "fund" | "refund"
  className?: string
}

export function MultiWalletSelector({
  accounts,
  targetAmount,
  allocations,
  onAllocationsChange,
  mode,
  className,
}: MultiWalletSelectorProps) {
  const currentTotal = allocations.reduce((sum, a) => sum + (a.amount || 0), 0)
  const remaining = targetAmount - currentTotal

  const handleUpdate = (index: number, updates: Partial<WalletAllocation>) => {
    const next = [...allocations]
    next[index] = { ...next[index], ...updates }
    onAllocationsChange(next)
  }

  const handleRemove = (index: number) => {
    const next = allocations.filter((_, i) => i !== index)
    onAllocationsChange(next)
  }

  const handleAdd = () => {
    // Attempt to select an account that hasn't been used yet
    const usedAccountIds = allocations.map((a) => a.accountId)
    const unusedAccount = accounts.find((a) => !usedAccountIds.includes(a.id))
    
    onAllocationsChange([
      ...allocations,
      {
        accountId: unusedAccount ? unusedAccount.id : (accounts[0]?.id || ""),
        amount: Math.max(0, remaining),
      },
    ])
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {mode === "fund" ? "Fund From Wallet(s)" : "Refund To Wallet(s)"}
        </label>
        {Math.abs(remaining) > 0.01 && (
          <span className="text-xs font-semibold text-destructive">
            {remaining > 0 ? `Remaining to allocate: ৳${remaining.toLocaleString()}` : `Over-allocated: ৳${Math.abs(remaining).toLocaleString()}`}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {allocations.map((allocation, index) => {
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Select
                  value={allocation.accountId || undefined}
                  onValueChange={(val) => handleUpdate(index, { accountId: val || "" })}
                >
                  <SelectTrigger className="flex-1 overflow-hidden">
                    <SelectValue placeholder="Select Account">
                      {(() => {
                        const acc = accounts.find((a) => a.id === allocation.accountId)
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
                
                <div className="relative w-28 sm:w-32 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="pl-6 h-9"
                    value={allocation.amount || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      handleUpdate(index, { amount: isNaN(val) ? 0 : val })
                    }}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
              {mode === "fund" && (() => {
                const acc = accounts.find((a) => a.id === allocation.accountId)
                if (acc && allocation.amount > acc.balance) {
                  return (
                    <p className="text-xs text-destructive text-right pr-10 mt-[-2px]">
                      Insufficient balance in {acc.name}
                    </p>
                  )
                }
                return null
              })()}
            </div>
          )
        })}
      </div>

      {allocations.length < accounts.length && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 mt-1 border-dashed"
          onClick={handleAdd}
        >
          <PlusIcon className="size-3 mr-1.5" />
          Split with another wallet
        </Button>
      )}
    </div>
  )
}
