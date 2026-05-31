import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

async function main() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  console.log("Profiles:", JSON.stringify(data, null, 2))
  console.log("Error:", error)
}
main()
