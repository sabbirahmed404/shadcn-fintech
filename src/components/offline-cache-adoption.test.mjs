import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const cachedComponents = [
  "src/components/transactions/transactions-page-client.tsx",
  "src/components/accounts/accounts-page-client.tsx",
  "src/components/dashboard/total-balance.tsx",
  "src/components/dashboard/account-cards.tsx",
  "src/components/dashboard/recent-transactions.tsx",
  "src/components/budgets/month-projection.tsx",
  "src/components/budgets/spending-calendar.tsx",
  "src/components/transfers/transfers-page-client.tsx",
]

test("core mobile data components use the shared cached query hook", () => {
  for (const file of cachedComponents) {
    const source = readFileSync(file, "utf8")

    assert.match(source, /useCachedQuery/, `${file} should use useCachedQuery`)
    assert.match(source, /CACHE_KEYS/, `${file} should use typed cache keys`)
    assert.match(source, /DEMO_USER_ID/, `${file} should namespace by user id`)
  }
})

test("core mobile data components expose refresh paths after mutations", () => {
  const transactions = readFileSync(
    "src/components/transactions/transactions-page-client.tsx",
    "utf8"
  )
  const transfers = readFileSync(
    "src/components/transfers/transfers-page-client.tsx",
    "utf8"
  )
  const totalBalance = readFileSync(
    "src/components/dashboard/total-balance.tsx",
    "utf8"
  )

  assert.match(transactions, /await refresh\(\)/)
  assert.match(transfers, /onSent=\{refresh\}/)
  assert.match(totalBalance, /await refresh\(\)/)
})
