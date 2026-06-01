export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"

export type ProjectPayoutLike = {
  amount: number
  status: "pending" | "received"
}

export type ProjectSummaryInput = {
  myTotalShare: number
  payouts: ProjectPayoutLike[]
}

export type ProjectSummary = {
  receivedTotal: number
  pendingTotal: number
  receivedPercent: number
  remaining: number
}

/**
 * Resolves the amount the user personally earns from a project.
 * Prefers an explicit override; otherwise derives it from the budget percentage.
 */
export function computeMyShare(
  totalBudget: number,
  sharePercent: number | null,
  shareAmountOverride: number | null
): number {
  if (shareAmountOverride !== null && Number.isFinite(shareAmountOverride) && shareAmountOverride > 0) {
    return Math.round(shareAmountOverride * 100) / 100
  }
  if (sharePercent !== null && Number.isFinite(sharePercent) && totalBudget > 0) {
    return Math.round(((totalBudget * sharePercent) / 100) * 100) / 100
  }
  return 0
}

/** Amount of a payout milestone expressed as a percentage of the user's share. */
export function payoutAmountFromPercent(myTotalShare: number, percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0 || myTotalShare <= 0) return 0
  return Math.round(((myTotalShare * percent) / 100) * 100) / 100
}

/** Aggregates received / pending payout totals and funding progress. */
export function buildProjectSummary({
  myTotalShare,
  payouts,
}: ProjectSummaryInput): ProjectSummary {
  const receivedTotal = payouts
    .filter((p) => p.status === "received")
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const pendingTotal = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const base = myTotalShare > 0 ? myTotalShare : receivedTotal + pendingTotal
  const receivedPercent = base > 0 ? Math.min(Math.round((receivedTotal / base) * 100), 100) : 0
  const remaining = Math.max(base - receivedTotal, 0)

  return {
    receivedTotal: Math.round(receivedTotal * 100) / 100,
    pendingTotal: Math.round(pendingTotal * 100) / 100,
    receivedPercent,
    remaining: Math.round(remaining * 100) / 100,
  }
}

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; badge: "default" | "secondary" | "destructive" | "outline" }
> = {
  planning: { label: "Planning", badge: "outline" },
  active: { label: "Active", badge: "default" },
  on_hold: { label: "On hold", badge: "secondary" },
  completed: { label: "Completed", badge: "secondary" },
  cancelled: { label: "Cancelled", badge: "destructive" },
}

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_META[status]?.label ?? status
}

export function formatProjectDateRange(
  startDate: string | null,
  endDate: string | null
): string {
  const fmt = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("en-BD", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`
  if (startDate) return `From ${fmt(startDate)}`
  if (endDate) return `Due ${fmt(endDate)}`
  return "No dates set"
}
