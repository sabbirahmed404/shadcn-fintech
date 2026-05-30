import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const supabase = readFileSync("src/lib/supabase.ts", "utf8")
const accountGrid = readFileSync("src/components/accounts/account-grid.tsx", "utf8")
const addAccount = readFileSync("src/components/accounts/add-account.tsx", "utf8")

test("supabase exposes an account details update mutation", () => {
  assert.match(supabase, /export async function updateAccountDetails/)
  assert.match(supabase, /\.update\(\{\s*name,\s*provider,\s*account_number_last4/s)
})

test("account cards provide editable name, provider, and number fields", () => {
  assert.match(accountGrid, /updateAccountDetails/)
  assert.match(accountGrid, /Name/)
  assert.match(accountGrid, /Provider/)
  assert.match(accountGrid, /Account number/)
})

test("new accounts persist the entered account number last four", () => {
  assert.match(supabase, /accountNumberLast4\?: string \| null/)
  assert.match(supabase, /account_number_last4: accountNumberLast4/)
  assert.match(addAccount, /normalizeAccountNumberLast4\(accountNumber\)/)
})
