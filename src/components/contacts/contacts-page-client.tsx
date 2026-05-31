"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  PhoneIcon,
  LoaderCircleIcon,
  UsersIcon,
  UploadIcon,
  MoreVerticalIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import { CARTOON_AVATARS } from "@/lib/avatars"
import {
  getContacts,
  getDebts,
  addContact,
  updateContact,
  deleteContact,
  debtBalanceForContact,
  type DbContact,
  type DbDebt,
} from "@/lib/supabase"

const fmt = (n: number) => `৳${Math.abs(n).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`

const AVATAR_PRESETS = CARTOON_AVATARS
const MAX_AVATAR_BYTES = 1_500_000 // ~1.5 MB

type FormState = {
  name: string
  nickname: string
  phone: string
  avatar_url: string
  notes: string
}

const emptyForm: FormState = { name: "", nickname: "", phone: "", avatar_url: "", notes: "" }

export function ContactsPageClient() {
  const [contacts, setContacts] = useState<DbContact[]>([])
  const [debts, setDebts] = useState<DbDebt[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DbContact | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteTarget, setDeleteTarget] = useState<DbContact | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const [cts, dbts] = await Promise.all([getContacts(), getDebts()])
    setContacts(cts)
    setDebts(dbts)
    setLoading(false)
  }

  useEffect(() => {
    // load() sets state only after awaiting the fetch (not synchronous)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const totals = useMemo(() => {
    let owedToYou = 0
    let youOwe = 0
    for (const c of contacts) {
      const net = debtBalanceForContact(debts, c.id)
      if (net > 0) owedToYou += net
      else youOwe += -net
    }
    return { owedToYou, youOwe }
  }, [contacts, debts])

  function openAdd() {
    setEditing(null)
    setAvatarError(null)
    setForm({ ...emptyForm, avatar_url: AVATAR_PRESETS[contacts.length % AVATAR_PRESETS.length] })
    setDialogOpen(true)
  }

  function openEdit(contact: DbContact) {
    setEditing(contact)
    setAvatarError(null)
    setForm({
      name: contact.name,
      nickname: contact.nickname ?? "",
      phone: contact.phone ?? "",
      avatar_url: contact.avatar_url ?? "",
      notes: contact.notes ?? "",
    })
    setDialogOpen(true)
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image is too large (max 1.5 MB).")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarError(null)
      setForm((f) => ({ ...f, avatar_url: String(reader.result) }))
    }
    reader.onerror = () => setAvatarError("Could not read that file.")
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.name.trim() || saving) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      phone: form.phone.trim() || null,
      avatar_url: form.avatar_url || null,
      notes: form.notes.trim() || null,
    }
    const ok = editing ? await updateContact(editing.id, payload) : await addContact(payload)
    setSaving(false)
    if (ok) {
      setDialogOpen(false)
      await load()
    } else {
      alert("Failed to save contact.")
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const ok = await deleteContact(deleteTarget.id)
    setDeleting(false)
    if (ok) {
      setDeleteTarget(null)
      await load()
    } else {
      alert("Failed to delete contact.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            People you send, lend, borrow, and settle money with.
          </p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <PlusIcon className="size-4" />
          Add Contact
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UsersIcon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contacts</p>
              <p className="text-base font-semibold tabular-nums">{contacts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-sm font-bold text-emerald-500">↘</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Owed to you</p>
              <p className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmt(totals.owedToYou)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
              <span className="text-sm font-bold text-rose-500">↗</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You owe</p>
              <p className="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {fmt(totals.youOwe)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No contacts yet"
          description="Add a contact to start tracking money you send, lend, or borrow."
          actionLabel="Add Contact"
          onAction={openAdd}
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {contacts.map((contact) => {
              const net = debtBalanceForContact(debts, contact.id)
              return (
                <motion.div
                  key={contact.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card className="h-full">
                    <CardContent className="flex items-start gap-3 p-4">
                      <Avatar className="size-11 shrink-0">
                        <AvatarImage src={contact.avatar_url ?? undefined} alt={contact.name} />
                        <AvatarFallback>
                          {contact.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{contact.name}</p>
                        {contact.nickname && (
                          <p className="truncate text-xs text-muted-foreground">"{contact.nickname}"</p>
                        )}
                        {contact.phone && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <PhoneIcon className="size-3" />
                            {contact.phone}
                          </p>
                        )}
                        {net !== 0 && (
                          <span
                            className={cn(
                              "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              net > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {net > 0 ? `Owes you ${fmt(net)}` : `You owe ${fmt(net)}`}
                          </span>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="size-7 shrink-0" />}
                        >
                          <MoreVerticalIcon className="size-4" />
                          <span className="sr-only">Contact actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(contact)}>
                            <PencilIcon className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(contact)}
                          >
                            <Trash2Icon className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this person's details." : "Add someone to your money ledger."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rahim Uddin"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact-nickname">Nickname</Label>
                <Input
                  id="contact-nickname"
                  value={form.nickname}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Avatar</Label>
              {/* Preview + upload */}
              <div className="flex items-center gap-3">
                <Avatar className="size-14 shrink-0">
                  <AvatarImage src={form.avatar_url || undefined} alt="Selected avatar" />
                  <AvatarFallback>
                    {form.name.trim()
                      ? form.name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon className="size-3.5" />
                    Upload image
                  </Button>
                  <p className="text-[11px] text-muted-foreground">PNG or JPG, up to 1.5 MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
              </div>
              {avatarError && <p className="text-[11px] text-rose-500">{avatarError}</p>}

              {/* Cartoon avatar presets */}
              <p className="pt-1 text-[11px] text-muted-foreground">Or pick a cartoon avatar</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PRESETS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setAvatarError(null)
                      setForm((f) => ({ ...f, avatar_url: url }))
                    }}
                    className={cn(
                      "rounded-full ring-offset-2 ring-offset-background transition-all",
                      form.avatar_url === url ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={url} alt={`Cartoon avatar ${i + 1}`} />
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Input
                id="contact-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
              {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete contact?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name} will be removed. Their past transactions stay in your ledger.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <LoaderCircleIcon className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
