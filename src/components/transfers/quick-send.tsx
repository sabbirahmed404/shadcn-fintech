"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
import { SendIcon, LoaderCircleIcon, CheckCircle2Icon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import {
  getAccounts,
  getContacts,
  getDebts,
  recordMoneyMovement,
  repayDebt,
  type AccountWithBalance,
  type DbContact,
  type DbDebt,
} from "@/lib/supabase"

type SendState = "idle" | "sending" | "success"
type Intent = "plain" | "lend" | "borrow" | "repay"

const fmt = (n: number) => `৳${Math.abs(n).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`

const intentOptions: { value: Intent; label: string }[] = [
  { value: "plain", label: "Send" },
  { value: "lend", label: "Lend" },
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
]

export function QuickSend({ onSent }: { onSent?: () => void }) {
  const [contacts, setContacts] = useState<DbContact[]>([])
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [debts, setDebts] = useState<DbDebt[]>([])
  const [selectedContact, setSelectedContact] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [intent, setIntent] = useState<Intent>("plain")
  const [selectedDebtId, setSelectedDebtId] = useState<string>("")
  const [sendState, setSendState] = useState<SendState>("idle")
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const selected = contacts.find((c) => c.id === selectedContact)

  const loadData = async () => {
    const [accs, cts, dbts] = await Promise.all([getAccounts(), getContacts(), getDebts()])
    setAccounts(accs)
    setContacts(cts)
    setDebts(dbts)
    if (!cts.find((c) => c.id === selectedContact)) setSelectedContact(cts[0]?.id ?? "")
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contactDebts = useMemo(
    () => debts.filter((d) => d.counterparty_contact_id === selectedContact && d.status !== "settled"),
    [debts, selectedContact]
  )

  useEffect(() => {
    if (intent === "repay") {
      const first = contactDebts[0]
      setSelectedDebtId(first?.id ?? "")
      if (first) setAmount(first.amount_remaining.toFixed(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, selectedContact])

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
        note: note || undefined,
      })
    } else {
      success = await recordMoneyMovement({
        contactId: selected.id,
        contactName: selected.name,
        accountId: primaryAccount.id,
        amount: parseFloat(amount),
        intent: intent as "plain" | "lend" | "borrow",
        direction: "out",
        note: note || undefined,
      })
    }

    if (success) {
      setSendState("success")
      await loadData()
      onSent?.()
      timeoutRef.current = setTimeout(() => {
        setSendState("idle")
        setAmount("")
        setNote("")
      }, 2000)
    } else {
      setSendState("idle")
      alert("Failed to save. Check the console for details.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Quick Send</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {sendState === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-2 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2Icon className="size-10 text-emerald-500" />
              </motion.div>
              <p className="text-sm font-semibold">{fmt(parseFloat(amount || "0"))} recorded!</p>
              <p className="text-xs text-muted-foreground">{selected?.name}</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Intent selector */}
              <div className="grid w-full grid-cols-4 gap-1 rounded-lg bg-muted p-1 sm:max-w-sm">
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

              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                {/* Contact selector */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Contact</label>
                  <div className="flex items-center gap-1 pt-1">
                    {contacts.slice(0, 6).map((contact) => {
                      const isSelected = selectedContact === contact.id
                      return (
                        <motion.button
                          key={contact.id}
                          onClick={() => {
                            if (sendState === "idle") setSelectedContact(contact.id)
                          }}
                          className="relative shrink-0 rounded-full"
                          animate={{ scale: isSelected ? 1 : 0.85, opacity: isSelected ? 1 : 0.6 }}
                          whileHover={{ scale: isSelected ? 1 : 0.95, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          <Avatar className={isSelected ? "size-9 ring-2 ring-primary" : "size-8"}>
                            <AvatarImage src={contact.avatar_url ?? undefined} alt={contact.name} />
                            <AvatarFallback className="text-[10px]">
                              {contact.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        </motion.button>
                      )
                    })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {intent === "repay" ? "Settling with" : intent === "borrow" ? "Borrowing from" : "To"}{" "}
                    <span className="font-medium text-foreground">{selected?.name ?? "—"}</span>
                  </p>
                </div>

                {/* Repay debt picker */}
                {intent === "repay" && (
                  <div className="flex-1 space-y-1.5 lg:max-w-[220px]">
                    <label className="text-xs text-muted-foreground">Debt</label>
                    {contactDebts.length === 0 ? (
                      <p className="rounded-md border border-dashed px-2 py-2 text-xs text-muted-foreground">
                        No open debts.
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
                    )}
                  </div>
                )}

                {/* Amount input */}
                <div className="flex-1 space-y-1.5 lg:max-w-[160px]">
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      ৳
                    </span>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={sendState === "sending"}
                      className="h-9 pl-7 tabular-nums"
                    />
                  </div>
                </div>

                {/* Note input */}
                <div className="flex-1 space-y-1.5 lg:max-w-[200px]">
                  <label className="text-xs text-muted-foreground">
                    Note <span className="text-muted-foreground/60">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="What's it for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={sendState === "sending"}
                    className="h-9"
                  />
                </div>

                {/* Send button */}
                <Button className="h-9 gap-2 px-6" disabled={!canSubmit} onClick={handleSend}>
                  {sendState === "sending" ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  {sendState === "sending" ? "Saving..." : "Record"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
