"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronRightIcon,
  LoaderCircleIcon,
  CheckCircle2Icon,
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  HandCoinsIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import {
  getAccounts,
  getContacts,
  getDebts,
  recordMoneyMovement,
  repayDebt,
  debtBalanceForContact,
  type AccountWithBalance,
  type DbContact,
  type DbDebt,
} from "@/lib/supabase"

type SendState = "idle" | "sending" | "success"
type Intent = "plain" | "lend" | "borrow" | "repay"

const fmt = (n: number) =>
  `৳${Math.abs(n).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`

const intentOptions: { value: Intent; label: string }[] = [
  { value: "plain", label: "Send" },
  { value: "lend", label: "Lend" },
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
]

export function QuickTransfer() {
  const [contacts, setContacts] = useState<DbContact[]>([])
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [debts, setDebts] = useState<DbDebt[]>([])
  const [selectedContact, setSelectedContact] = useState<string>("")
  const [amount, setAmount] = useState("250.00")
  const [sendState, setSendState] = useState<SendState>("idle")
  const [intent, setIntent] = useState<Intent>("plain")
  const [plainDirection, setPlainDirection] = useState<"out" | "in">("out")
  const [selectedDebtId, setSelectedDebtId] = useState<string>("")

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const selected = contacts.find((c) => c.id === selectedContact)

  const loadData = async () => {
    const [accs, cts, dbts] = await Promise.all([getAccounts(), getContacts(), getDebts()])
    setAccounts(accs)
    setContacts(cts)
    setDebts(dbts)
    if (!cts.find((c) => c.id === selectedContact)) {
      setSelectedContact(cts[0]?.id ?? "")
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Open debts for the selected contact (used by Repay)
  const contactDebts = useMemo(
    () =>
      debts.filter(
        (d) => d.counterparty_contact_id === selectedContact && d.status !== "settled"
      ),
    [debts, selectedContact]
  )

  // Keep selected debt / amount in sync when contact or intent changes
  useEffect(() => {
    if (intent === "repay") {
      const first = contactDebts[0]
      setSelectedDebtId(first?.id ?? "")
      if (first) setAmount(first.amount_remaining.toFixed(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, selectedContact])

  const netBalance = selectedContact ? debtBalanceForContact(debts, selectedContact) : 0
  const activeDebt = contactDebts.find((d) => d.id === selectedDebtId)

  const directionForIntent: "in" | "out" =
    intent === "lend"
      ? "out"
      : intent === "borrow"
        ? "in"
        : intent === "repay"
          ? activeDebt?.direction === "i_owe"
            ? "out"
            : "in"
          : plainDirection

  const canSubmit =
    sendState === "idle" &&
    !!amount &&
    parseFloat(amount) > 0 &&
    accounts.length > 0 &&
    !!selectedContact &&
    (intent !== "repay" || !!selectedDebtId)

  const handleSend = async () => {
    if (!canSubmit || !selected) return
    setSendState("sending")

    const primaryAccount = accounts[0]
    let success = false

    if (intent === "repay" && selectedDebtId) {
      success = await repayDebt({
        debtId: selectedDebtId,
        accountId: primaryAccount.id,
        amount: parseFloat(amount),
      })
    } else {
      success = await recordMoneyMovement({
        contactId: selected.id,
        contactName: selected.name,
        accountId: primaryAccount.id,
        amount: parseFloat(amount),
        intent: intent as "plain" | "lend" | "borrow",
        direction: plainDirection,
      })
    }

    if (success) {
      setSendState("success")
      await loadData()
      timeoutRef.current = setTimeout(() => {
        setSendState("idle")
        setAmount("")
      }, 2500)
    } else {
      setSendState("idle")
      alert("Failed to save. Check the console for details.")
    }
  }

  const verbLabel =
    intent === "lend"
      ? "Lending to"
      : intent === "borrow"
        ? "Borrowing from"
        : intent === "repay"
          ? "Settling with"
          : plainDirection === "out"
            ? "Sending to"
            : "Receiving from"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Quick Ledger</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1 px-0 text-xs text-muted-foreground"
          render={<Link href="/contacts" />}
        >
          See All Contacts
          <ChevronRightIcon className="size-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact avatars row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center py-2">
            {contacts.slice(0, 6).map((contact) => {
              const isSelected = selectedContact === contact.id
              return (
                <motion.button
                  key={contact.id}
                  onClick={() => {
                    if (sendState === "idle") setSelectedContact(contact.id)
                  }}
                  className="relative shrink-0 rounded-full"
                  animate={{
                    scale: isSelected ? 1.2 : 0.9,
                    marginLeft: isSelected ? 6 : -4,
                    marginRight: isSelected ? 6 : -4,
                    zIndex: isSelected ? 10 : 1,
                    opacity: isSelected ? 1 : 0.7,
                  }}
                  whileHover={{ scale: isSelected ? 1.2 : 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Avatar
                    className={
                      isSelected
                        ? "size-11 ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "size-10"
                    }
                  >
                    <AvatarImage src={contact.avatar_url ?? undefined} alt={contact.name} />
                    <AvatarFallback className="text-xs">
                      {contact.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                </motion.button>
              )
            })}
            {contacts.length === 0 && (
              <p className="text-xs text-muted-foreground">No contacts yet.</p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            render={<Link href="/contacts" />}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {/* Intent selector */}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {intentOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={sendState !== "idle"}
              onClick={() => setIntent(opt.value)}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                intent === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Selected contact + context */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedContact}-${intent}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between gap-2"
          >
            <p className="text-xs text-muted-foreground">
              {verbLabel}{" "}
              <span className="font-medium text-foreground">{selected?.name ?? "—"}</span>
            </p>
            {netBalance !== 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  netBalance > 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {netBalance > 0 ? `Owes you ${fmt(netBalance)}` : `You owe ${fmt(netBalance)}`}
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Plain direction toggle */}
        {intent === "plain" && sendState === "idle" && (
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setPlainDirection("out")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                plainDirection === "out"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <ArrowUpFromLineIcon className="size-3.5" /> Send
            </button>
            <button
              type="button"
              onClick={() => setPlainDirection("in")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                plainDirection === "in"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <ArrowDownToLineIcon className="size-3.5" /> Receive
            </button>
          </div>
        )}

        {/* Repay: pick which debt */}
        {intent === "repay" && sendState === "idle" && (
          contactDebts.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              No open debts with {selected?.name ?? "this contact"}.
            </p>
          ) : (
            <Select
              value={selectedDebtId}
              onValueChange={(v) => {
                if (!v) return
                setSelectedDebtId(v)
                const d = contactDebts.find((x) => x.id === v)
                if (d) setAmount(d.amount_remaining.toFixed(2))
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contactDebts.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.direction === "i_owe" ? "You owe" : "They owe"} {fmt(d.amount_remaining)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        )}

        {/* Amount + Record */}
        <AnimatePresence mode="wait">
          {sendState === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-2 py-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2Icon className="size-10 text-emerald-500" />
              </motion.div>
              <p className="text-sm font-semibold">{fmt(parseFloat(amount || "0"))} recorded!</p>
              <p className="text-xs text-muted-foreground">Ledger updated for {selected?.name}</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-3"
            >
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground">Amount (৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={sendState === "sending"}
                    className="h-10 pl-7 text-lg font-semibold tabular-nums"
                  />
                </div>
              </div>
              <Button className="h-10 gap-2 px-6" disabled={!canSubmit} onClick={handleSend}>
                {sendState === "sending" ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : directionForIntent === "out" ? (
                  <ArrowUpFromLineIcon className="size-4" />
                ) : intent === "repay" ? (
                  <HandCoinsIcon className="size-4" />
                ) : (
                  <ArrowDownToLineIcon className="size-4" />
                )}
                {sendState === "sending" ? "Saving..." : "Record"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
