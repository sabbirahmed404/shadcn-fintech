"use client"

import { useEffect, useMemo, useState } from "react"
import { InfoIcon, Loader2Icon } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { createProject, updateProject, type DbProject } from "@/lib/supabase"
import { computeMyShare } from "@/lib/project-utils"
import { parseCurrencyAmount } from "@/lib/savings-goal-utils"
import { cn } from "@/lib/utils"
import {
  DatePicker,
  PROJECT_ICON_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  formatCurrency,
  projectIcon,
} from "@/components/organization/shared"

type ProjectFormState = {
  name: string
  clientName: string
  description: string
  status: DbProject["status"]
  startDate: string | null
  endDate: string | null
  totalBudget: string
  mySharePercent: string
  myShareAmount: string
  icon: string
}

const emptyForm: ProjectFormState = {
  name: "",
  clientName: "",
  description: "",
  status: "active",
  startDate: null,
  endDate: null,
  totalBudget: "",
  mySharePercent: "",
  myShareAmount: "",
  icon: "rocket",
}

function projectToForm(project: DbProject): ProjectFormState {
  return {
    name: project.name,
    clientName: project.client_name ?? "",
    description: project.description ?? "",
    status: project.status,
    startDate: project.start_date,
    endDate: project.end_date,
    totalBudget: project.total_budget ? String(project.total_budget) : "",
    mySharePercent: project.my_share_percent !== null ? String(project.my_share_percent) : "",
    myShareAmount: project.my_share_amount !== null ? String(project.my_share_amount) : "",
    icon: project.icon ?? "rocket",
  }
}

export function ProjectEditorDialog({
  open,
  project,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  project: DbProject | null
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState<ProjectFormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(project ? projectToForm(project) : emptyForm)
      setFormError(null)
    })
  }, [open, project])

  const computedShare = useMemo(() => {
    const budget = parseCurrencyAmount(form.totalBudget) ?? 0
    const percent = form.mySharePercent ? Number(form.mySharePercent) : null
    const override = parseCurrencyAmount(form.myShareAmount)
    return computeMyShare(budget, percent, override)
  }, [form.totalBudget, form.mySharePercent, form.myShareAmount])

  async function handleSave() {
    const name = form.name.trim()
    if (!name) {
      setFormError("Project name is required.")
      return
    }

    const totalBudget = parseCurrencyAmount(form.totalBudget) ?? 0
    const mySharePercent = form.mySharePercent.trim() ? Number(form.mySharePercent) : null
    const myShareAmount = parseCurrencyAmount(form.myShareAmount)

    if (mySharePercent !== null && (Number.isNaN(mySharePercent) || mySharePercent < 0 || mySharePercent > 100)) {
      setFormError("Your share percentage must be between 0 and 100.")
      return
    }

    setIsSaving(true)
    const payload = {
      name,
      clientName: form.clientName.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      totalBudget,
      mySharePercent,
      myShareAmount,
      icon: form.icon,
    }

    const ok = project
      ? await updateProject(project.id, payload)
      : (await createProject(payload)) !== null
    setIsSaving(false)

    if (!ok) {
      setFormError("Could not save this project.")
      return
    }

    onOpenChange(false)
    await onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto max-w-[min(calc(100%-2rem),34rem)] sm:max-w-[min(calc(100%-2rem),34rem)]">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription className="sr-only">
            {project ? "Edit project" : "Create a new project"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="FinFlow Mobile App"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-client">Client / Company</Label>
              <Input
                id="project-client"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this project about?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value as DbProject["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Start date</Label>
              <DatePicker
                value={form.startDate}
                placeholder="Pick start"
                onChange={(startDate) => setForm({ ...form, startDate })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>End date</Label>
              <DatePicker
                value={form.endDate}
                placeholder="Pick end"
                onChange={(endDate) => setForm({ ...form, endDate })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-budget">Total budget</Label>
              <Input
                id="project-budget"
                inputMode="decimal"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                placeholder="500000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-percent">My share (%)</Label>
              <Input
                id="project-percent"
                inputMode="decimal"
                value={form.mySharePercent}
                onChange={(e) => setForm({ ...form, mySharePercent: e.target.value })}
                placeholder="30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-amount">Override amount</Label>
              <Input
                id="project-amount"
                inputMode="decimal"
                value={form.myShareAmount}
                onChange={(e) => setForm({ ...form, myShareAmount: e.target.value })}
                placeholder="optional"
              />
            </div>
          </div>

          {computedShare > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
              <InfoIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Your earnings from this project:</span>
              <span className="ml-auto font-semibold tabular-nums text-primary">
                {formatCurrency(computedShare)}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {PROJECT_ICON_OPTIONS.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  size="icon"
                  variant={form.icon === option.name ? "secondary" : "outline"}
                  className={cn(
                    form.icon === option.name &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  title={option.label}
                  onClick={() => setForm({ ...form, icon: option.name })}
                >
                  {projectIcon(option.name)}
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
