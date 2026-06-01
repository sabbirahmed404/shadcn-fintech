"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  addProjectMember,
  createProjectPayout,
  deleteProjectMember,
  deleteProjectPayout,
  receiveProjectPayout,
  unreceiveProjectPayout,
  updateProjectMember,
  updateProjectPayout,
  type AccountWithBalance,
  type DbContact,
  type DbProject,
  type DbProjectMember,
  type DbProjectPayout,
} from "@/lib/supabase"
import { payoutAmountFromPercent } from "@/lib/project-utils"
import { normalizeDateInput, parseCurrencyAmount } from "@/lib/savings-goal-utils"
import { cn } from "@/lib/utils"
import { DatePicker, formatCurrency } from "@/components/organization/shared"

type PayoutFormState = {
  label: string
  percent: string
  amount: string
  dueDate: string | null
  notes: string
}

const emptyPayoutForm: PayoutFormState = {
  label: "",
  percent: "",
  amount: "",
  dueDate: null,
  notes: "",
}

type MemberFormState = {
  contactId: string
  role: string
  dividendPercent: string
  dividendAmount: string
}

const emptyMemberForm: MemberFormState = {
  contactId: "",
  role: "",
  dividendPercent: "",
  dividendAmount: "",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ProjectDetailDialog({
  open,
  project,
  accounts,
  contacts,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  project: DbProject | null
  accounts: AccountWithBalance[]
  contacts: DbContact[]
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  // Payout form (add / edit milestone)
  const [editingPayout, setEditingPayout] = useState<DbProjectPayout | null>(null)
  const [payoutFormOpen, setPayoutFormOpen] = useState(false)
  const [payoutForm, setPayoutForm] = useState<PayoutFormState>(emptyPayoutForm)

  // Receive flow
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [receiveAccountId, setReceiveAccountId] = useState<string>("")
  const [receiveDate, setReceiveDate] = useState<string | null>(normalizeDateInput(new Date()))

  // Member form
  const [editingMember, setEditingMember] = useState<DbProjectMember | null>(null)
  const [memberFormOpen, setMemberFormOpen] = useState(false)
  const [memberForm, setMemberForm] = useState<MemberFormState>(emptyMemberForm)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setEditingPayout(null)
      setPayoutFormOpen(false)
      setPayoutForm(emptyPayoutForm)
      setReceivingId(null)
      setReceiveAccountId(accounts[0]?.id ?? "")
      setReceiveDate(normalizeDateInput(new Date()))
      setEditingMember(null)
      setMemberFormOpen(false)
      setMemberForm(emptyMemberForm)
    })
  }, [open, project?.id, accounts])

  const myTotalShare = project?.my_total_share ?? 0
  const usedContactIds = useMemo(
    () => new Set((project?.members ?? []).map((m) => m.contact_id).filter(Boolean) as string[]),
    [project?.members]
  )

  if (!project) return null
  const selected = project

  function openAddPayout() {
    setEditingPayout(null)
    setPayoutForm(emptyPayoutForm)
    setPayoutFormOpen(true)
  }

  function openEditPayout(payout: DbProjectPayout) {
    setEditingPayout(payout)
    setPayoutForm({
      label: payout.label,
      percent: payout.percent !== null ? String(payout.percent) : "",
      amount: String(payout.amount),
      dueDate: payout.due_date,
      notes: payout.notes ?? "",
    })
    setPayoutFormOpen(true)
  }

  async function handleSavePayout() {
    const label = payoutForm.label.trim()
    const amount = parseCurrencyAmount(payoutForm.amount) ?? 0
    const percent = payoutForm.percent.trim() ? Number(payoutForm.percent) : null
    if (!label) return

    setBusy(true)
    const payload = {
      label,
      percent,
      amount,
      dueDate: payoutForm.dueDate,
      notes: payoutForm.notes.trim() || null,
    }
    const ok = editingPayout
      ? await updateProjectPayout(editingPayout.id, payload)
      : await createProjectPayout(selected.id, {
          ...payload,
          sortOrder: (selected.payouts.at(-1)?.sort_order ?? 0) + 1,
        })
    setBusy(false)
    if (!ok) return

    setPayoutFormOpen(false)
    setEditingPayout(null)
    setPayoutForm(emptyPayoutForm)
    await onChanged()
  }

  async function handleDeletePayout(payout: DbProjectPayout) {
    if (!window.confirm(`Delete payout "${payout.label}"?`)) return
    setBusy(true)
    await deleteProjectPayout(payout.id)
    setBusy(false)
    await onChanged()
  }

  function startReceive(payout: DbProjectPayout) {
    setReceivingId(payout.id)
    setReceiveAccountId(accounts[0]?.id ?? "")
    setReceiveDate(normalizeDateInput(new Date()))
  }

  async function handleConfirmReceive(payout: DbProjectPayout) {
    if (!receiveAccountId || !receiveDate) return
    setBusy(true)
    const ok = await receiveProjectPayout({
      payoutId: payout.id,
      projectName: selected.name,
      label: payout.label,
      amount: payout.amount,
      accountId: receiveAccountId,
      receivedAt: receiveDate,
    })
    setBusy(false)
    if (!ok) return
    setReceivingId(null)
    await onChanged()
  }

  async function handleUndoReceive(payout: DbProjectPayout) {
    setBusy(true)
    await unreceiveProjectPayout(payout.id)
    setBusy(false)
    await onChanged()
  }

  function openAddMember() {
    setEditingMember(null)
    setMemberForm(emptyMemberForm)
    setMemberFormOpen(true)
  }

  function openEditMember(member: DbProjectMember) {
    setEditingMember(member)
    setMemberForm({
      contactId: member.contact_id ?? "",
      role: member.role ?? "",
      dividendPercent: member.dividend_percent !== null ? String(member.dividend_percent) : "",
      dividendAmount: member.dividend_amount !== null ? String(member.dividend_amount) : "",
    })
    setMemberFormOpen(true)
  }

  async function handleSaveMember() {
    if (!memberForm.contactId) return
    const contact = contacts.find((c) => c.id === memberForm.contactId)
    setBusy(true)
    const payload = {
      contactId: memberForm.contactId,
      name: contact?.name ?? null,
      role: memberForm.role.trim() || null,
      dividendPercent: memberForm.dividendPercent.trim() ? Number(memberForm.dividendPercent) : null,
      dividendAmount: parseCurrencyAmount(memberForm.dividendAmount),
    }
    const ok = editingMember
      ? await updateProjectMember(editingMember.id, payload)
      : await addProjectMember(selected.id, payload)
    setBusy(false)
    if (!ok) return
    setMemberFormOpen(false)
    setEditingMember(null)
    setMemberForm(emptyMemberForm)
    await onChanged()
  }

  async function handleDeleteMember(member: DbProjectMember) {
    if (!window.confirm(`Remove ${member.contact_name ?? member.name ?? "this member"}?`)) return
    setBusy(true)
    await deleteProjectMember(member.id)
    setBusy(false)
    await onChanged()
  }

  const availableContacts = contacts.filter(
    (c) => !usedContactIds.has(c.id) || c.id === memberForm.contactId
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto max-w-[min(calc(100%-2rem),34rem)] sm:max-w-[min(calc(100%-2rem),34rem)]">
        <DialogHeader>
          <DialogTitle>{selected.name}</DialogTitle>
          <DialogDescription>
            {selected.client_name ? `${selected.client_name} · ` : ""}
            Your share: {formatCurrency(myTotalShare)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="payouts" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          {/* ─────────────── Payouts ─────────────── */}
          <TabsContent value="payouts" className="flex flex-col gap-3 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Milestones split across the project lifecycle.
              </p>
              {!payoutFormOpen && (
                <Button size="sm" variant="outline" onClick={openAddPayout}>
                  <PlusIcon data-icon="inline-start" />
                  Add milestone
                </Button>
              )}
            </div>

            {payoutFormOpen && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-semibold">
                  {editingPayout ? "Edit milestone" : "New milestone"}
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="payout-label">Label</Label>
                  <Input
                    id="payout-label"
                    value={payoutForm.label}
                    onChange={(e) => setPayoutForm({ ...payoutForm, label: e.target.value })}
                    placeholder="Upfront / On completion / Phase 2"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payout-percent">% of your share</Label>
                    <Input
                      id="payout-percent"
                      inputMode="decimal"
                      value={payoutForm.percent}
                      onChange={(e) => {
                        const percent = e.target.value
                        const parsed = percent.trim() ? Number(percent) : null
                        setPayoutForm({
                          ...payoutForm,
                          percent,
                          amount:
                            parsed !== null && !Number.isNaN(parsed) && myTotalShare > 0
                              ? String(payoutAmountFromPercent(myTotalShare, parsed))
                              : payoutForm.amount,
                        })
                      }}
                      placeholder="20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payout-amount">Amount</Label>
                    <Input
                      id="payout-amount"
                      inputMode="decimal"
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                      placeholder="30000"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Due date</Label>
                  <DatePicker
                    value={payoutForm.dueDate}
                    placeholder="Pick due date"
                    onChange={(dueDate) => setPayoutForm({ ...payoutForm, dueDate })}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleSavePayout} disabled={busy || !payoutForm.label.trim()}>
                    {busy && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                    {editingPayout ? "Update" : "Add"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setPayoutFormOpen(false)
                      setEditingPayout(null)
                      setPayoutForm(emptyPayoutForm)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {selected.payouts.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No payout milestones yet
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selected.payouts.map((payout) => {
                  const account = accounts.find((a) => a.id === payout.account_id)
                  const isReceived = payout.status === "received"
                  return (
                    <div
                      key={payout.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border p-3",
                        isReceived && "border-emerald-500/30 bg-emerald-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold">{payout.label}</p>
                            {payout.percent !== null && (
                              <Badge variant="outline" className="h-5 text-[10px]">
                                {payout.percent}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-lg font-bold tabular-nums">{formatCurrency(payout.amount)}</p>
                          {isReceived ? (
                            <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2Icon className="size-3.5" />
                              Received{payout.received_at ? ` ${new Date(`${payout.received_at}T12:00:00`).toLocaleDateString("en-BD")}` : ""}
                              {account ? ` → ${account.name}` : ""}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {payout.due_date
                                ? `Due ${new Date(`${payout.due_date}T12:00:00`).toLocaleDateString("en-BD")}`
                                : "Pending"}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {isReceived ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Undo received"
                              disabled={busy}
                              onClick={() => handleUndoReceive(payout)}
                            >
                              <RotateCcwIcon />
                              <span className="sr-only">Undo received</span>
                            </Button>
                          ) : (
                            <>
                              <Button size="icon-sm" variant="ghost" onClick={() => openEditPayout(payout)}>
                                <PencilIcon />
                                <span className="sr-only">Edit milestone</span>
                              </Button>
                              <Button size="icon-sm" variant="ghost" onClick={() => handleDeletePayout(payout)}>
                                <Trash2Icon />
                                <span className="sr-only">Delete milestone</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isReceived && receivingId !== payout.id && (
                        <Button size="sm" variant="secondary" onClick={() => startReceive(payout)}>
                          <WalletIcon data-icon="inline-start" />
                          Mark received
                        </Button>
                      )}

                      {!isReceived && receivingId === payout.id && (
                        <div className="flex flex-col gap-2 rounded-md border bg-background p-2.5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs">Into wallet</Label>
                              <Select
                                value={receiveAccountId || undefined}
                                onValueChange={(value) => setReceiveAccountId(value ?? "")}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select wallet">
                                    {accounts.find((a) => a.id === receiveAccountId)?.name}
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
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs">Received on</Label>
                              <DatePicker
                                value={receiveDate}
                                placeholder="Pick date"
                                onChange={(d) => setReceiveDate(d ?? normalizeDateInput(new Date()))}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={busy || !receiveAccountId}
                              onClick={() => handleConfirmReceive(payout)}
                            >
                              {busy && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                              Confirm {formatCurrency(payout.amount)}
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => setReceivingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ─────────────── Team ─────────────── */}
          <TabsContent value="team" className="flex flex-col gap-3 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Team members and their dividends (informational).
              </p>
              {!memberFormOpen && (
                <Button size="sm" variant="outline" onClick={openAddMember} disabled={availableContacts.length === 0}>
                  <PlusIcon data-icon="inline-start" />
                  Add member
                </Button>
              )}
            </div>

            {memberFormOpen && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-semibold">{editingMember ? "Edit member" : "Add member"}</p>
                <div className="flex flex-col gap-1.5">
                  <Label>Contact</Label>
                  <Select
                    value={memberForm.contactId || undefined}
                    onValueChange={(value) => setMemberForm({ ...memberForm, contactId: value ?? "" })}
                    disabled={!!editingMember}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact">
                        {contacts.find((c) => c.id === memberForm.contactId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="member-role">Role</Label>
                    <Input
                      id="member-role"
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                      placeholder="Designer"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="member-percent">Dividend %</Label>
                    <Input
                      id="member-percent"
                      inputMode="decimal"
                      value={memberForm.dividendPercent}
                      onChange={(e) => setMemberForm({ ...memberForm, dividendPercent: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="member-amount">Dividend ৳</Label>
                    <Input
                      id="member-amount"
                      inputMode="decimal"
                      value={memberForm.dividendAmount}
                      onChange={(e) => setMemberForm({ ...memberForm, dividendAmount: e.target.value })}
                      placeholder="optional"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleSaveMember} disabled={busy || !memberForm.contactId}>
                    {busy && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                    {editingMember ? "Update" : "Add"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setMemberFormOpen(false)
                      setEditingMember(null)
                      setMemberForm(emptyMemberForm)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {selected.members.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No team members yet
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selected.members.map((member) => {
                  const name = member.contact_name ?? member.name ?? "Member"
                  return (
                    <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar>
                        {member.contact_avatar_url && <AvatarImage src={member.contact_avatar_url} alt={name} />}
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.role ?? "Team member"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {member.dividend_percent !== null && (
                          <p className="text-sm font-semibold tabular-nums">{member.dividend_percent}%</p>
                        )}
                        {member.dividend_amount !== null && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(member.dividend_amount)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEditMember(member)}>
                          <PencilIcon />
                          <span className="sr-only">Edit member</span>
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => handleDeleteMember(member)}>
                          <Trash2Icon />
                          <span className="sr-only">Remove member</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
