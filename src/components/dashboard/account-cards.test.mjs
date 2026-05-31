import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const source = readFileSync("src/components/dashboard/account-cards.tsx", "utf8")

test("account card stack animation uses rendered card order for initial scale", () => {
  assert.match(source, /const stackDepth = cardOrder\.length/)
  assert.match(source, /stackPos === stackDepth - 1/)
  assert.match(source, /Math\.max\(stackDepth - 1, 1\)/)
  assert.doesNotMatch(source, /scale:[\s\S]*order\.length/)
})
