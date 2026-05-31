import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildSavingsGoalSummary,
  normalizeDateInput,
  parseCurrencyAmount,
} from "./savings-goal-utils.ts"

test("currency amount parser accepts positive formatted values only", () => {
  assert.equal(parseCurrencyAmount("45,500.75"), 45500.75)
  assert.equal(parseCurrencyAmount(" 30000 "), 30000)
  assert.equal(parseCurrencyAmount("0"), null)
  assert.equal(parseCurrencyAmount("-10"), null)
  assert.equal(parseCurrencyAmount("not a number"), null)
})

test("date input normalizer stores calendar dates without timezone drift", () => {
  assert.equal(normalizeDateInput(new Date("2026-05-31T18:00:00+06:00")), "2026-05-31")
  assert.equal(normalizeDateInput(undefined), null)
})

test("savings goal summary calculates progress and monthly timing", () => {
  const summary = buildSavingsGoalSummary({
    currentAmount: 82000,
    targetAmount: 500000,
    monthlyContribution: 20000,
    targetDate: "2028-06-30",
    now: new Date("2026-05-31T12:00:00+06:00"),
  })

  assert.deepEqual(summary, {
    percent: 16,
    remainingAmount: 418000,
    monthsLeft: 21,
    projectedDate: "2028-02-29",
    targetLabel: "Jun 2028",
    isOnTrack: true,
  })
})
