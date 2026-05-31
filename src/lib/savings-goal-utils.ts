export type SavingsGoalSummaryInput = {
  currentAmount: number
  targetAmount: number
  monthlyContribution: number
  targetDate: string | null
  now?: Date
}

export type SavingsGoalSummary = {
  percent: number
  remainingAmount: number
  monthsLeft: number
  projectedDate: string | null
  targetLabel: string
  isOnTrack: boolean
}

export function parseCurrencyAmount(value: string): number | null {
  const amount = Number(value.replace(/,/g, "").trim())
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

export function normalizeDateInput(date: Date | undefined): string | null {
  if (!date) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const targetYear = year + Math.floor(month / 12)
  const targetMonth = ((month % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()

  return new Date(
    targetYear,
    targetMonth,
    Math.min(date.getDate(), lastDay),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  )
}

export function formatGoalMonth(dateValue: string | null): string {
  if (!dateValue) return "Flexible"

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString("en-BD", {
    month: "short",
    year: "numeric",
  })
}

export function buildSavingsGoalSummary({
  currentAmount,
  targetAmount,
  monthlyContribution,
  targetDate,
  now = new Date(),
}: SavingsGoalSummaryInput): SavingsGoalSummary {
  const safeTarget = Math.max(targetAmount, 0)
  const safeCurrent = Math.max(currentAmount, 0)
  const remainingAmount = Math.max(safeTarget - safeCurrent, 0)
  const percent = safeTarget > 0 ? Math.min(Math.round((safeCurrent / safeTarget) * 100), 100) : 0
  const monthsLeft =
    remainingAmount > 0 && monthlyContribution > 0
      ? Math.ceil(remainingAmount / monthlyContribution)
      : 0
  const projected = monthsLeft > 0 ? addCalendarMonths(now, monthsLeft) : null
  const projectedDate = normalizeDateInput(projected ?? undefined)
  const deadlineDate = targetDate ? new Date(`${targetDate}T23:59:59`) : null

  return {
    percent,
    remainingAmount,
    monthsLeft,
    projectedDate,
    targetLabel: formatGoalMonth(targetDate),
    isOnTrack: deadlineDate && projected ? projected <= deadlineDate : true,
  }
}
