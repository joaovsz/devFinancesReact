import { createClient, SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

function getEnvValue(key: string) {
  const value = import.meta.env[key]
  return typeof value === "string" ? value : ""
}

export const isSupabaseConfigured = Boolean(
  getEnvValue("VITE_SUPABASE_URL") && getEnvValue("VITE_SUPABASE_PUBLISHABLE_KEY")
)

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null
  }

  if (client) {
    return client
  }

  client = createClient(
    getEnvValue("VITE_SUPABASE_URL"),
    getEnvValue("VITE_SUPABASE_PUBLISHABLE_KEY")
  )

  return client
}

