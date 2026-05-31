import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const transactionTable = readFileSync(
  "src/components/transactions/transaction-table.tsx",
  "utf8"
)
const transactionFilters = readFileSync(
  "src/components/transactions/transaction-filters.tsx",
  "utf8"
)
const transactionsClient = readFileSync(
  "src/components/transactions/transactions-page-client.tsx",
  "utf8"
)

test("transactions page keeps mobile select mode with the filters", () => {
  assert.match(transactionsClient, /const \[isSelecting, setIsSelecting\] = useState\(false\)/)
  assert.match(transactionsClient, /isSelecting=\{isSelecting\}/)
  assert.match(transactionsClient, /setIsSelecting=\{setIsSelecting\}/)
  assert.match(transactionFilters, /isSelecting: boolean/)
  assert.match(transactionFilters, /setIsSelecting: \(v: boolean\) => void/)
  assert.match(transactionFilters, /\{isSelecting \? "Done" : "Select"\}/)
})

test("transaction table gates mobile checkboxes behind select mode", () => {
  assert.match(transactionTable, /isSelecting/)
  assert.match(transactionTable, /isSelecting \? "table-cell" : "hidden sm:table-cell"/)
  assert.doesNotMatch(transactionTable, /\{isSelecting \? "Done" : "Select"\}/)
})

test("transaction table keeps amount visible and removes dead row options", () => {
  assert.match(transactionTable, /table-fixed sm:table-auto/)
  assert.match(transactionTable, /<TableHead className="w-\[7\.25rem\] text-right sm:w-auto">Amount/)
  assert.doesNotMatch(transactionTable, /Open transaction options/)
  assert.doesNotMatch(transactionTable, /MoreHorizontalIcon/)
  assert.doesNotMatch(transactionTable, /View Details/)
})
