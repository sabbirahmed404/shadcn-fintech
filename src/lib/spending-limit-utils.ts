export type SpendingLimitTransaction = {
  amount: number
  direction: string
  type: string
  occurred_at: string
}

export type SpendingLimitSummary = {
  budget: number
  spent: number
  percentUsed: number
  remaining: number
}

const EXCLUDED_OUTFLOW_TYPES = new Set(["transfer", "goal_contribution"])

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function isCurrentMonth(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

export function parseMonthlyBudgetInput(value: string): number | null {
  const amount = Number.parseFloat(value.replaceAll(",", "").trim())

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return roundCurrency(amount)
}

export function normalizeMonthlyBudget(
  value: number | null | undefined,
  fallback = 30000
) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback
}

export function calculateCurrentMonthSpent(
  transactions: SpendingLimitTransaction[],
  now = new Date()
) {
  const spent = transactions.reduce((total, transaction) => {
    const transactionDate = new Date(transaction.occurred_at)

    if (
      transaction.direction !== "out" ||
      EXCLUDED_OUTFLOW_TYPES.has(transaction.type) ||
      !isCurrentMonth(transactionDate, now)
    ) {
      return total
    }

    return total + Number(transaction.amount)
  }, 0)

  return roundCurrency(spent)
}

export function buildSpendingLimitSummary({
  budget,
  transactions,
  now = new Date(),
}: {
  budget: number
  transactions: SpendingLimitTransaction[]
  now?: Date
}): SpendingLimitSummary {
  const normalizedBudget = normalizeMonthlyBudget(budget)
  const spent = calculateCurrentMonthSpent(transactions, now)
  const percentUsed = Math.min(
    Math.round((spent / normalizedBudget) * 100) || 0,
    100
  )

  return {
    budget: normalizedBudget,
    spent,
    percentUsed,
    remaining: Math.max(roundCurrency(normalizedBudget - spent), 0),
  }
}
