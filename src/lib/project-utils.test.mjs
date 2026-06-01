import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildProjectSummary,
  computeMyShare,
  formatProjectDateRange,
  payoutAmountFromPercent,
  projectStatusLabel,
} from "./project-utils.ts"

test("computeMyShare prefers explicit override over budget percentage", () => {
  assert.equal(computeMyShare(500000, 30, null), 150000)
  assert.equal(computeMyShare(500000, 30, 175000), 175000)
  assert.equal(computeMyShare(500000, null, null), 0)
  assert.equal(computeMyShare(0, 30, null), 0)
})

test("payoutAmountFromPercent splits the user's share", () => {
  assert.equal(payoutAmountFromPercent(150000, 20), 30000)
  assert.equal(payoutAmountFromPercent(150000, 80), 120000)
  assert.equal(payoutAmountFromPercent(0, 50), 0)
  assert.equal(payoutAmountFromPercent(150000, 0), 0)
})

test("buildProjectSummary aggregates received and pending payouts", () => {
  const summary = buildProjectSummary({
    myTotalShare: 200000,
    payouts: [
      { amount: 60000, status: "received" },
      { amount: 60000, status: "pending" },
      { amount: 80000, status: "pending" },
    ],
  })

  assert.deepEqual(summary, {
    receivedTotal: 60000,
    pendingTotal: 140000,
    receivedPercent: 30,
    remaining: 140000,
  })
})

test("buildProjectSummary falls back to payout totals when share is unknown", () => {
  const summary = buildProjectSummary({
    myTotalShare: 0,
    payouts: [
      { amount: 100, status: "received" },
      { amount: 100, status: "pending" },
    ],
  })

  assert.equal(summary.receivedPercent, 50)
  assert.equal(summary.remaining, 100)
})

test("status labels and date ranges format for display", () => {
  assert.equal(projectStatusLabel("on_hold"), "On hold")
  assert.equal(formatProjectDateRange(null, null), "No dates set")
  assert.equal(formatProjectDateRange("2026-01-10", null), "From Jan 10, 2026")
})
