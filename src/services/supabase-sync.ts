import { User } from "@supabase/supabase-js"
import { getSupabaseClient } from "../lib/supabase"
import { GoalStore } from "../store/useGoalStore"
import { TransactionStore } from "../store/useTransactionStore"

export const TRANSACTION_STORAGE_KEY = "devfinances-storage"
export const GOALS_STORAGE_KEY = "devfinances-goals-storage"
export const AUTH_USER_STORAGE_KEY = "devfinances-auth-user-id"
const AUTH_BOOTSTRAP_RELOADED_PREFIX = "devfinances-auth-bootstrap-reloaded"
const AUTH_LAST_SYNCED_AT_PREFIX = "devfinances-auth-last-synced-at"
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

function getArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function hasMeaningfulSnapshots(input: {
  transactionStorage: unknown
  goalsStorage: unknown
}) {
  const transactionStorage = input.transactionStorage as { state?: Record<string, unknown> } | null
  const goalsStorage = input.goalsStorage as { state?: Record<string, unknown> } | null

  const transactionState = transactionStorage?.state || {}
  const goalsState = goalsStorage?.state || {}

  const transactionItemsCount =
    getArrayLength(transactionState.transactions) +
    getArrayLength(transactionState.fixedCosts) +
    getArrayLength(transactionState.installmentPlans) +
    getArrayLength(transactionState.cards) +
    getArrayLength(transactionState.bankAccounts)

  const goalItemsCount = getArrayLength(goalsState.goals)

  return transactionItemsCount > 0 || goalItemsCount > 0
}

function hasMeaningfulLocalData() {
  const transactionStorage = parseStorageValue(localStorage.getItem(TRANSACTION_STORAGE_KEY)) as
    | { state?: Record<string, unknown> }
    | null
  const goalsStorage = parseStorageValue(localStorage.getItem(GOALS_STORAGE_KEY)) as
    | { state?: Record<string, unknown> }
    | null

  return hasMeaningfulSnapshots({
    transactionStorage,
    goalsStorage
  })
}

function getBootstrapReloadKey(userId: string) {
  return `${AUTH_BOOTSTRAP_RELOADED_PREFIX}:${userId}`
}

function getLastSyncedAtKey(userId: string) {
  return `${AUTH_LAST_SYNCED_AT_PREFIX}:${userId}`
}

function getLastSyncedAt(userId: string) {
  return localStorage.getItem(getLastSyncedAtKey(userId))
}

function setLastSyncedAt(userId: string, updatedAt: string) {
  localStorage.setItem(getLastSyncedAtKey(userId), updatedAt)
}

function isRemoteNewer(userId: string, remoteUpdatedAt?: string) {
  if (!remoteUpdatedAt) {
    return false
  }

  const remoteEpoch = Date.parse(remoteUpdatedAt)
  if (!Number.isFinite(remoteEpoch)) {
    return false
  }

  const localUpdatedAt = getLastSyncedAt(userId)
  if (!localUpdatedAt) {
    return true
  }

  const localEpoch = Date.parse(localUpdatedAt)
  if (!Number.isFinite(localEpoch)) {
    return true
  }

  return remoteEpoch > localEpoch
}

function applyRemoteSnapshot(data: Pick<UserAppStateRow, "transaction_storage" | "goals_storage" | "updated_at">, userId: string) {
  if (data.transaction_storage) {
    localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(data.transaction_storage))
  }
  if (data.goals_storage) {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(data.goals_storage))
  }
  if (data.updated_at) {
    setLastSyncedAt(userId, data.updated_at)
  }
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
    sessionStorage.removeItem(getBootstrapReloadKey(previousUserId as string))
  }
  localStorage.setItem(AUTH_USER_STORAGE_KEY, user.id)

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("transaction_storage, goals_storage, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.warn("Falha ao buscar snapshot no Supabase:", error.message)
    return
  }

  const remoteHasMeaningfulData = hasMeaningfulSnapshots({
    transactionStorage: data?.transaction_storage || null,
    goalsStorage: data?.goals_storage || null
  })
  const localHasMeaningfulData = hasMeaningfulLocalData()

  if (!data) {
    if (localHasMeaningfulData) {
      await pushLocalStateToSupabase(user)
    }
    return
  }

  if (!localHasMeaningfulData && remoteHasMeaningfulData) {
    applyRemoteSnapshot(data, user.id)

    const reloadKey = getBootstrapReloadKey(user.id)
    const hasReloadedThisSession = sessionStorage.getItem(reloadKey) === "1"
    if (!hasReloadedThisSession) {
      sessionStorage.setItem(reloadKey, "1")
      window.location.reload()
    }
    return
  }

  // Keep backward compatibility for same-device usage where local state is intentionally ahead.
  if (localHasMeaningfulData && !remoteHasMeaningfulData) {
    await pushLocalStateToSupabase(user)
    return
  }

  if (localHasMeaningfulData && remoteHasMeaningfulData && isRemoteNewer(user.id, data.updated_at)) {
    applyRemoteSnapshot(data, user.id)
    const reloadKey = getBootstrapReloadKey(user.id)
    const hasReloadedThisSession = sessionStorage.getItem(reloadKey) === "1"
    if (!hasReloadedThisSession) {
      sessionStorage.setItem(reloadKey, "1")
      window.location.reload()
    }
    return
  }

  if (localHasMeaningfulData) {
    await pushLocalStateToSupabase(user)
  }
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
    return
  }

  setLastSyncedAt(user.id, payload.updated_at)
}

export async function pushLocalStateToSupabase(user: User) {
  const transactionStorage = parseStorageValue(localStorage.getItem(TRANSACTION_STORAGE_KEY))
  const goalsStorage = parseStorageValue(localStorage.getItem(GOALS_STORAGE_KEY))

  await pushSnapshotsToSupabase(user, {
    transactionStorage: transactionStorage || { state: {}, version: TRANSACTION_STORAGE_VERSION },
    goalsStorage: goalsStorage || { state: { goals: [] }, version: GOALS_STORAGE_VERSION }
  })
}

export async function pullRemoteSnapshotIfNewer(user: User) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return false
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("transaction_storage, goals_storage, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error || !data) {
    return false
  }

  const remoteHasMeaningfulData = hasMeaningfulSnapshots({
    transactionStorage: data.transaction_storage || null,
    goalsStorage: data.goals_storage || null
  })
  if (!remoteHasMeaningfulData) {
    return false
  }

  if (!isRemoteNewer(user.id, data.updated_at)) {
    return false
  }

  applyRemoteSnapshot(data, user.id)
  return true
}
