import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildSpendingLimitSummary,
  parseMonthlyBudgetInput,
} from "./spending-limit-utils.ts"

test("monthly spending summary uses only current-month expense transactions", () => {
  const now = new Date("2026-05-31T12:00:00+06:00")
  const transactions = [
    {
      amount: 1200,
      direction: "out",
      type: "expense",
      occurred_at: "2026-05-02T10:00:00+06:00",
    },
    {
      amount: 800,
      direction: "out",
      type: "bill_payment",
      occurred_at: "2026-05-05T10:00:00+06:00",
    },
    {
      amount: 999,
      direction: "out",
      type: "transfer",
      occurred_at: "2026-05-06T10:00:00+06:00",
    },
    {
      amount: 300,
      direction: "out",
      type: "goal_contribution",
      occurred_at: "2026-05-08T10:00:00+06:00",
    },
    {
      amount: 700,
      direction: "in",
      type: "income",
      occurred_at: "2026-05-10T10:00:00+06:00",
    },
    {
      amount: 1000,
      direction: "out",
      type: "expense",
      occurred_at: "2026-04-30T10:00:00+06:00",
    },
  ]

  assert.deepEqual(
    buildSpendingLimitSummary({
      budget: 5000,
      transactions,
      now,
    }),
    {
      budget: 5000,
      spent: 2000,
      percentUsed: 40,
      remaining: 3000,
    }
  )
})

test("monthly spending summary handles an exceeded limit without overfilling progress", () => {
  const summary = buildSpendingLimitSummary({
    budget: 1000,
    now: new Date("2026-05-31T12:00:00+06:00"),
    transactions: [
      {
        amount: 1500,
        direction: "out",
        type: "expense",
        occurred_at: "2026-05-12T10:00:00+06:00",
      },
    ],
  })

  assert.equal(summary.spent, 1500)
  assert.equal(summary.percentUsed, 100)
  assert.equal(summary.remaining, 0)
})

test("monthly budget input parser accepts useful values and rejects invalid ones", () => {
  assert.equal(parseMonthlyBudgetInput("45,500.75"), 45500.75)
  assert.equal(parseMonthlyBudgetInput(" 30000 "), 30000)
  assert.equal(parseMonthlyBudgetInput("0"), null)
  assert.equal(parseMonthlyBudgetInput("-10"), null)
  assert.equal(parseMonthlyBudgetInput("not a number"), null)
})
