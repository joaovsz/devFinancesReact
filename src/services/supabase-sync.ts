import { User } from "@supabase/supabase-js"
import { getSupabaseClient } from "../lib/supabase"
import { GoalStore } from "../store/useGoalStore"
import { TransactionStore } from "../store/useTransactionStore"

export const TRANSACTION_STORAGE_KEY = "devfinances-storage"
export const GOALS_STORAGE_KEY = "devfinances-goals-storage"
export const AUTH_USER_STORAGE_KEY = "devfinances-auth-user-id"
const TRANSACTION_STORAGE_VERSION = 28
const GOALS_STORAGE_VERSION = 1

const TABLE_NAME = "user_app_state"

type UserAppStateRow = {
  user_id: string
  transaction_storage: unknown
  goals_storage: unknown
  updated_at: string
}

type PersistedSnapshot<TState> = {
  state: TState
  version: number
}

export type AppStateSnapshots = {
  transactionStorage: PersistedSnapshot<unknown>
  goalsStorage: PersistedSnapshot<unknown>
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

function buildTransactionStateSnapshot(state: TransactionStore) {
  return {
    bankAccounts: state.bankAccounts,
    cards: state.cards,
    transactions: state.transactions,
    fixedCosts: state.fixedCosts,
    installmentPlans: state.installmentPlans,
    contractConfig: state.contractConfig,
    projectionSettings: state.projectionSettings,
    totalIncomes: state.totalIncomes,
    totalExpenses: state.totalExpenses,
    totalAmount: state.totalAmount
  }
}

function buildGoalStateSnapshot(state: GoalStore) {
  return {
    goals: state.goals
  }
}

export function buildAppStateSnapshots(input: {
  transactionState: TransactionStore
  goalState: GoalStore
}): AppStateSnapshots {
  return {
    transactionStorage: {
      state: buildTransactionStateSnapshot(input.transactionState),
      version: TRANSACTION_STORAGE_VERSION
    },
    goalsStorage: {
      state: buildGoalStateSnapshot(input.goalState),
      version: GOALS_STORAGE_VERSION
    }
  }
}

export function clearLocalAppData() {
  localStorage.removeItem(TRANSACTION_STORAGE_KEY)
  localStorage.removeItem(GOALS_STORAGE_KEY)
}

export function persistSnapshotsLocally(snapshots: AppStateSnapshots) {
  localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(snapshots.transactionStorage))
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(snapshots.goalsStorage))
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

export async function pushSnapshotsToSupabase(user: User, snapshots: AppStateSnapshots) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  const payload: UserAppStateRow = {
    user_id: user.id,
    transaction_storage: snapshots.transactionStorage,
    goals_storage: snapshots.goalsStorage,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase.from(TABLE_NAME).upsert(payload, {
    onConflict: "user_id"
  })

  if (error) {
    console.warn("Falha ao enviar snapshot para Supabase:", error.message)
  }
}

export async function pushLocalStateToSupabase(user: User) {
  const transactionStorage = parseStorageValue(localStorage.getItem(TRANSACTION_STORAGE_KEY))
  const goalsStorage = parseStorageValue(localStorage.getItem(GOALS_STORAGE_KEY))

  await pushSnapshotsToSupabase(user, {
    transactionStorage: transactionStorage || { state: {}, version: TRANSACTION_STORAGE_VERSION },
    goalsStorage: goalsStorage || { state: { goals: [] }, version: GOALS_STORAGE_VERSION }
  })
}
