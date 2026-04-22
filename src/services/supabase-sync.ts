import { User } from "@supabase/supabase-js"
import { getSupabaseClient } from "../lib/supabase"

export const TRANSACTION_STORAGE_KEY = "devfinances-storage"
export const GOALS_STORAGE_KEY = "devfinances-goals-storage"
export const AUTH_USER_STORAGE_KEY = "devfinances-auth-user-id"

const TABLE_NAME = "user_app_state"

type UserAppStateRow = {
  user_id: string
  transaction_storage: unknown
  goals_storage: unknown
  updated_at: string
}

function parseStorageValue(raw: string | null) {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function hasLocalData() {
  return Boolean(localStorage.getItem(TRANSACTION_STORAGE_KEY))
}

export function clearLocalAppData() {
  localStorage.removeItem(TRANSACTION_STORAGE_KEY)
  localStorage.removeItem(GOALS_STORAGE_KEY)
}

export async function syncFromSupabaseOnLogin(user: User) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  const previousUserId = localStorage.getItem(AUTH_USER_STORAGE_KEY)
  const isSwitchingUser = Boolean(previousUserId && previousUserId !== user.id)
  if (isSwitchingUser) {
    clearLocalAppData()
  }
  localStorage.setItem(AUTH_USER_STORAGE_KEY, user.id)

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("transaction_storage, goals_storage")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.warn("Falha ao buscar snapshot no Supabase:", error.message)
    return
  }

  if (!data) {
    if (hasLocalData()) {
      await pushLocalStateToSupabase(user)
    }
    return
  }

  if (!hasLocalData()) {
    if (data.transaction_storage) {
      localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(data.transaction_storage))
    }
    if (data.goals_storage) {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(data.goals_storage))
    }
    window.location.reload()
    return
  }

  await pushLocalStateToSupabase(user)
}

export async function pushLocalStateToSupabase(user: User) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  const transactionStorage = parseStorageValue(localStorage.getItem(TRANSACTION_STORAGE_KEY))
  const goalsStorage = parseStorageValue(localStorage.getItem(GOALS_STORAGE_KEY))

  const payload: UserAppStateRow = {
    user_id: user.id,
    transaction_storage: transactionStorage,
    goals_storage: goalsStorage,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase.from(TABLE_NAME).upsert(payload, {
    onConflict: "user_id"
  })

  if (error) {
    console.warn("Falha ao enviar snapshot para Supabase:", error.message)
  }
}
