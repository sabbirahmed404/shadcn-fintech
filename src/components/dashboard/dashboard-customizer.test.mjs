import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8")
const customizer = readFileSync(
  "src/components/dashboard/dashboard-customizer.tsx",
  "utf8"
)

test("dashboard layout exposes a header slot for page actions", () => {
  assert.match(layout, /id="dashboard-header-actions"/)
})

test("dashboard customizer renders controls through the header slot", () => {
  assert.match(customizer, /createPortal\(/)
  assert.match(customizer, /const HEADER_ACTIONS_ID = "dashboard-header-actions"/)
  assert.match(
    customizer,
    /document\.getElementById\(HEADER_ACTIONS_ID\)/
  )
  assert.doesNotMatch(
    customizer,
    /<div className="flex items-center justify-end gap-2">/
  )
})
