"use client"

import { useState } from "react"
import { PlusIcon, CheckIcon, LoaderIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import type { BankAccount } from "@/data/seed"

interface AddAccountProps {
  onAdd: (account: BankAccount) => void
}

type Step = "idle" | "form" | "loading" | "success"

import { addAccount } from "@/lib/supabase"
import { getInstitutionLogo } from "@/lib/utils"

const accountTypes = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash Wallet" },
  { value: "mfs", label: "Mobile Money" },
] as const

type AccountTypeValue = (typeof accountTypes)[number]["value"]

function normalizeAccountNumberLast4(accountNumber: string) {
  const normalized = accountNumber.replace(/\D/g, "")
  return normalized ? normalized.slice(-4) : null
}

export function AddAccount({ onAdd }: AddAccountProps) {
  const [step, setStep] = useState<Step>("idle")
  const [institution, setInstitution] = useState("")
  const [accountType, setAccountType] = useState<AccountTypeValue | "">("")
  const [accountNumber, setAccountNumber] = useState("")

  async function handleConnect() {
    if (!institution || !accountType || !accountNumber) return

    setStep("loading")
    
    const accName = `${institution} ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}`
    
    // Create real account in Supabase
    const saved = await addAccount(
      accName,
      accountType,
      institution,
      0,
      normalizeAccountNumberLast4(accountNumber)
    )

    if (saved) {
      const mappedAccount: BankAccount = {
        id: saved.id,
        name: saved.name,
        type: saved.type as BankAccount["type"],
        institution: saved.provider || "Self",
        institutionLogo: getInstitutionLogo(saved.provider),
        accountNumber: saved.account_number_last4 ? `****${saved.account_number_last4}` : `****${accountNumber.slice(-4)}`,
        balance: saved.balance,
        currency: "৳",
        change: 0,
        changePercent: 0,
        lastActivity: "Live",
        color: saved.type === "cash" ? "bg-emerald-500" : saved.type === "mfs" ? "bg-pink-500" : "bg-blue-500"
      }
      onAdd(mappedAccount)
      setStep("success")

      setTimeout(() => {
        setStep("idle")
        setInstitution("")
        setAccountType("")
        setAccountNumber("")
      }, 1500)
    } else {
      // If error, revert to idle (could show error step)
      setStep("idle")
    }
  }

  return (
    <Card
      className={cn(
        "flex min-h-[180px] items-center justify-center border-2 border-dashed ring-0 transition-colors",
        step === "idle" && "cursor-pointer hover:border-primary/40 hover:bg-muted/30"
      )}
      onClick={() => step === "idle" && setStep("form")}
    >
      <CardContent className="flex w-full flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <PlusIcon className="size-5" />
              </div>
              <span className="text-sm font-medium">Link New Account</span>
            </motion.div>
          )}

          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex w-full flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                placeholder="Institution name"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
              <Select
                value={accountType}
                onValueChange={(v) => v && setAccountType(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setStep("idle")
                    setInstitution("")
                    setAccountType("")
                    setAccountNumber("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!institution || !accountType || !accountNumber}
                  onClick={handleConnect}
                >
                  Connect
                </Button>
              </div>
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <LoaderIcon className="size-6 animate-spin" />
              <span className="text-sm">Connecting...</span>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-emerald-500"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckIcon className="size-5" />
              </div>
              <span className="text-sm font-medium">Connected!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
