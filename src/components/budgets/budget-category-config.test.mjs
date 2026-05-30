import assert from "node:assert/strict"
import test from "node:test"

import {
  addBudgetCategoryItem,
  createBudgetCategoryItem,
  DEFAULT_BUDGET_ITEMS,
  deleteBudgetCategoryItem,
  moveBudgetCategoryItem,
  normalizeBudgetCategorySettings,
  updateBudgetCategoryItem,
} from "../../lib/budget-category-config.ts"

test("normalizes legacy budget maps into ordered default budget items", () => {
  const items = normalizeBudgetCategorySettings({
    "Food & Dining": 9000,
    Transport: 4500,
  })

  assert.equal(items.length, DEFAULT_BUDGET_ITEMS.length)
  assert.equal(items[0].name, "Food & Dining")
  assert.equal(items[0].budget, 9000)
  assert.equal(items[1].name, "Transport")
  assert.equal(items[1].budget, 4500)
  assert.equal(items[0].icon, "utensils")
})

test("normalizes v2 settings and fills missing metadata", () => {
  const items = normalizeBudgetCategorySettings({
    version: 2,
    items: [
      { id: "custom-one", name: "Custom One", budget: 1234 },
      { id: "bad", name: "", budget: 10 },
    ],
  })

  assert.deepEqual(items, [
    {
      id: "custom-one",
      name: "Custom One",
      budget: 1234,
      icon: "wallet-cards",
      color: "text-primary",
    },
  ])
})

test("updates a category while preserving a unique id", () => {
  const items = normalizeBudgetCategorySettings({})
  const updated = updateBudgetCategoryItem(items, items[0].id, {
    name: "Dining",
    budget: 7500,
    icon: "shopping-bag",
    color: "text-pink-500",
  })

  assert.equal(updated[0].id, "food-dining")
  assert.equal(updated[0].name, "Dining")
  assert.equal(updated[0].budget, 7500)
  assert.equal(updated[0].icon, "shopping-bag")
  assert.equal(updated[0].color, "text-pink-500")
})

test("prevents duplicate names when updating or adding categories", () => {
  const items = normalizeBudgetCategorySettings({})

  assert.throws(
    () => updateBudgetCategoryItem(items, items[0].id, { name: "Transport" }),
    /already exists/
  )

  assert.throws(
    () => addBudgetCategoryItem(items, createBudgetCategoryItem("Transport", 1000)),
    /already exists/
  )
})

test("adds a category with a stable slug and unique fallback suffix", () => {
  const items = normalizeBudgetCategorySettings({})
  const added = addBudgetCategoryItem(
    items,
    createBudgetCategoryItem("Kids & School", 2200)
  )

  assert.equal(added.at(-1)?.id, "kids-school")
  assert.equal(added.at(-1)?.name, "Kids & School")
  assert.equal(added.at(-1)?.budget, 2200)
})

test("moves categories up and down within bounds", () => {
  const items = normalizeBudgetCategorySettings({})
  const movedUp = moveBudgetCategoryItem(items, items[1].id, "up")
  const movedDownAtEnd = moveBudgetCategoryItem(items, items.at(-1).id, "down")

  assert.equal(movedUp[0].id, items[1].id)
  assert.equal(movedUp[1].id, items[0].id)
  assert.deepEqual(movedDownAtEnd, items)
})

test("deletes categories but preserves the last remaining item", () => {
  const items = normalizeBudgetCategorySettings({})
  const oneDeleted = deleteBudgetCategoryItem(items, items[0].id)

  assert.equal(oneDeleted.length, items.length - 1)
  assert.throws(
    () => deleteBudgetCategoryItem([items[0]], items[0].id),
    /at least one/
  )
})
