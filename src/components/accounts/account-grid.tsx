"use client"

import { useState } from "react"
import Image from "next/image"
import { TrendingUpIcon, TrendingDownIcon, ClockIcon, BuildingIcon } from "lucide-react"
import { motion } from "motion/react"
import { Edit2Icon, CheckIcon, XIcon, Loader2Icon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateAccountBalance, updateAccountDetails } from "@/lib/supabase"

import { cn, getInstitutionLogo } from "@/lib/utils"
import type { BankAccount } from "@/data/seed"

interface AccountCardProps {
  account: BankAccount
  index: number
  onSelect?: (account: BankAccount) => void
  onUpdate?: (account: BankAccount) => void
}

const fmt = (n: number, currency = "৳") =>
  `${currency}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n))}`

function editableAccountNumber(accountNumber: string) {
  return accountNumber.replace(/\*/g, "").trim()
}

function normalizeAccountNumberLast4(accountNumber: string) {
  const normalized = accountNumber.replace(/\D/g, "")
  return normalized ? normalized.slice(-4) : null
}

export function AccountCard({ account, index, onSelect, onUpdate }: AccountCardProps) {
  const [imgError, setImgError] = useState(false)
  const [isEditingBalance, setIsEditingBalance] = useState(false)
  const [balanceValue, setBalanceValue] = useState(account.balance.toString())
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [detailName, setDetailName] = useState(account.name)
  const [detailProvider, setDetailProvider] = useState(
    account.institution === "Self" ? "" : account.institution
  )
  const [detailAccountNumber, setDetailAccountNumber] = useState(
    editableAccountNumber(account.accountNumber)
  )
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false)

  const handleSaveBalance = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    const num = parseFloat(balanceValue)
    if (isNaN(num)) return
    
    setIsUpdatingBalance(true)
    const success = await updateAccountBalance(account.id, num)
    setIsUpdatingBalance(false)
    if (success) {
      setIsEditingBalance(false)
      onUpdate?.({ ...account, balance: num })
    }
  }

  const handleSaveDetails = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()

    const name = detailName.trim()
    if (!name) return

    const provider = detailProvider.trim() || null
    const accountNumberLast4 = normalizeAccountNumberLast4(detailAccountNumber)

    setIsUpdatingDetails(true)
    const success = await updateAccountDetails(account.id, {
      name,
      provider,
      accountNumberLast4,
    })
    setIsUpdatingDetails(false)

    if (success) {
      setIsEditingDetails(false)
      onUpdate?.({
        ...account,
        name,
        institution: provider || "Self",
        institutionLogo: getInstitutionLogo(provider),
        accountNumber: accountNumberLast4 ? `****${accountNumberLast4}` : "****",
      })
    }
  }

  const handleCancelBalance = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingBalance(false)
    setBalanceValue(account.balance.toString())
  }

  const handleCancelDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingDetails(false)
    setDetailName(account.name)
    setDetailProvider(account.institution === "Self" ? "" : account.institution)
    setDetailAccountNumber(editableAccountNumber(account.accountNumber))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => {
        onSelect?.(account)
        console.log("Selected account:", account.name)
      }}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
    >
      {/* Colored left border */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          account.color
        )}
      />

      <div className="p-4 pl-5">
        {/* Institution row */}
        <div className="flex items-center gap-2">
          {!account.institutionLogo || imgError ? (
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <BuildingIcon className="size-4 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex size-10 items-center justify-center overflow-hidden">
              <Image
                src={account.institutionLogo}
                alt={account.institution}
                width={40}
                height={40}
                unoptimized
                className="size-full object-contain drop-shadow-sm"
                onError={() => setImgError(true)}
              />
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {account.institution}
          </span>
        </div>

        {/* Account name + number */}
        <div className="mt-3">
          {isEditingDetails ? (
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Name
                <Input
                  autoFocus
                  value={detailName}
                  onChange={(e) => setDetailName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveDetails(e)
                    }
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Provider
                <Input
                  value={detailProvider}
                  onChange={(e) => setDetailProvider(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveDetails(e)
                    }
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Account number
                <Input
                  inputMode="numeric"
                  value={detailAccountNumber}
                  onChange={(e) => setDetailAccountNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveDetails(e)
                    }
                  }}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:bg-muted"
                  onClick={handleCancelDetails}
                  disabled={isUpdatingDetails}
                >
                  <XIcon />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={handleSaveDetails}
                  disabled={isUpdatingDetails || !detailName.trim()}
                >
                  {isUpdatingDetails ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{account.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {account.accountNumber}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setDetailName(account.name)
                  setDetailProvider(account.institution === "Self" ? "" : account.institution)
                  setDetailAccountNumber(editableAccountNumber(account.accountNumber))
                  setIsEditingDetails(true)
                }}
              >
                <Edit2Icon className="text-muted-foreground" />
                <span className="sr-only">Edit account details</span>
              </Button>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="mt-3 flex items-center justify-between h-9">
          {isEditingBalance ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{account.currency}</span>
                <Input
                  type="number"
                  className="h-8 w-28 pl-7 font-mono text-sm"
                  value={balanceValue}
                  onChange={(e) => setBalanceValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveBalance(e)
                    }
                  }}
                />
              </div>
              <Button size="icon" variant="ghost" className="size-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={handleSaveBalance} disabled={isUpdatingBalance}>
                {isUpdatingBalance ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              </Button>
              <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:bg-muted" onClick={handleCancelBalance} disabled={isUpdatingBalance}>
                <XIcon />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/edit">
              <p className="tabular-nums text-xl font-bold tracking-tight">
                {fmt(account.balance, account.currency)}
              </p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-6 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/edit:opacity-100" 
                onClick={(e) => {
                  e.stopPropagation()
                  setBalanceValue(account.balance.toString())
                  setIsEditingBalance(true)
                }}
              >
                <Edit2Icon className="text-muted-foreground" />
                <span className="sr-only">Edit balance</span>
              </Button>
            </div>
          )}
        </div>

        {/* Change badge + last activity */}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              account.change >= 0
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            )}
          >
            {account.change >= 0 ? (
              <TrendingUpIcon className="size-3" />
            ) : (
              <TrendingDownIcon className="size-3" />
            )}
            <span className="tabular-nums">
              {account.change >= 0 ? "+" : "-"}
              {fmt(account.change, account.currency)}{" "}
              ({Math.abs(account.changePercent).toFixed(1)}%)
            </span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3" />
            {account.lastActivity}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
