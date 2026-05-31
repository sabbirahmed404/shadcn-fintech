import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const supabase = readFileSync("src/lib/supabase.ts", "utf8")
const savingsGoals = readFileSync("src/components/budgets/savings-goals.tsx", "utf8")

test("supabase exposes savings goal CRUD and contribution history helpers", () => {
  assert.match(supabase, /export async function createSavingsGoal/)
  assert.match(supabase, /export async function updateSavingsGoal/)
  assert.match(supabase, /export async function deleteSavingsGoal/)
  assert.match(supabase, /export async function getSavingsGoalContributions/)
  assert.match(supabase, /fn_add_fund_target_contribution/)
})

test("savings goals UI exposes creation, editing, contributions, history, and emoji choices", () => {
  assert.match(savingsGoals, /Create Goal/)
  assert.match(savingsGoals, /Edit Goal/)
  assert.match(savingsGoals, /Add Contribution/)
  assert.match(savingsGoals, /History/)
  assert.match(savingsGoals, /EMOJI_OPTIONS/)
})
