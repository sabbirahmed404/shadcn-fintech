import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const source = readFileSync("src/lib/supabase.ts", "utf8")

test("supabase mutations import offline cache invalidation helpers", () => {
  assert.match(source, /invalidateOfflineCache/)
  assert.match(source, /CACHE_KEYS/)
})

test("transaction mutations invalidate transaction-derived cache entries", () => {
  assert.match(source, /invalidateTransactionCaches\(\)/)
  assert.match(source, /CACHE_KEYS\.transactions/)
  assert.match(source, /CACHE_KEYS\.accounts/)
  assert.match(source, /CACHE_KEYS\.monthlyOverview/)
  assert.match(source, /CACHE_KEYS\.moneyMovement\("\*"\)/)
  assert.match(source, /CACHE_KEYS\.financialHealth/)
})

test("account mutations invalidate account-derived cache entries", () => {
  assert.match(source, /invalidateAccountCaches\(\)/)
  assert.match(source, /updateAccountBalance[\s\S]+invalidateAccountCaches\(\)/)
  assert.match(source, /updateAccountDetails[\s\S]+invalidateAccountCaches\(\)/)
  assert.match(source, /addAccount[\s\S]+invalidateAccountCaches\(\)/)
})

test("contact and money movement mutations invalidate related cache entries", () => {
  assert.match(source, /invalidateContactCaches\(\)/)
  assert.match(source, /invalidateMoneyMovementCaches\(\)/)
  assert.match(source, /addContact[\s\S]+invalidateContactCaches\(\)/)
  assert.match(source, /recordMoneyMovement[\s\S]+invalidateMoneyMovementCaches\(\)/)
  assert.match(source, /repayDebt[\s\S]+invalidateMoneyMovementCaches\(\)/)
})

test("profile budget reads gracefully handle databases without budget columns", () => {
  assert.match(source, /function isMissingProfileBudgetColumns/)
  assert.match(source, /isMissingProfileBudgetColumns\(error\)/)
  assert.match(source, /\.select\("\*"\)/)
  assert.match(source, /console\.warn\("Profile budget columns are unavailable/)
})
