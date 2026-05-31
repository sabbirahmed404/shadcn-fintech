"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BabyIcon,
  BanknoteIcon,
  BikeIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  BusFrontIcon,
  CarIcon,
  CheckCircle2Icon,
  CoffeeIcon,
  CreditCardIcon,
  DumbbellIcon,
  FilmIcon,
  FuelIcon,
  GraduationCapIcon,
  Gamepad2Icon,
  GiftIcon,
  HammerIcon,
  HandCoinsIcon,
  HeartPulseIcon,
  HomeIcon,
  LandmarkIcon,
  LaptopIcon,
  LightbulbIcon,
  Loader2Icon,
  MusicIcon,
  PaintbrushIcon,
  PlaneIcon,
  PlusIcon,
  PiggyBankIcon,
  PizzaIcon,
  ReceiptTextIcon,
  RepeatIcon,
  SaveIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShirtIcon,
  SmartphoneIcon,
  StethoscopeIcon,
  Trash2Icon,
  TrainFrontIcon,
  UtensilsIcon,
  WalletCardsIcon,
  WifiIcon,
  WrenchIcon,
} from "lucide-react"
import {
  addBudgetCategoryItem,
  createBudgetCategoryItem,
  deleteBudgetCategoryItem,
  moveBudgetCategoryItem,
  normalizeBudgetCategorySettings,
  toBudgetCategorySettings,
  type BudgetCategoryItem,
} from "@/lib/budget-category-config"
import {
  getProfileBudgets,
  getTransactions,
  updateCategoryBudgetSettings,
} from "@/lib/supabase"
import { cn } from "@/lib/utils"

const iconMap = {
  utensils: UtensilsIcon,
  car: CarIcon,
  "gamepad-2": Gamepad2Icon,
  "shopping-bag": ShoppingBagIcon,
  repeat: RepeatIcon,
  "heart-pulse": HeartPulseIcon,
  "graduation-cap": GraduationCapIcon,
  plane: PlaneIcon,
  home: HomeIcon,
  "wallet-cards": WalletCardsIcon,
  banknote: BanknoteIcon,
  "piggy-bank": PiggyBankIcon,
  "receipt-text": ReceiptTextIcon,
  "credit-card": CreditCardIcon,
  smartphone: SmartphoneIcon,
  wifi: WifiIcon,
  dumbbell: DumbbellIcon,
  stethoscope: StethoscopeIcon,
  shirt: ShirtIcon,
  fuel: FuelIcon,
  "bus-front": BusFrontIcon,
  "train-front": TrainFrontIcon,
  bike: BikeIcon,
  coffee: CoffeeIcon,
  pizza: PizzaIcon,
  "book-open": BookOpenIcon,
  laptop: LaptopIcon,
  "briefcase-business": BriefcaseBusinessIcon,
  gift: GiftIcon,
  baby: BabyIcon,
  landmark: LandmarkIcon,
  "shield-check": ShieldCheckIcon,
  wrench: WrenchIcon,
  hammer: HammerIcon,
  paintbrush: PaintbrushIcon,
  music: MusicIcon,
  film: FilmIcon,
  lightbulb: LightbulbIcon,
  "hand-coins": HandCoinsIcon,
}

const iconOptions = [
  { label: "Dining", value: "utensils" },
  { label: "Transport", value: "car" },
  { label: "Entertainment", value: "gamepad-2" },
  { label: "Shopping", value: "shopping-bag" },
  { label: "Recurring", value: "repeat" },
  { label: "Health", value: "heart-pulse" },
  { label: "Education", value: "graduation-cap" },
  { label: "Travel", value: "plane" },
  { label: "Home", value: "home" },
  { label: "Wallet", value: "wallet-cards" },
  { label: "Cash", value: "banknote" },
  { label: "Savings", value: "piggy-bank" },
  { label: "Bills", value: "receipt-text" },
  { label: "Cards", value: "credit-card" },
  { label: "Phone", value: "smartphone" },
  { label: "Internet", value: "wifi" },
  { label: "Fitness", value: "dumbbell" },
  { label: "Medical", value: "stethoscope" },
  { label: "Clothing", value: "shirt" },
  { label: "Fuel", value: "fuel" },
  { label: "Bus", value: "bus-front" },
  { label: "Train", value: "train-front" },
  { label: "Bike", value: "bike" },
  { label: "Coffee", value: "coffee" },
  { label: "Pizza", value: "pizza" },
  { label: "Books", value: "book-open" },
  { label: "Tech", value: "laptop" },
  { label: "Work", value: "briefcase-business" },
  { label: "Gifts", value: "gift" },
  { label: "Family", value: "baby" },
  { label: "Banking", value: "landmark" },
  { label: "Insurance", value: "shield-check" },
  { label: "Repairs", value: "wrench" },
  { label: "Maintenance", value: "hammer" },
  { label: "Creative", value: "paintbrush" },
  { label: "Music", value: "music" },
  { label: "Movies", value: "film" },
  { label: "Utilities", value: "lightbulb" },
  { label: "Allowance", value: "hand-coins" },
]

const colorOptions = [
  { label: "Orange", value: "text-orange-500" },
  { label: "Blue", value: "text-blue-500" },
  { label: "Purple", value: "text-purple-500" },
  { label: "Pink", value: "text-pink-500" },
  { label: "Cyan", value: "text-cyan-500" },
  { label: "Emerald", value: "text-emerald-500" },
  { label: "Amber", value: "text-amber-500" },
  { label: "Rose", value: "text-rose-500" },
  { label: "Primary", value: "text-primary" },
]

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type CategoryBudgetData = BudgetCategoryItem & {
  spent: number
}

function BudgetIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? WalletCardsIcon
  return <Icon className={className} />
}

function toBudgetItems(categories: CategoryBudgetData[]): BudgetCategoryItem[] {
  return categories.map(({ id, name, budget, icon, color }) => ({
    id,
    name,
    budget,
    icon,
    color,
  }))
}

function buildCategoryData(
  items: BudgetCategoryItem[],
  spentByCategory: Record<string, number>
): CategoryBudgetData[] {
  return items.map((item) => ({
    ...item,
    spent: spentByCategory[item.name] || 0,
  }))
}

function validateBudgetItems(items: BudgetCategoryItem[]) {
  const names = new Set<string>()

  return items.map((item) => {
    const name = item.name.trim()
    const normalizedName = name.toLowerCase()
    const budget = Number(item.budget)

    if (!name) {
      throw new Error("Every category needs a name.")
    }

    if (names.has(normalizedName)) {
      throw new Error(`"${name}" is already in your budget categories.`)
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error(`"${name}" needs a budget greater than 0.`)
    }

    names.add(normalizedName)

    return {
      ...item,
      name,
      budget,
      icon: item.icon || "wallet-cards",
      color: item.color || "text-primary",
    }
  })
}

async function loadBudgetData() {
  const [budgetSettings, txData] = await Promise.all([
    getProfileBudgets(),
    getTransactions(),
  ])

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const nextSpentByCategory: Record<string, number> = {}

  txData.forEach((tx) => {
    const txDate = new Date(tx.occurred_at)
    if (
      tx.direction === "out" &&
      tx.type !== "transfer" &&
      tx.type !== "goal_contribution" &&
      txDate.getFullYear() === currentYear &&
      txDate.getMonth() === currentMonth
    ) {
      let catName = tx.category
      if (catName === "Healthcare") catName = "Health & Fitness"
      nextSpentByCategory[catName] =
        (nextSpentByCategory[catName] || 0) + tx.amount
    }
  })

  Object.keys(nextSpentByCategory).forEach((category) => {
    nextSpentByCategory[category] =
      Math.round(nextSpentByCategory[category] * 100) / 100
  })

  return {
    budgetItems: normalizeBudgetCategorySettings(budgetSettings.category_budgets),
    spentByCategory: nextSpentByCategory,
  }
}

export function BudgetRings() {
  const [categories, setCategories] = useState<CategoryBudgetData[]>([])
  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [newBudgetVal, setNewBudgetVal] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [draftCategories, setDraftCategories] = useState<BudgetCategoryItem[]>([])
  const [managerError, setManagerError] = useState("")

  useEffect(() => {
    let isActive = true

    async function load() {
      const nextData = await loadBudgetData()
      if (!isActive) return

      setSpentByCategory(nextData.spentByCategory)
      setCategories(
        buildCategoryData(nextData.budgetItems, nextData.spentByCategory)
      )
      setIsLoading(false)
    }

    void load()

    return () => {
      isActive = false
    }
  }, [])

  const persistBudgetItems = async (items: BudgetCategoryItem[]) => {
    const success = await updateCategoryBudgetSettings(
      toBudgetCategorySettings(items)
    )

    if (success) {
      setCategories(buildCategoryData(items, spentByCategory))
    }

    return success
  }

  const openEditDialog = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    const catData = categories.find((category) => category.id === categoryId)
    setNewBudgetVal(catData ? String(catData.budget) : "5000")
    setSaveSuccess(false)
    setIsDialogOpen(true)
  }

  const openManagerDialog = () => {
    setDraftCategories(toBudgetItems(categories))
    setManagerError("")
    setIsManagerOpen(true)
  }

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  )

  const handleSaveBudget = async () => {
    const amount = parseFloat(newBudgetVal)
    if (Number.isNaN(amount) || amount <= 0 || !selectedCategory) return

    setIsSaving(true)
    const updatedItems = toBudgetItems(categories).map((category) =>
      category.id === selectedCategory.id ? { ...category, budget: amount } : category
    )
    const success = await persistBudgetItems(updatedItems)
    setIsSaving(false)

    if (success) {
      setSaveSuccess(true)
      setTimeout(() => {
        setIsDialogOpen(false)
        setSaveSuccess(false)
      }, 1200)
    }
  }

  const updateDraftCategory = (
    categoryId: string,
    updates: Partial<Omit<BudgetCategoryItem, "id">>
  ) => {
    setDraftCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category
      )
    )
    setManagerError("")
  }

  const handleAddCategory = () => {
    setDraftCategories((current) => {
      try {
        return addBudgetCategoryItem(
          current,
          createBudgetCategoryItem(`New Category ${current.length + 1}`, 5000)
        )
      } catch (error) {
        setManagerError(error instanceof Error ? error.message : "Unable to add category.")
        return current
      }
    })
  }

  const handleDeleteCategory = (categoryId: string) => {
    setDraftCategories((current) => {
      try {
        return deleteBudgetCategoryItem(current, categoryId)
      } catch (error) {
        setManagerError(
          error instanceof Error ? error.message : "Unable to delete category."
        )
        return current
      }
    })
  }

  const handleMoveCategory = (categoryId: string, direction: "up" | "down") => {
    setDraftCategories((current) =>
      moveBudgetCategoryItem(current, categoryId, direction)
    )
  }

  const handleSaveCategoryManager = async () => {
    let cleanedItems: BudgetCategoryItem[]

    try {
      cleanedItems = validateBudgetItems(draftCategories)
    } catch (error) {
      setManagerError(
        error instanceof Error ? error.message : "Review your categories and try again."
      )
      return
    }

    setIsSaving(true)
    const success = await persistBudgetItems(cleanedItems)
    setIsSaving(false)

    if (success) {
      setIsManagerOpen(false)
      setManagerError("")
    } else {
      setManagerError("Unable to save category changes.")
    }
  }

  return (
    <>
      <Card className="col-span-full overflow-hidden border-border/40 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold">
              Monthly Category Budgets
            </CardTitle>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Click any ring to adjust
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openManagerDialog}
            disabled={isLoading}
          >
            <Settings2Icon data-icon="inline-start" />
            Manage categories
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-6 py-4 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="size-24 rounded-full bg-foreground/5 animate-pulse" />
                  <Skeleton className="h-4 w-16 bg-foreground/5" />
                  <Skeleton className="h-3 w-12 bg-foreground/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {categories.map((category, index) => {
                const percent = Math.min(
                  (category.spent / (category.budget || 1)) * 100,
                  100
                )
                const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE
                const isOver = category.spent > category.budget

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => openEditDialog(category.id)}
                    className="group flex flex-col items-center gap-2 rounded-lg outline-none transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50"
                    title={`Click to adjust ${category.name} budget`}
                  >
                    <span className="relative size-24">
                      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r={RADIUS}
                          fill="none"
                          stroke="currentColor"
                          className="text-muted/40"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r={RADIUS}
                          fill="none"
                          stroke="currentColor"
                          className={isOver ? "text-destructive" : category.color}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          initial={{ strokeDashoffset: CIRCUMFERENCE }}
                          animate={{
                            strokeDashoffset: offset,
                            ...(isOver
                              ? { scale: [1, 1.02, 1], opacity: [1, 0.7, 1] }
                              : {}),
                          }}
                          transition={{
                            strokeDashoffset: {
                              duration: 1,
                              delay: index * 0.08,
                              ease: "easeOut",
                            },
                            scale: isOver ? { duration: 1.5, repeat: Infinity } : undefined,
                            opacity: isOver ? { duration: 1.5, repeat: Infinity } : undefined,
                          }}
                        />
                      </svg>
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center transition-transform group-hover:scale-110",
                          isOver ? "text-destructive animate-pulse" : category.color
                        )}
                      >
                        <BudgetIcon name={category.icon} className="size-5" />
                      </span>
                    </span>
                    <span className="text-center">
                      <span className="block text-xs font-semibold group-hover:underline">
                        {category.name}
                      </span>
                      <span className="block text-[10px] font-bold tabular-nums text-muted-foreground/80">
                        ৳{category.spent.toLocaleString()}{" "}
                        <span className="font-normal text-muted-foreground/50">
                          / ৳{category.budget.toLocaleString()}
                        </span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-background/80 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <span className={selectedCategory?.color}>
                <BudgetIcon
                  name={selectedCategory?.icon ?? "wallet-cards"}
                  className="size-5"
                />
              </span>
              <span>Adjust {selectedCategory?.name} Budget</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new budget cap for this budget-page category.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            {saveSuccess ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center gap-2 py-6 text-center"
              >
                <CheckCircle2Icon className="size-12 animate-bounce text-emerald-500" />
                <p className="text-sm font-semibold">Budget updated successfully!</p>
                <p className="text-xs text-muted-foreground">Refreshing category rings...</p>
              </motion.div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Allocated Budget (৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      ৳
                    </span>
                    <Input
                      type="number"
                      step="100"
                      className="pl-7 font-mono font-bold tracking-wide"
                      value={newBudgetVal}
                      onChange={(event) => setNewBudgetVal(event.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveBudget}
                    disabled={isSaving || !newBudgetVal}
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon data-icon="inline-start" className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Apply Budget"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
        <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Manage Budget Categories</DialogTitle>
            <DialogDescription>
              Customize only the categories shown in this budget section. Transactions keep their existing categories.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {draftCategories.map((category, index) => (
              <div
                key={category.id}
                className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 md:grid-cols-[1.3fr_0.8fr_0.9fr_0.9fr_auto]"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Name
                  </label>
                  <Input
                    value={category.name}
                    onChange={(event) =>
                      updateDraftCategory(category.id, { name: event.target.value })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Budget
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="100"
                    value={category.budget}
                    onChange={(event) =>
                      updateDraftCategory(category.id, {
                        budget: Number(event.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Icon
                  </label>
                  <Select
                    value={category.icon}
                    onValueChange={(value) => {
                      if (value) updateDraftCategory(category.id, { icon: value })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {iconOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <BudgetIcon name={option.value} />
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Color
                  </label>
                  <Select
                    value={category.color}
                    onValueChange={(value) => {
                      if (value) updateDraftCategory(category.id, { color: value })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {colorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span
                              className={cn(
                                "inline-flex size-3 rounded-full bg-current",
                                option.value
                              )}
                            />
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleMoveCategory(category.id, "up")}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUpIcon />
                    <span className="sr-only">Move {category.name} up</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleMoveCategory(category.id, "down")}
                    disabled={index === draftCategories.length - 1}
                    title="Move down"
                  >
                    <ArrowDownIcon />
                    <span className="sr-only">Move {category.name} down</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={draftCategories.length <= 1}
                    title="Delete category"
                  >
                    <Trash2Icon />
                    <span className="sr-only">Delete {category.name}</span>
                  </Button>
                </div>
              </div>
            ))}

            {managerError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {managerError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManagerOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleAddCategory}>
              <PlusIcon data-icon="inline-start" />
              Add category
            </Button>
            <Button onClick={handleSaveCategoryManager} disabled={isSaving}>
              {isSaving ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
