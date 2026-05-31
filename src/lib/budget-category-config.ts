export type BudgetCategoryItem = {
  id: string
  name: string
  budget: number
  icon: string
  color: string
}

export type BudgetCategorySettings = {
  version: 2
  items: BudgetCategoryItem[]
  last_budget_month?: string
}

export const DEFAULT_BUDGET_ITEMS: BudgetCategoryItem[] = [
  {
    id: "food-dining",
    name: "Food & Dining",
    budget: 8000,
    icon: "utensils",
    color: "text-orange-500",
  },
  {
    id: "transport",
    name: "Transport",
    budget: 4000,
    icon: "car",
    color: "text-blue-500",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    budget: 3000,
    icon: "gamepad-2",
    color: "text-purple-500",
  },
  {
    id: "shopping",
    name: "Shopping",
    budget: 6000,
    icon: "shopping-bag",
    color: "text-pink-500",
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    budget: 2000,
    icon: "repeat",
    color: "text-cyan-500",
  },
  {
    id: "health-fitness",
    name: "Health & Fitness",
    budget: 1500,
    icon: "heart-pulse",
    color: "text-emerald-500",
  },
  {
    id: "education",
    name: "Education",
    budget: 2500,
    icon: "graduation-cap",
    color: "text-amber-500",
  },
  {
    id: "travel",
    name: "Travel",
    budget: 6000,
    icon: "plane",
    color: "text-rose-500",
  },
]

const DEFAULT_ICON = "wallet-cards"
const DEFAULT_COLOR = "text-primary"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function slugifyCategoryName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "category"
}

function uniqueId(baseId: string, items: BudgetCategoryItem[]) {
  const existingIds = new Set(items.map((item) => item.id))
  if (!existingIds.has(baseId)) return baseId

  let index = 2
  let nextId = `${baseId}-${index}`
  while (existingIds.has(nextId)) {
    index += 1
    nextId = `${baseId}-${index}`
  }

  return nextId
}

function assertValidName(name: string, items: BudgetCategoryItem[], itemId?: string) {
  const normalizedName = name.trim().toLowerCase()
  if (!normalizedName) {
    throw new Error("Category name is required")
  }

  const duplicate = items.some(
    (item) => item.id !== itemId && item.name.trim().toLowerCase() === normalizedName
  )
  if (duplicate) {
    throw new Error(`Category "${name.trim()}" already exists`)
  }
}

function normalizeBudget(value: unknown, fallback: number) {
  const budget = Number(value)
  return Number.isFinite(budget) && budget >= 0 ? budget : fallback
}

function normalizeItem(
  rawItem: unknown,
  fallback: BudgetCategoryItem,
  existingItems: BudgetCategoryItem[]
): BudgetCategoryItem | null {
  if (!isRecord(rawItem)) return null

  const name = typeof rawItem.name === "string" ? rawItem.name.trim() : ""
  if (!name) return null

  const id =
    typeof rawItem.id === "string" && rawItem.id.trim()
      ? rawItem.id.trim()
      : uniqueId(slugifyCategoryName(name), existingItems)

  return {
    id,
    name,
    budget: normalizeBudget(rawItem.budget, fallback.budget),
    icon:
      typeof rawItem.icon === "string" && rawItem.icon.trim()
        ? rawItem.icon.trim()
        : fallback.icon,
    color:
      typeof rawItem.color === "string" && rawItem.color.trim()
        ? rawItem.color.trim()
        : fallback.color,
  }
}

export function normalizeBudgetCategorySettings(settings: unknown): BudgetCategoryItem[] {
  if (isRecord(settings) && settings.version === 2 && Array.isArray(settings.items)) {
    const items = settings.items.reduce<BudgetCategoryItem[]>((result, rawItem) => {
      const fallback = {
        id: "category",
        name: "Category",
        budget: 5000,
        icon: DEFAULT_ICON,
        color: DEFAULT_COLOR,
      }
      const item = normalizeItem(rawItem, fallback, result)
      return item ? [...result, item] : result
    }, [])

    return items.length > 0 ? items : DEFAULT_BUDGET_ITEMS
  }

  const legacyBudgets = isRecord(settings) ? settings : {}

  return DEFAULT_BUDGET_ITEMS.map((item) => ({
    ...item,
    budget: normalizeBudget(legacyBudgets[item.name], item.budget),
  }))
}

export function getCurrentBudgetMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function extractLastBudgetMonth(settings: unknown): string | null {
  if (
    isRecord(settings) &&
    typeof settings.last_budget_month === "string" &&
    settings.last_budget_month.trim()
  ) {
    return settings.last_budget_month.trim()
  }
  return null
}

export function isBudgetSetForCurrentMonth(settings: unknown): boolean {
  const lastMonth = extractLastBudgetMonth(settings)
  return lastMonth === getCurrentBudgetMonth()
}

export function toBudgetCategorySettings(items: BudgetCategoryItem[]): BudgetCategorySettings {
  return {
    version: 2,
    items: items.map((item) => ({ ...item })),
    last_budget_month: getCurrentBudgetMonth(),
  }
}

export function createBudgetCategoryItem(
  name: string,
  budget: number,
  icon = DEFAULT_ICON,
  color = DEFAULT_COLOR
): BudgetCategoryItem {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error("Category name is required")
  }

  return {
    id: slugifyCategoryName(trimmedName),
    name: trimmedName,
    budget: normalizeBudget(budget, 5000),
    icon,
    color,
  }
}

export function addBudgetCategoryItem(
  items: BudgetCategoryItem[],
  item: BudgetCategoryItem
) {
  assertValidName(item.name, items)
  return [
    ...items,
    {
      ...item,
      id: uniqueId(item.id || slugifyCategoryName(item.name), items),
    },
  ]
}

export function updateBudgetCategoryItem(
  items: BudgetCategoryItem[],
  itemId: string,
  updates: Partial<Omit<BudgetCategoryItem, "id">>
) {
  const existingItem = items.find((item) => item.id === itemId)
  if (!existingItem) return items

  const nextName = updates.name?.trim() ?? existingItem.name
  assertValidName(nextName, items, itemId)

  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          ...updates,
          name: nextName,
          budget:
            updates.budget === undefined
              ? item.budget
              : normalizeBudget(updates.budget, item.budget),
        }
      : item
  )
}

export function moveBudgetCategoryItem(
  items: BudgetCategoryItem[],
  itemId: string,
  direction: "up" | "down"
) {
  const currentIndex = items.findIndex((item) => item.id === itemId)
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [item] = nextItems.splice(currentIndex, 1)
  nextItems.splice(nextIndex, 0, item)
  return nextItems
}

export function deleteBudgetCategoryItem(items: BudgetCategoryItem[], itemId: string) {
  if (items.length <= 1) {
    throw new Error("Keep at least one budget category")
  }

  const nextItems = items.filter((item) => item.id !== itemId)
  return nextItems.length > 0 ? nextItems : items
}
