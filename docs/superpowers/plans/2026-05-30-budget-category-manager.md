# Budget Category Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build budget-only category management in the budgets page without mutating real transaction categories.

**Architecture:** Add pure helper functions for versioned budget category JSON, expose profile update helpers in `src/lib/supabase.ts`, then update `BudgetRings` to render and manage configured budget items. Keep transactions read-only and match spending by category name only.

**Tech Stack:** Next.js 16 App Router, React 19 client component, Supabase client, shadcn/base UI components, Node's built-in test runner for pure helper tests.

---

### Task 1: Budget Category Helpers

**Files:**
- Create: `src/lib/budget-category-config.ts`
- Create: `src/components/budgets/budget-category-config.test.mjs`

- [ ] Add tests for legacy normalization, v2 normalization, rename/update, reorder, add, and guarded delete.
- [ ] Run `node src/components/budgets/budget-category-config.test.mjs` and verify it fails because the helper file does not exist.
- [ ] Implement the helper file with no React dependencies.
- [ ] Run the Node helper test and verify it passes.

### Task 2: Supabase Profile Budget Persistence

**Files:**
- Modify: `src/lib/supabase.ts`

- [ ] Extend `ProfileBudgets.category_budgets` to accept the v2 JSON shape.
- [ ] Add `updateCategoryBudgetSettings(categoryBudgets)` that writes the full JSON config to `profiles.category_budgets`.
- [ ] Keep `updateCategoryBudget(categoryName, amount)` compatible by normalizing and updating one item.

### Task 3: Budget Rings UI

**Files:**
- Modify: `src/components/budgets/budget-rings.tsx`

- [ ] Replace fixed category rendering with normalized budget item config.
- [ ] Keep ring click focused on amount changes.
- [ ] Add a `Manage categories` button.
- [ ] Add a manager dialog with edit fields, icon/color selects, up/down reorder buttons, add category, and delete category.
- [ ] Persist changes through `updateCategoryBudgetSettings`.
- [ ] Keep spending totals read-only and matched by display name.

### Task 4: Verification

**Files:**
- Read: `package.json`

- [ ] Run `node src/components/budgets/budget-category-config.test.mjs`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Start the dev server and validate `/budgets` in the browser or Playwright with page identity, nonblank content, no framework overlay, console health, and one manager interaction.
