"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  BriefcaseIcon,
  CalendarIcon,
  CarIcon,
  GraduationCapIcon,
  HeartIcon,
  HistoryIcon,
  HomeIcon,
  Loader2Icon,
  MonitorIcon,
  MoreHorizontalIcon,
  PalmtreeIcon,
  PencilIcon,
  PiggyBankIcon,
  PlaneIcon,
  PlusIcon,
  ShieldIcon,
  TargetIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  addSavingsGoalContribution,
  createSavingsGoal,
  deleteSavingsGoal,
  deleteSavingsGoalContribution,
  getSavingsGoalContributions,
  getSavingsGoals,
  updateSavingsGoal,
  updateSavingsGoalContribution,
  type DbSavingsGoal,
  type DbSavingsGoalContribution,
} from "@/lib/supabase"
import {
  buildSavingsGoalSummary,
  normalizeDateInput,
  parseCurrencyAmount,
} from "@/lib/savings-goal-utils"
import { cn } from "@/lib/utils"

const ICON_OPTIONS = [
  { name: "piggy-bank", label: "Savings" },
  { name: "shield", label: "Emergency" },
  { name: "palm-tree", label: "Vacation" },
  { name: "car", label: "Car" },
  { name: "home", label: "Home" },
  { name: "monitor", label: "Tech" },
  { name: "graduation-cap", label: "Education" },
  { name: "plane", label: "Travel" },
  { name: "heart", label: "Personal" },
  { name: "trending-up", label: "Investment" },
  { name: "briefcase", label: "Business" },
  { name: "target", label: "Goal" },
]

const iconMap: Record<string, ReactNode> = {
  "piggy-bank": <PiggyBankIcon className="size-5" />,
  shield: <ShieldIcon className="size-5" />,
  "palm-tree": <PalmtreeIcon className="size-5" />,
  car: <CarIcon className="size-5" />,
  home: <HomeIcon className="size-5" />,
  monitor: <MonitorIcon className="size-5" />,
  "graduation-cap": <GraduationCapIcon className="size-5" />,
  plane: <PlaneIcon className="size-5" />,
  heart: <HeartIcon className="size-5" />,
  "trending-up": <TrendingUpIcon className="size-5" />,
  briefcase: <BriefcaseIcon className="size-5" />,
  target: <TargetIcon className="size-5" />,
  // Legacy key aliases
  vacation: <PalmtreeIcon className="size-5" />,
  emergency: <ShieldIcon className="size-5" />,
  savings: <PiggyBankIcon className="size-5" />,
  dream: <TargetIcon className="size-5" />,
}

const emojiToIconName: Record<string, string> = {
  "💰": "piggy-bank",
  "🛡️": "shield",
  "🏝️": "palm-tree",
  "🚗": "car",
  "🏠": "home",
  "💻": "monitor",
  "🎓": "graduation-cap",
  "✈️": "plane",
  "💍": "heart",
  "📈": "trending-up",
  "🧳": "briefcase",
  "🎯": "target",
}

type GoalFormState = {
  name: string
  targetAmount: string
  currentAmount: string
  monthlyContribution: string
  targetDate: string | null
  icon: string
}

type ContributionFormState = {
  amount: string
  contributedAt: string
  notes: string
}

const emptyGoalForm: GoalFormState = {
  name: "",
  targetAmount: "",
  currentAmount: "0",
  monthlyContribution: "",
  targetDate: null,
  icon: "piggy-bank",
}

function formatCurrency(amount: number) {
  return `৳${amount.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`
}

function parseStoredDate(dateValue: string | null): Date | undefined {
  if (!dateValue) return undefined
  return new Date(`${dateValue}T12:00:00`)
}

function goalToForm(goal: DbSavingsGoal): GoalFormState {
  return {
    name: goal.name,
    targetAmount: String(goal.target_amount),
    currentAmount: String(goal.current_amount),
    monthlyContribution: String(goal.monthly_contribution),
    targetDate: goal.target_date,
    icon: emojiToIconName[goal.icon] || goal.icon || "piggy-bank",
  }
}

function goalIcon(icon: string) {
  return iconMap[icon] ?? <PiggyBankIcon className="size-5" />
}

function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start" />}>
        <CalendarIcon data-icon="inline-start" />
        {value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-BD") : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2050, 11)}
          selected={parseStoredDate(value)}
          onSelect={(date) => onChange(normalizeDateInput(date))}
        />
      </PopoverContent>
    </Popover>
  )
}

export function SavingsGoals() {
  const [goals, setGoals] = useState<DbSavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<DbSavingsGoal | null>(null)
  const [activeGoal, setActiveGoal] = useState<DbSavingsGoal | null>(null)
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadGoals() {
    setIsLoading(true)
    const data = await getSavingsGoals()
    setGoals(data)
    setIsLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadGoals()
    })
  }, [])

  function openCreateGoal() {
    setEditingGoal(null)
    setGoalForm(emptyGoalForm)
    setFormError(null)
    setGoalDialogOpen(true)
  }

  function openEditGoal(goal: DbSavingsGoal) {
    setEditingGoal(goal)
    setGoalForm(goalToForm(goal))
    setFormError(null)
    setGoalDialogOpen(true)
  }

  function openHistory(goal: DbSavingsGoal) {
    setActiveGoal(goal)
    setHistoryDialogOpen(true)
  }

  async function handleSaveGoal() {
    const name = goalForm.name.trim()
    const targetAmount = parseCurrencyAmount(goalForm.targetAmount)
    const currentAmount = parseCurrencyAmount(goalForm.currentAmount) ?? 0
    const monthlyContribution = parseCurrencyAmount(goalForm.monthlyContribution) ?? 0

    if (!name || !targetAmount) {
      setFormError("Name and target amount are required.")
      return
    }

    setIsSaving(true)
    const payload = {
      name,
      targetAmount,
      currentAmount,
      targetDate: goalForm.targetDate,
      monthlyContribution,
      icon: goalForm.icon,
    }
    const saved = editingGoal
      ? await updateSavingsGoal(editingGoal.id, payload)
      : await createSavingsGoal(payload)
    setIsSaving(false)

    if (!saved) {
      setFormError("Could not save this goal.")
      return
    }

    setGoalDialogOpen(false)
    await loadGoals()
  }

  async function handleDeleteGoal(goal: DbSavingsGoal) {
    if (!window.confirm(`Delete ${goal.name}?`)) return
    setIsSaving(true)
    await deleteSavingsGoal(goal.id)
    setIsSaving(false)
    await loadGoals()
  }

  return (
    <Card className="col-span-full overflow-hidden border-border/40 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">Active Savings Goals</CardTitle>
        <Button size="sm" onClick={openCreateGoal}>
          <PlusIcon data-icon="inline-start" />
          Create Goal
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SavingsGoalsSkeleton />
        ) : goals.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
            <PiggyBankIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No active savings goals</p>
            <Button size="sm" variant="outline" onClick={openCreateGoal}>
              <PlusIcon data-icon="inline-start" />
              Create Goal
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((goal) => (
              <SavingsGoalItem
                key={goal.id}
                goal={goal}
                onAddContribution={openHistory}
                onEdit={openEditGoal}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        )}
      </CardContent>

      <GoalEditorDialog
        open={goalDialogOpen}
        mode={editingGoal ? "edit" : "create"}
        form={goalForm}
        formError={formError}
        isSaving={isSaving}
        onOpenChange={setGoalDialogOpen}
        onChange={setGoalForm}
        onSave={handleSaveGoal}
      />

      <ContributionHistoryDialog
        open={historyDialogOpen}
        goal={activeGoal}
        onOpenChange={setHistoryDialogOpen}
        onChanged={loadGoals}
      />
    </Card>
  )
}

function SavingsGoalsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-4 rounded-lg border p-4">
          <Skeleton className="size-10 shrink-0 rounded-lg bg-foreground/5" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-24 bg-foreground/5" />
              <Skeleton className="h-4 w-12 bg-foreground/5" />
            </div>
            <Skeleton className="h-6 w-32 bg-foreground/5" />
            <Skeleton className="h-2 w-full bg-foreground/5" />
            <div className="flex justify-between gap-3">
              <Skeleton className="h-3 w-16 bg-foreground/5" />
              <Skeleton className="h-3 w-20 bg-foreground/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SavingsGoalItem({
  goal,
  onAddContribution,
  onEdit,
  onDelete,
}: {
  goal: DbSavingsGoal
  onAddContribution: (goal: DbSavingsGoal) => void
  onEdit: (goal: DbSavingsGoal) => void
  onDelete: (goal: DbSavingsGoal) => void
}) {
  const summary = useMemo(
    () =>
      buildSavingsGoalSummary({
        currentAmount: goal.current_amount,
        targetAmount: goal.target_amount,
        monthlyContribution: goal.monthly_contribution,
        targetDate: goal.target_date,
      }),
    [goal]
  )

  return (
    <div className="flex gap-4 rounded-lg border border-border/60 bg-background/50 p-4 transition-colors hover:bg-background/80">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {goalIcon(goal.icon)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{goal.name}</p>
            <p className="text-xs text-muted-foreground">{summary.percent}% funded</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge
              variant={summary.isOnTrack ? "secondary" : "destructive"}
              className="h-5 text-[10px] font-bold uppercase"
            >
              {summary.isOnTrack ? "On track" : "Behind"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                <MoreHorizontalIcon />
                <span className="sr-only">Goal actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onAddContribution(goal)}>
                    <PlusIcon />
                    Add Contribution
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <PencilIcon />
                    Edit Goal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(goal)}>
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums">{formatCurrency(goal.current_amount)}</span>
          <span className="text-xs text-muted-foreground">/ {formatCurrency(goal.target_amount)}</span>
        </div>
        <Progress value={summary.percent} className="h-2" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
          <span>{formatCurrency(goal.monthly_contribution)}/mo</span>
          <span>Target: {summary.targetLabel}</span>
          <span>Left: {formatCurrency(summary.remainingAmount)}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => onAddContribution(goal)}>
            <PlusIcon data-icon="inline-start" />
            Add Contribution
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAddContribution(goal)}>
            <HistoryIcon data-icon="inline-start" />
            History
          </Button>
        </div>
      </div>
    </div>
  )
}

function GoalEditorDialog({
  open,
  mode,
  form,
  formError,
  isSaving,
  onOpenChange,
  onChange,
  onSave,
}: {
  open: boolean
  mode: "create" | "edit"
  form: GoalFormState
  formError: string | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onChange: (form: GoalFormState) => void
  onSave: () => void
}) {
  const title = mode === "edit" ? "Edit Goal" : "Create Goal"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Emergency fund"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                value={form.targetAmount}
                onChange={(event) => onChange({ ...form, targetAmount: event.target.value })}
                placeholder="500000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-current">Current amount</Label>
              <Input
                id="goal-current"
                inputMode="decimal"
                value={form.currentAmount}
                onChange={(event) => onChange({ ...form, currentAmount: event.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-monthly">Monthly contribution</Label>
              <Input
                id="goal-monthly"
                inputMode="decimal"
                value={form.monthlyContribution}
                onChange={(event) => onChange({ ...form, monthlyContribution: event.target.value })}
                placeholder="20000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Target date</Label>
              <DatePicker
                value={form.targetDate}
                placeholder="Pick target date"
                onChange={(targetDate) => onChange({ ...form, targetDate })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {ICON_OPTIONS.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  size="icon"
                  variant={form.icon === option.name ? "secondary" : "outline"}
                  title={option.label}
                  onClick={() => onChange({ ...form, icon: option.name })}
                >
                  {iconMap[option.name]}
                  <span className="sr-only">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContributionHistoryDialog({
  open,
  goal,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  goal: DbSavingsGoal | null
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<void>
}) {
  const [contributions, setContributions] = useState<DbSavingsGoalContribution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingContribution, setEditingContribution] = useState<DbSavingsGoalContribution | null>(null)
  const [form, setForm] = useState<ContributionFormState>({
    amount: "",
    contributedAt: normalizeDateInput(new Date()) || "",
    notes: "",
  })
  const [formError, setFormError] = useState<string | null>(null)

  async function loadContributions(goalId: string) {
    setIsLoading(true)
    const data = await getSavingsGoalContributions(goalId)
    setContributions(data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!open || !goal) return
    queueMicrotask(() => {
      setEditingContribution(null)
      setForm({
        amount: "",
        contributedAt: normalizeDateInput(new Date()) || "",
        notes: "",
      })
      setFormError(null)
      loadContributions(goal.id)
    })
  }, [open, goal])

  if (!goal) return null
  const selectedGoal = goal

  async function handleSaveContribution() {
    const amount = parseCurrencyAmount(form.amount)
    if (!amount || !form.contributedAt) {
      setFormError("Amount and date are required.")
      return
    }

    setIsSaving(true)
    const saved = editingContribution
      ? await updateSavingsGoalContribution({
          contributionId: editingContribution.id,
          amount,
          contributedAt: form.contributedAt,
          notes: form.notes,
        })
      : await addSavingsGoalContribution({
          goalId: selectedGoal.id,
          amount,
          contributedAt: form.contributedAt,
          notes: form.notes,
        })
    setIsSaving(false)

    if (!saved) {
      setFormError("Could not save this contribution.")
      return
    }

    setEditingContribution(null)
    setForm({
      amount: "",
      contributedAt: normalizeDateInput(new Date()) || "",
      notes: "",
    })
    setFormError(null)
    await loadContributions(selectedGoal.id)
    await onChanged()
  }

  function startEditContribution(contribution: DbSavingsGoalContribution) {
    setEditingContribution(contribution)
    setForm({
      amount: String(contribution.amount),
      contributedAt: contribution.contributed_at,
      notes: contribution.notes || "",
    })
    setFormError(null)
  }

  async function handleDeleteContribution(contribution: DbSavingsGoalContribution) {
    if (!window.confirm("Delete this contribution?")) return
    setIsSaving(true)
    await deleteSavingsGoalContribution(contribution.id)
    setIsSaving(false)
    await loadContributions(selectedGoal.id)
    await onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedGoal.name} History</DialogTitle>
          <DialogDescription className="sr-only">{selectedGoal.name} contribution history</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <p className="text-sm font-semibold">
              {editingContribution ? "Edit Contribution" : "Add Contribution"}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contribution-amount">Amount</Label>
              <Input
                id="contribution-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="10000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <DatePicker
                value={form.contributedAt}
                placeholder="Pick date"
                onChange={(contributedAt) =>
                  setForm({ ...form, contributedAt: contributedAt || normalizeDateInput(new Date()) || "" })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contribution-notes">Notes</Label>
              <Textarea
                id="contribution-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="May savings"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveContribution} disabled={isSaving}>
                {isSaving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                {editingContribution ? "Update" : "Add Contribution"}
              </Button>
              {editingContribution && (
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    setEditingContribution(null)
                    setForm({
                      amount: "",
                      contributedAt: normalizeDateInput(new Date()) || "",
                      notes: "",
                    })
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="flex min-h-64 flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">History</p>
              <Badge variant="secondary">{contributions.length}</Badge>
            </div>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full bg-foreground/5" />
                ))}
              </div>
            ) : contributions.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No contributions yet
              </div>
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {contributions.map((contribution) => (
                  <div
                    key={contribution.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border p-3",
                      editingContribution?.id === contribution.id && "border-primary"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold tabular-nums">{formatCurrency(contribution.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(`${contribution.contributed_at}T12:00:00`).toLocaleDateString("en-BD")}
                      </p>
                      {contribution.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{contribution.notes}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startEditContribution(contribution)}
                      >
                        <PencilIcon />
                        <span className="sr-only">Edit contribution</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDeleteContribution(contribution)}
                      >
                        <Trash2Icon />
                        <span className="sr-only">Delete contribution</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
