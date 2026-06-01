"use client"

import { useCallback, useMemo, useState } from "react"
import { motion } from "motion/react"
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  ClockIcon,
  CoinsIcon,
  LayoutGridIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  deleteProject,
  getAccounts,
  getContacts,
  getProjects,
  DEMO_USER_ID,
  type DbProject,
} from "@/lib/supabase"
import { useCachedQuery } from "@/hooks/use-cached-query"
import { CACHE_KEYS } from "@/lib/offline-cache"
import {
  PROJECT_STATUS_META,
  buildProjectSummary,
  formatProjectDateRange,
  projectStatusLabel,
} from "@/lib/project-utils"
import { ProjectEditorDialog } from "@/components/organization/project-editor-dialog"
import { ProjectDetailDialog } from "@/components/organization/project-detail-dialog"
import { formatCurrency, projectIcon } from "@/components/organization/shared"

function memberInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function OrganizationDashboard() {
  // Cached queries render instantly from the offline cache, then refresh in the
  // background. Project/payout mutations invalidate these keys, so the hooks
  // auto-refetch via the cache-invalidation subscription.
  const { data: projects, isLoading, refresh: refreshProjects } = useCachedQuery({
    key: CACHE_KEYS.projects,
    userId: DEMO_USER_ID,
    fetcher: getProjects,
    initialData: [] as DbProject[],
  })
  const { data: accounts, refresh: refreshAccounts } = useCachedQuery({
    key: CACHE_KEYS.accounts,
    userId: DEMO_USER_ID,
    fetcher: getAccounts,
    initialData: [],
  })
  const { data: contacts } = useCachedQuery({
    key: CACHE_KEYS.contacts,
    userId: DEMO_USER_ID,
    fetcher: getContacts,
    initialData: [],
  })

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<DbProject | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null)

  const reloadProjects = useCallback(async () => {
    await Promise.all([refreshProjects(), refreshAccounts()])
  }, [refreshProjects, refreshAccounts])

  const detailProject = useMemo(
    () => projects.find((p) => p.id === detailProjectId) ?? null,
    [projects, detailProjectId]
  )

  const stats = useMemo(() => {
    let earned = 0
    let upcoming = 0
    let active = 0
    let completed = 0
    for (const project of projects) {
      const summary = buildProjectSummary({ myTotalShare: project.my_total_share, payouts: project.payouts })
      earned += summary.receivedTotal
      if (project.status !== "completed" && project.status !== "cancelled") {
        upcoming += summary.pendingTotal
      }
      if (project.status === "active") active += 1
      if (project.status === "completed") completed += 1
    }
    return { earned, upcoming, active, completed }
  }, [projects])

  function openCreate() {
    setEditingProject(null)
    setEditorOpen(true)
  }

  function openEdit(project: DbProject) {
    setEditingProject(project)
    setEditorOpen(true)
  }

  function openDetail(project: DbProject) {
    setDetailProjectId(project.id)
    setDetailOpen(true)
  }

  async function handleDelete(project: DbProject) {
    if (!window.confirm(`Delete "${project.name}"? Already-received income is kept.`)) return
    await deleteProject(project.id)
    await reloadProjects()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total earned"
          value={formatCurrency(stats.earned)}
          icon={<CoinsIcon className="size-5" />}
          loading={isLoading}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Upcoming earnings"
          value={formatCurrency(stats.upcoming)}
          icon={<ClockIcon className="size-5" />}
          loading={isLoading}
        />
        <StatCard
          label="Active projects"
          value={String(stats.active)}
          icon={<LayoutGridIcon className="size-5" />}
          loading={isLoading}
        />
        <StatCard
          label="Completed"
          value={String(stats.completed)}
          icon={<CheckCircle2Icon className="size-5" />}
          loading={isLoading}
        />
      </div>

      {/* Projects */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Projects</CardTitle>
            <Badge variant="secondary">{projects.length}</Badge>
          </div>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            New Project
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ProjectsSkeleton />
          ) : projects.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
              <BriefcaseIcon className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No projects yet</p>
              <Button size="sm" variant="outline" onClick={openCreate}>
                <PlusIcon data-icon="inline-start" />
                New Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onManage={openDetail}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectEditorDialog
        open={editorOpen}
        project={editingProject}
        onOpenChange={setEditorOpen}
        onSaved={reloadProjects}
      />

      <ProjectDetailDialog
        open={detailOpen}
        project={detailProject}
        accounts={accounts}
        contacts={contacts}
        onOpenChange={setDetailOpen}
        onChanged={reloadProjects}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  loading,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  loading: boolean
  accent?: string
}) {
  return (
    <Card className="border-border/40 py-0">
      <CardContent className="flex items-center gap-2.5 p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-16 bg-foreground/5" />
          ) : (
            <p className={`text-base font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectCard({
  project,
  index,
  onManage,
  onEdit,
  onDelete,
}: {
  project: DbProject
  index: number
  onManage: (project: DbProject) => void
  onEdit: (project: DbProject) => void
  onDelete: (project: DbProject) => void
}) {
  const summary = useMemo(
    () => buildProjectSummary({ myTotalShare: project.my_total_share, payouts: project.payouts }),
    [project]
  )
  const statusMeta = PROJECT_STATUS_META[project.status]
  const visibleMembers = project.members.slice(0, 3)
  const extraMembers = project.members.length - visibleMembers.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
      className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/50 p-4 transition-colors hover:bg-background/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {projectIcon(project.icon)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{project.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {project.client_name ?? "No client"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={statusMeta.badge} className="h-5 text-[10px] font-bold uppercase">
            {projectStatusLabel(project.status)}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontalIcon />
              <span className="sr-only">Project actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onManage(project)}>
                  <SettingsIcon />
                  Payouts &amp; team
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <PencilIcon />
                  Edit project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(project)}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums">{formatCurrency(summary.receivedTotal)}</span>
          <span className="text-xs text-muted-foreground">/ {formatCurrency(project.my_total_share)}</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{summary.receivedPercent}%</span>
      </div>
      <Progress value={summary.receivedPercent} className="h-2" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{formatProjectDateRange(project.start_date, project.end_date)}</span>
        <span className="font-semibold">Budget {formatCurrency(project.total_budget)}</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {project.members.length > 0 ? (
          <AvatarGroup>
            {visibleMembers.map((member) => {
              const name = member.contact_name ?? member.name ?? "?"
              return (
                <Avatar key={member.id} size="sm">
                  {member.contact_avatar_url && <AvatarImage src={member.contact_avatar_url} alt={name} />}
                  <AvatarFallback>{memberInitials(name)}</AvatarFallback>
                </Avatar>
              )
            })}
            {extraMembers > 0 && <AvatarGroupCount>+{extraMembers}</AvatarGroupCount>}
          </AvatarGroup>
        ) : (
          <span className="text-[11px] text-muted-foreground">No team</span>
        )}
        <Button size="sm" variant="outline" onClick={() => onManage(project)}>
          <WalletIcon data-icon="inline-start" />
          Manage
        </Button>
      </div>
    </motion.div>
  )
}

function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-lg bg-foreground/5" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-28 bg-foreground/5" />
              <Skeleton className="h-3 w-20 bg-foreground/5" />
            </div>
          </div>
          <Skeleton className="h-6 w-32 bg-foreground/5" />
          <Skeleton className="h-2 w-full bg-foreground/5" />
          <Skeleton className="h-3 w-40 bg-foreground/5" />
        </div>
      ))}
    </div>
  )
}
