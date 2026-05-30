import { createClient } from "@supabase/supabase-js"
import * as path from "path"
import * as fs from "fs"

const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8")
  content.split("\n").forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    process.env[key] = val
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55421"
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)
const DEMO_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

async function getLiveBalance(accountId: string) {
  const { data: account } = await supabase.from("accounts").select("opening_balance").eq("id", accountId).single()
  if (!account) throw new Error("Account not found")
  const { data: txs } = await supabase.from("transactions").select("amount, direction").eq("account_id", accountId)
  
  let sum = 0
  if (txs) {
    for (const tx of txs) {
      const amt = Number(tx.amount)
      sum += tx.direction === "in" ? amt : -amt
    }
  }
  return Number(account.opening_balance) + sum
}

async function fixBalance(accountId: string, target: number) {
  const current = await getLiveBalance(accountId)
  const diff = target - current
  if (diff === 0) return

  const { data: account } = await supabase.from("accounts").select("opening_balance").eq("id", accountId).single()
  if (!account) throw new Error("Account not found")
  const newOpening = Number(account.opening_balance) + diff

  await supabase.from("accounts").update({ opening_balance: newOpening }).eq("id", accountId)
}

async function run() {
  console.log("Fixing UCB balance...")
  await fixBalance("a0000001-0000-0000-0000-000000000002", 740.00)
  
  console.log("Fixing bKash balance...")
  await fixBalance("a0000001-0000-0000-0000-000000000003", 238.85)

  console.log("Done!")
}

run()
