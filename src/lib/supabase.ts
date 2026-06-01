import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  normalizeBudgetCategorySettings,
  toBudgetCategorySettings,
  updateBudgetCategoryItem,
  type BudgetCategorySettings,
} from "@/lib/budget-category-config"
import { CACHE_KEYS, invalidateOfflineCache } from "@/lib/offline-cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""

declare global {
  var __wealthOsSupabase: SupabaseClient | undefined
}

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "wealthos-demo-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase =
  typeof window === "undefined"
    ? createSupabaseClient()
    : globalThis.__wealthOsSupabase ?? (globalThis.__wealthOsSupabase = createSupabaseClient())

export const DEMO_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
export const DEMO_USER_EMAIL = "sabbir@wealthos.local"
export const DEMO_USER_PASSWORD = "password123"

function invalidateAccountCaches() {
  invalidateOfflineCache(DEMO_USER_ID, [
    CACHE_KEYS.accounts,
    CACHE_KEYS.monthlyOverview,
    CACHE_KEYS.financialHealth,
  ])
}

function invalidateTransactionCaches() {
  invalidateOfflineCache(DEMO_USER_ID, [
    CACHE_KEYS.transactions,
    CACHE_KEYS.accounts,
    CACHE_KEYS.monthlyOverview,
    CACHE_KEYS.moneyMovement("*"),
    CACHE_KEYS.financialHealth,
  ])
}

function invalidateBudgetCaches() {
  invalidateOfflineCache(DEMO_USER_ID, [
    CACHE_KEYS.profileBudgets,
    CACHE_KEYS.savingsGoals,
    CACHE_KEYS.financialHealth,
  ])
}

function invalidateContactCaches() {
  invalidateOfflineCache(DEMO_USER_ID, [
    CACHE_KEYS.contacts,
    CACHE_KEYS.debts,
    CACHE_KEYS.transfers,
    CACHE_KEYS.transactions,
  ])
}

function invalidateMoneyMovementCaches() {
  invalidateOfflineCache(DEMO_USER_ID, [
    CACHE_KEYS.debts,
    CACHE_KEYS.transfers,
    CACHE_KEYS.transactions,
    CACHE_KEYS.accounts,
    CACHE_KEYS.moneyMovement("*"),
    CACHE_KEYS.financialHealth,
  ])
}

/**
 * Singleton guard — prevents concurrent ensureAuthenticated() calls from
 * causing a thundering herd of signOut/signIn requests.
 */
let _authPromise: Promise<import("@supabase/supabase-js").Session | null> | null = null

/**
 * Ensures the client is authenticated with the local seed user.
 * Silently signs in using auth.signInWithPassword to avoid blocking RLS policies.
 * After migrating from local → cloud Supabase, stale browser sessions may use
 * tokens signed with the old JWT secret. We detect that and force re-auth.
 */
export async function ensureAuthenticated() {
  // If an auth attempt is already in flight, piggyback on it
  if (_authPromise) return _authPromise

  _authPromise = _doAuthenticate()
  try {
    return await _authPromise
  } finally {
    _authPromise = null
  }
}

async function _doAuthenticate() {
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // Validate the access token belongs to the current Supabase instance.
    // Stale sessions from a local Supabase will have a different issuer and
    // cause "No suitable key or wrong key type" errors with cloud PostgREST.
    try {
      const payload = JSON.parse(atob(session.access_token.split(".")[1]))
      const expectedIssuer = `${supabaseUrl}/auth/v1`
      if (payload.iss === expectedIssuer) {
        return session
      }
      // Issuer mismatch — stale session from a different Supabase instance
      console.warn("Stale session detected (issuer mismatch), re-authenticating…")
      await supabase.auth.signOut()
    } catch {
      // Malformed token — clear and re-auth
      console.warn("Malformed session token, re-authenticating…")
      await supabase.auth.signOut()
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
  })

  if (error) {
    console.error("Auto-authentication failed:", error.message)
    return null
  }

  return data.session
}

export type AccountWithBalance = {
  id: string
  name: string
  type: "cash" | "bank" | "mfs"
  provider: string | null
  account_number_last4: string | null
  opening_balance: number
  balance: number
  currency: string
  is_active: boolean
  sort_order: number
}

/**
 * Fetches all active accounts for the demo user and calculates their current balance
 * by dynamically applying transaction increments/decrements.
 */
export async function getAccounts(): Promise<AccountWithBalance[]> {
  await ensureAuthenticated()

  // Fetch accounts
  const { data: accountsData, error: accountsError } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  if (accountsError) {
    console.error("Error fetching accounts:", accountsError.message)
    return []
  }

  // Fetch transactions
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("account_id, amount, direction")
    .eq("user_id", DEMO_USER_ID)

  if (txError) {
    console.error("Error fetching transactions:", txError.message)
    return accountsData.map(a => ({
      ...a,
      balance: Number(a.opening_balance),
      opening_balance: Number(a.opening_balance)
    }))
  }

  // Compute live balances
  return accountsData.map((account) => {
    const opening = Number(account.opening_balance)
    const accountTx = txData.filter(t => t.account_id === account.id)
    const sum = accountTx.reduce((acc, tx) => {
      const amt = Number(tx.amount)
      return tx.direction === "in" ? acc + amt : acc - amt
    }, 0)

    return {
      ...account,
      opening_balance: opening,
      balance: Math.round((opening + sum) * 100) / 100,
    }
  })
}

/**
 * Adjusts an account's live balance to match a target value.
 * Since balance = opening_balance + sum(transactions), we adjust the opening_balance directly
 * and clean up any existing "Adjustment" transactions for this account to maintain a clean history,
 * OR we can insert an "adjustment" ledger entry. Adjusting opening_balance is the cleanest.
 */
export async function updateAccountBalance(accountId: string, targetBalance: number): Promise<boolean> {
  await ensureAuthenticated()

  // First fetch the current live balance to compute the difference
  const accounts = await getAccounts()
  const account = accounts.find(a => a.id === accountId)
  if (!account) return false

  const difference = targetBalance - account.balance
  if (difference === 0) return true

  // Adjust the opening balance directly so the ledger sums to targetBalance
  const newOpening = account.opening_balance + difference

  const { error } = await supabase
    .from("accounts")
    .update({ opening_balance: newOpening })
    .eq("id", accountId)
    .eq("user_id", DEMO_USER_ID)

  if (error) {
    console.error("Error adjusting balance:", error.message)
    return false
  }

  invalidateAccountCaches()
  return true
}

export async function updateAccountDetails(
  accountId: string,
  {
    name,
    provider,
    accountNumberLast4,
  }: {
    name: string
    provider: string | null
    accountNumberLast4: string | null
  }
): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase
    .from("accounts")
    .update({
      name,
      provider,
      account_number_last4: accountNumberLast4,
    })
    .eq("id", accountId)
    .eq("user_id", DEMO_USER_ID)

  if (error) {
    console.error("Error updating account details:", error.message)
    return false
  }

  invalidateAccountCaches()
  return true
}

/**
 * Inserts a new bank account or wallet into the database.
 */
export async function addAccount(
  name: string,
  type: "cash" | "bank" | "mfs",
  provider: string | null,
  initialBalance: number,
  accountNumberLast4?: string | null
): Promise<AccountWithBalance | null> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: DEMO_USER_ID,
      name,
      type,
      provider,
      opening_balance: initialBalance,
      account_number_last4: accountNumberLast4,
      currency: "BDT",
      is_active: true,
      sort_order: 10,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding account:", error.message)
    return null
  }

  invalidateAccountCaches()
  return {
    ...data,
    opening_balance: Number(data.opening_balance),
    balance: Number(data.opening_balance),
  }
}

export type ProfileBudgets = {
  monthly_budget: number
  category_budgets: Record<string, number> | BudgetCategorySettings
}

const DEFAULT_PROFILE_BUDGETS: ProfileBudgets = {
  monthly_budget: 30000,
  category_budgets: {},
}

function isMissingProfileBudgetColumns(error: { message?: string } | null) {
  const message = error?.message ?? ""
  return (
    message.includes("profiles.monthly_budget") ||
    message.includes("profiles.category_budgets") ||
    message.includes("monthly_budget") ||
    message.includes("category_budgets")
  )
}

/**
 * Fetches the global monthly spending limit and custom category budgets from the database profile.
 */
export async function getProfileBudgets(): Promise<ProfileBudgets> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("profiles")
    .select("monthly_budget, category_budgets")
    .eq("id", DEMO_USER_ID)
    .single()

  if (error) {
    if (isMissingProfileBudgetColumns(error)) {
      console.warn("Profile budget columns are unavailable; using default budgets.")
      return DEFAULT_PROFILE_BUDGETS
    }

    console.error("Error fetching profile budgets:", error.message)
    return DEFAULT_PROFILE_BUDGETS
  }

  return {
    monthly_budget:
      "monthly_budget" in data ? Number(data.monthly_budget) || 30000 : 30000,
    category_budgets:
      "category_budgets" in data
        ? (data.category_budgets as ProfileBudgets["category_budgets"]) || {}
        : {},
  }
}

/**
 * Updates the user's global monthly spending limit (budget) in their profile.
 */
export async function updateMonthlyBudget(
  amount: number
): Promise<ProfileBudgets | null> {
  await ensureAuthenticated()

  if (!Number.isFinite(amount) || amount <= 0) {
    console.error("Error updating monthly budget: amount must be greater than 0")
    return null
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ monthly_budget: amount })
    .eq("id", DEMO_USER_ID)
    .select("monthly_budget, category_budgets")
    .single()

  if (error) {
    console.error("Error updating monthly budget:", error.message)
    return null
  }

  invalidateBudgetCaches()
  return {
    monthly_budget: Number(data.monthly_budget) || amount,
    category_budgets:
      (data.category_budgets as ProfileBudgets["category_budgets"]) || {},
  }
}

/**
 * Updates a specific category budget in the profile category_budgets JSON block.
 */
export async function updateCategoryBudget(categoryName: string, amount: number): Promise<boolean> {
  const currentBudgets = await getProfileBudgets()
  const categoryItems = normalizeBudgetCategorySettings(currentBudgets.category_budgets)
  const category = categoryItems.find((item) => item.name === categoryName)
  const updatedItems = category
    ? updateBudgetCategoryItem(categoryItems, category.id, { budget: amount })
    : categoryItems

  return updateCategoryBudgetSettings(toBudgetCategorySettings(updatedItems))
}

/**
 * Replaces the full budget-page category configuration without changing real transaction categories.
 */
export async function updateCategoryBudgetSettings(
  categoryBudgets: BudgetCategorySettings
): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase
    .from("profiles")
    .update({ category_budgets: categoryBudgets })
    .eq("id", DEMO_USER_ID)

  if (error) {
    console.error("Error updating category budgets:", error.message)
    return false
  }

  invalidateBudgetCaches()
  return true
}

export type DbTransaction = {
  id: string
  amount: number
  type: string
  direction: "in" | "out"
  description: string | null
  occurred_at: string
  category: string
  category_id?: string
  account_id: string
  account_name: string
  metadata: Record<string, unknown>
}

type TransactionQueryRow = {
  id: string
  amount: number | string
  type: string
  direction: "in" | "out"
  description: string | null
  occurred_at: string
  metadata: Record<string, unknown> | null
  account_id: string
  accounts: { name: string } | { name: string }[] | null
  categories: { id: string; name: string } | { id: string; name: string }[] | null
}

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation
}

/**
 * Fetches transactions and maps their category names dynamically for display.
 */
export async function getTransactions(): Promise<DbTransaction[]> {
  await ensureAuthenticated()

  // Fetch transactions and join category name
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      amount,
      type,
      direction,
      description,
      occurred_at,
      metadata,
      account_id,
      accounts!transactions_account_id_fkey (
        name
      ),
      categories (
        id,
        name
      )
    `)
    .eq("user_id", DEMO_USER_ID)
    .order("occurred_at", { ascending: false })

  if (error) {
    console.error("Error fetching transactions:", error.message)
    return []
  }

  return (data as TransactionQueryRow[]).map((t) => {
    const account = firstRelation(t.accounts)
    const category = firstRelation(t.categories)

    return {
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      direction: t.direction,
      description: t.description,
      occurred_at: t.occurred_at,
      category: category?.name || "Uncategorized",
      category_id: category?.id,
      account_id: t.account_id,
      account_name: account?.name || "Unknown Account",
      metadata: t.metadata || {},
    }
  })
}

export type DbCategory = {
  id: string
  name: string
  kind: "expense" | "income"
  icon: string | null
  color: string | null
}

export async function getCategories(): Promise<DbCategory[]> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${DEMO_USER_ID},user_id.is.null`)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error.message)
    return []
  }
  return data
}

export async function addTransaction(data: {
  amount: number
  type: string
  direction: "in" | "out"
  description: string
  account_id: string
  category_id?: string
  metadata?: Record<string, unknown>
  occurred_at?: string
}) {
  await ensureAuthenticated()

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: DEMO_USER_ID,
      amount: data.amount,
      type: data.type,
      direction: data.direction,
      description: data.description,
      account_id: data.account_id,
      category_id: data.category_id || null,
      metadata: data.metadata || {},
      occurred_at: data.occurred_at || new Date().toISOString()
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error adding transaction:", error.message)
    return false
  }
  invalidateTransactionCaches()
  return inserted.id
}

export async function deleteTransactions(transactionIds: string[]): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", transactionIds)
    .eq("user_id", DEMO_USER_ID) // Ensure only own transactions are deleted

  if (error) {
    console.error("Error deleting transactions:", error.message)
    return false
  }
  invalidateTransactionCaches()
  return true
}

export type DbSavingsGoal = {
  id: string
  name: string
  target_type: "emergency" | "savings" | "dream" | "vacation" | "business" | "custom"
  target_amount: number
  current_amount: number
  target_date: string | null
  monthly_contribution: number
  icon: string
  is_active: boolean
}

export type DbSavingsGoalContribution = {
  id: string
  target_id: string
  amount: number
  contributed_at: string
  notes: string | null
  created_at: string
}

export type SavingsGoalInput = {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  monthlyContribution: number
  icon: string
  targetType?: DbSavingsGoal["target_type"]
}

type SavingsGoalRow = {
  id: string
  name: string
  target_type: DbSavingsGoal["target_type"]
  target_amount: number | string
  current_amount: number | string
  target_date: string | null
  monthly_contribution: number | string
  icon: string | null
  is_active: boolean
}

type SavingsGoalContributionRow = {
  id: string
  target_id: string
  amount: number | string
  contributed_at: string
  notes: string | null
  created_at: string
}

/**
 * Fetches savings goals from public.fund_targets.
 */
export async function getSavingsGoals(): Promise<DbSavingsGoal[]> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("fund_targets")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching savings goals:", error.message)
    return []
  }

  return data.map((g) => ({
    id: g.id,
    name: g.name,
    target_type: g.target_type,
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
    target_date: g.target_date,
    monthly_contribution: Number(g.monthly_contribution),
    icon: g.icon || "shield",
    is_active: g.is_active,
  }))
}

function mapSavingsGoal(g: SavingsGoalRow): DbSavingsGoal {
  return {
    id: g.id,
    name: g.name,
    target_type: g.target_type,
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
    target_date: g.target_date,
    monthly_contribution: Number(g.monthly_contribution),
    icon: g.icon || "piggy-bank",
    is_active: g.is_active,
  }
}

function mapContribution(row: SavingsGoalContributionRow): DbSavingsGoalContribution {
  return {
    id: row.id,
    target_id: row.target_id,
    amount: Number(row.amount),
    contributed_at: row.contributed_at,
    notes: row.notes,
    created_at: row.created_at,
  }
}

export async function createSavingsGoal(input: SavingsGoalInput): Promise<DbSavingsGoal | null> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("fund_targets")
    .insert({
      user_id: DEMO_USER_ID,
      name: input.name,
      target_type: input.targetType || "custom",
      target_amount: input.targetAmount,
      current_amount: input.currentAmount,
      target_date: input.targetDate,
      monthly_contribution: input.monthlyContribution,
      icon: input.icon,
      is_active: true,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Error creating savings goal:", error.message)
    return null
  }

  invalidateBudgetCaches()
  return mapSavingsGoal(data)
}

export async function updateSavingsGoal(
  goalId: string,
  input: SavingsGoalInput
): Promise<DbSavingsGoal | null> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("fund_targets")
    .update({
      name: input.name,
      target_type: input.targetType || "custom",
      target_amount: input.targetAmount,
      current_amount: input.currentAmount,
      target_date: input.targetDate,
      monthly_contribution: input.monthlyContribution,
      icon: input.icon,
    })
    .eq("id", goalId)
    .eq("user_id", DEMO_USER_ID)
    .select("*")
    .single()

  if (error) {
    console.error("Error updating savings goal:", error.message)
    return null
  }

  invalidateBudgetCaches()
  return mapSavingsGoal(data)
}

export async function deleteSavingsGoal(goalId: string): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase
    .from("fund_targets")
    .update({ is_active: false })
    .eq("id", goalId)
    .eq("user_id", DEMO_USER_ID)

  if (error) {
    console.error("Error deleting savings goal:", error.message)
    return false
  }

  invalidateBudgetCaches()
  return true
}

export async function getSavingsGoalContributions(
  goalId: string
): Promise<DbSavingsGoalContribution[]> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("fund_target_contributions")
    .select("id, target_id, amount, contributed_at, notes, created_at")
    .eq("user_id", DEMO_USER_ID)
    .eq("target_id", goalId)
    .order("contributed_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching savings goal contributions:", error.message)
    return []
  }

  return data.map(mapContribution)
}

export async function addSavingsGoalContribution({
  goalId,
  amount,
  contributedAt,
  notes,
  transactionId,
}: {
  goalId: string
  amount: number
  contributedAt: string
  notes?: string | null
  transactionId?: string
}): Promise<DbSavingsGoalContribution | null> {
  await ensureAuthenticated()

  const { data, error } = await supabase.rpc("fn_add_fund_target_contribution", {
    p_target_id: goalId,
    p_amount: amount,
    p_contributed_at: contributedAt,
    p_notes: notes || null,
    p_transaction_id: transactionId || null,
  })

  if (error) {
    console.error("Error adding savings goal contribution:", error.message)
    return null
  }

  invalidateBudgetCaches()
  return mapContribution(data)
}

export async function updateSavingsGoalContribution({
  contributionId,
  amount,
  contributedAt,
  notes,
}: {
  contributionId: string
  amount: number
  contributedAt: string
  notes?: string | null
}): Promise<DbSavingsGoalContribution | null> {
  await ensureAuthenticated()

  const { data, error } = await supabase.rpc("fn_update_fund_target_contribution", {
    p_contribution_id: contributionId,
    p_amount: amount,
    p_contributed_at: contributedAt,
    p_notes: notes || null,
  })

  if (error) {
    console.error("Error updating savings goal contribution:", error.message)
    return null
  }

  invalidateBudgetCaches()
  return mapContribution(data)
}

export async function deleteSavingsGoalContribution(contributionId: string): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase.rpc("fn_delete_fund_target_contribution", {
    p_contribution_id: contributionId,
  })

  if (error) {
    console.error("Error deleting savings goal contribution:", error.message)
    return false
  }

  invalidateBudgetCaches()
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// Contacts
// ═══════════════════════════════════════════════════════════════════════════

export type DbContact = {
  id: string
  name: string
  nickname: string | null
  phone: string | null
  avatar_url: string | null
  notes: string | null
}

export async function getContacts(): Promise<DbContact[]> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, nickname, phone, avatar_url, notes")
    .eq("user_id", DEMO_USER_ID)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching contacts:", error.message)
    return []
  }
  return data as DbContact[]
}

export type ContactInput = {
  name: string
  nickname?: string | null
  phone?: string | null
  avatar_url?: string | null
  notes?: string | null
}

export async function addContact(input: ContactInput): Promise<DbContact | null> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: DEMO_USER_ID,
      name: input.name,
      nickname: input.nickname || null,
      phone: input.phone || null,
      avatar_url: input.avatar_url || null,
      notes: input.notes || null,
    })
    .select("id, name, nickname, phone, avatar_url, notes")
    .single()

  if (error) {
    console.error("Error adding contact:", error.message)
    return null
  }
  invalidateContactCaches()
  return data as DbContact
}

export async function updateContact(id: string, input: ContactInput): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase
    .from("contacts")
    .update({
      name: input.name,
      nickname: input.nickname || null,
      phone: input.phone || null,
      avatar_url: input.avatar_url || null,
      notes: input.notes || null,
    })
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)

  if (error) {
    console.error("Error updating contact:", error.message)
    return false
  }
  invalidateContactCaches()
  return true
}

export async function deleteContact(id: string): Promise<boolean> {
  await ensureAuthenticated()

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)

  if (error) {
    console.error("Error deleting contact:", error.message)
    return false
  }
  invalidateContactCaches()
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// Debts (lend / borrow ledger with contacts)
// ═══════════════════════════════════════════════════════════════════════════

export type DbDebt = {
  id: string
  direction: "owed_to_me" | "i_owe"
  counterparty_name: string
  counterparty_contact_id: string | null
  amount_original: number
  amount_remaining: number
  status: "open" | "partial" | "settled"
  occurred_at: string
  due_at: string | null
  notes: string | null
}

export async function getDebts(): Promise<DbDebt[]> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("debts")
    .select(
      "id, direction, counterparty_name, counterparty_contact_id, amount_original, amount_remaining, status, occurred_at, due_at, notes"
    )
    .eq("user_id", DEMO_USER_ID)
    .order("occurred_at", { ascending: false })

  if (error) {
    console.error("Error fetching debts:", error.message)
    return []
  }

  return (data as DbDebt[]).map((d) => ({
    ...d,
    amount_original: Number(d.amount_original),
    amount_remaining: Number(d.amount_remaining),
  }))
}

/**
 * Net debt balance per contact, computed from open/partial debts.
 * Positive `net` => the contact owes the user; negative => the user owes them.
 */
export function debtBalanceForContact(debts: DbDebt[], contactId: string): number {
  return debts
    .filter((d) => d.counterparty_contact_id === contactId && d.status !== "settled")
    .reduce((sum, d) => sum + (d.direction === "owed_to_me" ? d.amount_remaining : -d.amount_remaining), 0)
}

// ═══════════════════════════════════════════════════════════════════════════
// Money movement to / from contacts (Quick Ledger + Transfers)
// ═══════════════════════════════════════════════════════════════════════════

export type MoneyIntent = "plain" | "lend" | "borrow"

/**
 * Records person-to-person money movement.
 * - plain : a transfer with no debt (direction provided by caller)
 * - lend  : money out + a new `owed_to_me` debt (they owe you)
 * - borrow: money in + a new `i_owe` debt (you owe them)
 */
export async function recordMoneyMovement(input: {
  contactId: string
  contactName: string
  accountId: string
  amount: number
  intent: MoneyIntent
  direction?: "in" | "out"
  note?: string
}): Promise<boolean> {
  await ensureAuthenticated()

  const direction: "in" | "out" =
    input.intent === "lend" ? "out" : input.intent === "borrow" ? "in" : input.direction || "out"

  let debtId: string | null = null

  if (input.intent === "lend" || input.intent === "borrow") {
    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .insert({
        user_id: DEMO_USER_ID,
        direction: input.intent === "lend" ? "owed_to_me" : "i_owe",
        counterparty_name: input.contactName,
        counterparty_contact_id: input.contactId,
        amount_original: input.amount,
        amount_remaining: input.amount,
        status: "open",
        notes: input.note || null,
      })
      .select("id")
      .single()

    if (debtError) {
      console.error("Error creating debt:", debtError.message)
      return false
    }
    debtId = debt.id
  }

  const verb =
    input.intent === "lend"
      ? "Lent to"
      : input.intent === "borrow"
        ? "Borrowed from"
        : direction === "out"
          ? "Sent to"
          : "Received from"

  const { error: txError } = await supabase.from("transactions").insert({
    user_id: DEMO_USER_ID,
    type: "transfer",
    direction,
    amount: input.amount,
    account_id: input.accountId,
    contact_id: input.contactId,
    description: input.note ? `${verb} ${input.contactName} — ${input.note}` : `${verb} ${input.contactName}`,
    reference_type: debtId ? "debt" : "contact",
    reference_id: debtId ?? input.contactId,
    metadata: { contact: input.contactName, intent: input.intent, icon: "users" },
    occurred_at: new Date().toISOString(),
  })

  if (txError) {
    console.error("Error recording money movement:", txError.message)
    return false
  }
  invalidateMoneyMovementCaches()
  return true
}

/**
 * Settles (repays) an existing debt. Direction is derived from the debt:
 * - i_owe      => you pay them back  (money out)
 * - owed_to_me => they pay you back  (money in)
 * Inserts a debt_settlement; a DB trigger updates amount_remaining/status.
 */
export async function repayDebt(input: {
  debtId: string
  accountId: string
  amount: number
  note?: string
}): Promise<boolean> {
  await ensureAuthenticated()

  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("direction, counterparty_name, counterparty_contact_id")
    .eq("id", input.debtId)
    .eq("user_id", DEMO_USER_ID)
    .single()

  if (debtError || !debt) {
    console.error("Error loading debt to repay:", debtError?.message)
    return false
  }

  const direction: "in" | "out" = debt.direction === "i_owe" ? "out" : "in"
  const verb = debt.direction === "i_owe" ? "Repaid" : "Repayment from"

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: DEMO_USER_ID,
      type: "debt_settlement",
      direction,
      amount: input.amount,
      account_id: input.accountId,
      contact_id: debt.counterparty_contact_id,
      description: input.note
        ? `${verb} ${debt.counterparty_name} — ${input.note}`
        : `${verb} ${debt.counterparty_name}`,
      reference_type: "debt",
      reference_id: input.debtId,
      metadata: { contact: debt.counterparty_name, intent: "repay", icon: "users" },
      occurred_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (txError) {
    console.error("Error recording repayment:", txError.message)
    return false
  }

  const { error: settleError } = await supabase.from("debt_settlements").insert({
    debt_id: input.debtId,
    user_id: DEMO_USER_ID,
    amount: input.amount,
    transaction_id: tx.id,
    notes: input.note || null,
  })

  if (settleError) {
    console.error("Error inserting debt settlement:", settleError.message)
    return false
  }
  invalidateMoneyMovementCaches()
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// Transfers list (person-to-person ledger view)
// ═══════════════════════════════════════════════════════════════════════════

export type TransferIntent = "send" | "receive" | "lend" | "borrow" | "repay"

export type DbTransfer = {
  id: string
  intent: TransferIntent
  direction: "in" | "out"
  contactName: string
  contactAvatar: string | null
  amount: number
  date: string
  occurred_at: string
  note: string | null
}

type TransferQueryRow = {
  id: string
  amount: number | string
  type: string
  direction: "in" | "out"
  description: string | null
  occurred_at: string
  reference_type: string | null
  metadata: Record<string, unknown> | null
  contacts: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[] | null
}

function deriveTransferIntent(row: TransferQueryRow): TransferIntent {
  if (row.type === "debt_settlement") return "repay"
  if (row.reference_type === "debt") return row.direction === "out" ? "lend" : "borrow"
  return row.direction === "out" ? "send" : "receive"
}

/**
 * Fetches person-to-person money movements (transfers + debt settlements
 * linked to a contact) for the Transfers page.
 */
export async function getTransfers(): Promise<DbTransfer[]> {
  await ensureAuthenticated()

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, amount, type, direction, description, occurred_at, reference_type, metadata,
       contacts ( name, avatar_url )`
    )
    .eq("user_id", DEMO_USER_ID)
    .in("type", ["transfer", "debt_settlement"])
    .not("contact_id", "is", null)
    .order("occurred_at", { ascending: false })

  if (error) {
    console.error("Error fetching transfers:", error.message)
    return []
  }

  return (data as TransferQueryRow[]).map((row) => {
    const contact = firstRelation(row.contacts)
    const note = typeof row.description === "string" && row.description.includes(" — ")
      ? row.description.split(" — ").slice(1).join(" — ")
      : null
    return {
      id: row.id,
      intent: deriveTransferIntent(row),
      direction: row.direction,
      contactName: contact?.name || (row.metadata?.contact as string) || "Unknown",
      contactAvatar: contact?.avatar_url ?? null,
      amount: Number(row.amount),
      date: new Date(row.occurred_at).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      occurred_at: row.occurred_at,
      note,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard aggregations (derived from the transactions ledger)
// ═══════════════════════════════════════════════════════════════════════════

type RawLedgerRow = {
  amount: number | string
  type: string
  direction: "in" | "out"
  occurred_at: string
}

async function getLedgerRows(): Promise<RawLedgerRow[]> {
  await ensureAuthenticated()
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, direction, occurred_at")
    .eq("user_id", DEMO_USER_ID)

  if (error) {
    console.error("Error fetching ledger:", error.message)
    return []
  }
  return data as RawLedgerRow[]
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export type MonthlyOverviewPoint = { month: string; income: number; expenses: number }

/**
 * Monthly income vs expenses for the latest year present in the ledger.
 */
export async function getMonthlyOverview(): Promise<MonthlyOverviewPoint[]> {
  const rows = await getLedgerRows()
  if (rows.length === 0) return MONTH_LABELS.map((m) => ({ month: m, income: 0, expenses: 0 }))

  const year = Math.max(...rows.map((r) => new Date(r.occurred_at).getFullYear()))
  const income = new Array(12).fill(0)
  const expenses = new Array(12).fill(0)

  for (const r of rows) {
    const d = new Date(r.occurred_at)
    if (d.getFullYear() !== year) continue
    const m = d.getMonth()
    const amt = Number(r.amount)
    if (r.type === "income") income[m] += amt
    else if (r.type === "expense" || r.type === "bill_payment") expenses[m] += amt
  }

  return MONTH_LABELS.map((month, i) => ({
    month,
    income: Math.round(income[i]),
    expenses: Math.round(expenses[i]),
  }))
}

export type MoneyMovementPoint = { label: string; moneyIn: number; moneyOut: number }
export type MovementPeriod = "7d" | "30d" | "90d"

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/**
 * Money in vs out, bucketed by day (7d) / week (30d) / month (90d).
 * Windows are anchored on the most recent ledger date so demo data shows up.
 */
export async function getMoneyMovement(period: MovementPeriod): Promise<MoneyMovementPoint[]> {
  const rows = await getLedgerRows()
  if (rows.length === 0) return []

  const latest = new Date(Math.max(...rows.map((r) => new Date(r.occurred_at).getTime())))
  const anchor = startOfDay(latest)

  const flow = (r: RawLedgerRow) => Number(r.amount)
  const buckets: MoneyMovementPoint[] = []

  if (period === "7d") {
    for (let i = 6; i >= 0; i--) {
      const day = new Date(anchor)
      day.setDate(anchor.getDate() - i)
      const next = new Date(day)
      next.setDate(day.getDate() + 1)
      const inDay = rows.filter((r) => {
        const t = new Date(r.occurred_at).getTime()
        return t >= day.getTime() && t < next.getTime()
      })
      buckets.push({
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        moneyIn: Math.round(inDay.filter((r) => r.direction === "in").reduce((s, r) => s + flow(r), 0)),
        moneyOut: Math.round(inDay.filter((r) => r.direction === "out").reduce((s, r) => s + flow(r), 0)),
      })
    }
  } else if (period === "30d") {
    for (let w = 3; w >= 0; w--) {
      const end = new Date(anchor)
      end.setDate(anchor.getDate() - w * 7)
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      const inWeek = rows.filter((r) => {
        const t = new Date(r.occurred_at).getTime()
        return t >= startOfDay(start).getTime() && t <= end.getTime() + 86_399_999
      })
      buckets.push({
        label: `Week ${4 - w}`,
        moneyIn: Math.round(inWeek.filter((r) => r.direction === "in").reduce((s, r) => s + flow(r), 0)),
        moneyOut: Math.round(inWeek.filter((r) => r.direction === "out").reduce((s, r) => s + flow(r), 0)),
      })
    }
  } else {
    // 90d → last 3 calendar months ending at the anchor month
    for (let m = 2; m >= 0; m--) {
      const ref = new Date(anchor.getFullYear(), anchor.getMonth() - m, 1)
      const inMonth = rows.filter((r) => {
        const d = new Date(r.occurred_at)
        return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
      })
      buckets.push({
        label: MONTH_LABELS[ref.getMonth()],
        moneyIn: Math.round(inMonth.filter((r) => r.direction === "in").reduce((s, r) => s + flow(r), 0)),
        moneyOut: Math.round(inMonth.filter((r) => r.direction === "out").reduce((s, r) => s + flow(r), 0)),
      })
    }
  }

  return buckets
}

// ── Financial health (computed) ──────────────────────────────────────────────

export type ComputedHealthFactor = {
  id: string
  label: string
  score: number
  maxScore: number
  status: "excellent" | "good" | "fair" | "poor"
  description: string
}

export type FinancialHealth = {
  overall: number
  trend: "up" | "down"
  trendDelta: number
  factors: ComputedHealthFactor[]
}

function statusFor(score: number): ComputedHealthFactor["status"] {
  if (score >= 80) return "excellent"
  if (score >= 60) return "good"
  if (score >= 40) return "fair"
  return "poor"
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

/**
 * Computes a financial-health score and six factors from real DB data.
 */
export async function getFinancialHealth(): Promise<FinancialHealth> {
  await ensureAuthenticated()

  const [rows, debts, accounts, budgets] = await Promise.all([
    getLedgerRows(),
    getDebts(),
    getAccounts(),
    getProfileBudgets(),
  ])

  const [snapshots, billPeriods, fundTargets] = await Promise.all([
    supabase
      .from("monthly_snapshots")
      .select("total_income, total_expenses, period_year, period_month")
      .eq("user_id", DEMO_USER_ID)
      .order("period_year", { ascending: true })
      .order("period_month", { ascending: true }),
    supabase.from("bill_periods").select("status").eq("user_id", DEMO_USER_ID),
    supabase
      .from("fund_targets")
      .select("target_type, target_amount, current_amount")
      .eq("user_id", DEMO_USER_ID)
      .eq("is_active", true),
  ])

  const totalIncome = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = rows
    .filter((r) => r.type === "expense" || r.type === "bill_payment")
    .reduce((s, r) => s + Number(r.amount), 0)

  // 1. Savings rate
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0
  const savingsScore = clamp(Math.round((savingsRate / 0.2) * 80))
  const savingsPct = Math.round(savingsRate * 100)

  // 2. Spending habits — spend vs monthly budget
  const monthlyBudget = budgets.monthly_budget || 30000
  const snapRows = (snapshots.data ?? []) as { total_expenses: number }[]
  const avgMonthlyExpense =
    snapRows.length > 0
      ? snapRows.reduce((s, r) => s + Number(r.total_expenses), 0) / snapRows.length
      : totalExpenses / 3
  const spendingScore = clamp(Math.round((monthlyBudget / Math.max(avgMonthlyExpense, 1)) * 70))

  // 3. Debt load — remaining "i owe" vs liquid balance
  const liquid = accounts.reduce((s, a) => s + (a.currency === "BDT" ? a.balance : 0), 0)
  const iOwe = debts
    .filter((d) => d.direction === "i_owe" && d.status !== "settled")
    .reduce((s, d) => s + d.amount_remaining, 0)
  const debtRatio = liquid > 0 ? iOwe / liquid : iOwe > 0 ? 1 : 0
  const debtScore = clamp(Math.round((1 - Math.min(debtRatio, 1)) * 100))
  const debtPct = Math.round(Math.min(debtRatio, 1) * 100)

  // 4. Emergency fund — months of expenses covered by the emergency target
  const targets = (fundTargets.data ?? []) as { target_type: string; current_amount: number }[]
  const emergencyCurrent = targets
    .filter((t) => t.target_type === "emergency")
    .reduce((s, t) => s + Number(t.current_amount), 0)
  const monthsCovered = avgMonthlyExpense > 0 ? emergencyCurrent / avgMonthlyExpense : 0
  const emergencyScore = clamp(Math.round((monthsCovered / 6) * 100))

  // 5. Goals progress — overall fund-target completion
  const allTargets = (fundTargets.data ?? []) as { target_amount: number; current_amount: number }[]
  const targetTotal = allTargets.reduce((s, t) => s + Number(t.target_amount), 0)
  const targetCurrent = allTargets.reduce((s, t) => s + Number(t.current_amount), 0)
  const goalsScore = clamp(Math.round(targetTotal > 0 ? (targetCurrent / targetTotal) * 100 : 0))
  const goalsPct = Math.round(targetTotal > 0 ? (targetCurrent / targetTotal) * 100 : 0)

  // 6. Bill payments — share of bill periods paid
  const bills = (billPeriods.data ?? []) as { status: string }[]
  const paid = bills.filter((b) => b.status === "paid").length
  const billScore = clamp(Math.round(bills.length > 0 ? (paid / bills.length) * 100 : 100))

  const factors: ComputedHealthFactor[] = [
    {
      id: "hf1",
      label: "Savings Rate",
      score: savingsScore,
      maxScore: 100,
      status: statusFor(savingsScore),
      description: `You save ${savingsPct}% of your income${savingsPct >= 20 ? " — above the 20% target" : " — aim for 20%"}.`,
    },
    {
      id: "hf2",
      label: "Spending Habits",
      score: spendingScore,
      maxScore: 100,
      status: statusFor(spendingScore),
      description: `Avg monthly spend ৳${Math.round(avgMonthlyExpense).toLocaleString()} vs budget ৳${monthlyBudget.toLocaleString()}.`,
    },
    {
      id: "hf3",
      label: "Debt Ratio",
      score: debtScore,
      maxScore: 100,
      status: statusFor(debtScore),
      description: iOwe > 0
        ? `You owe ৳${Math.round(iOwe).toLocaleString()} (${debtPct}% of liquid balance).`
        : "You have no outstanding debts — excellent.",
    },
    {
      id: "hf4",
      label: "Goals Progress",
      score: goalsScore,
      maxScore: 100,
      status: statusFor(goalsScore),
      description: `Your wealth goals are ${goalsPct}% funded.`,
    },
    {
      id: "hf5",
      label: "Emergency Fund",
      score: emergencyScore,
      maxScore: 100,
      status: statusFor(emergencyScore),
      description: `${monthsCovered.toFixed(1)} months of expenses covered — aim for 6 months.`,
    },
    {
      id: "hf6",
      label: "Bill Payments",
      score: billScore,
      maxScore: 100,
      status: statusFor(billScore),
      description: `${paid} of ${bills.length} bill periods paid on time.`,
    },
  ]

  const overall = Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length)

  // Trend: compare latest two monthly snapshots' free cash (income - expenses)
  const snaps = (snapshots.data ?? []) as { total_income: number; total_expenses: number }[]
  let trend: "up" | "down" = "up"
  let trendDelta = 0
  if (snaps.length >= 2) {
    const last = snaps[snaps.length - 1]
    const prev = snaps[snaps.length - 2]
    const lastFree = Number(last.total_income) - Number(last.total_expenses)
    const prevFree = Number(prev.total_income) - Number(prev.total_expenses)
    trend = lastFree >= prevFree ? "up" : "down"
    trendDelta = prevFree > 0 ? Math.abs(Math.round(((lastFree - prevFree) / prevFree) * 100)) : 0
  }

  return { overall, trend, trendDelta, factors }
}
