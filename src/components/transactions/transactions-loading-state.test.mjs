import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const transactionsClient = readFileSync(
  "src/components/transactions/transactions-page-client.tsx",
  "utf8"
)

test("transactions client renders skeletons while fetching data", () => {
  assert.match(transactionsClient, /TransactionsLoadingSkeleton/)
  assert.match(transactionsClient, /<Skeleton/)
  assert.doesNotMatch(transactionsClient, /Loading transactions\.\.\./)
  assert.doesNotMatch(transactionsClient, /Loader2Icon/)
})
