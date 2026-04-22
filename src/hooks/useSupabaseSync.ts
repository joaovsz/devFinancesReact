import { useEffect, useRef } from "react"
import { User } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "../lib/supabase"
import { useGoalStore } from "../store/useGoalStore"
import { useTransactionStore } from "../store/useTransactionStore"
import {
  AppStateSnapshots,
  buildAppStateSnapshots,
  persistSnapshotsLocally,
  pushSnapshotsToSupabase,
  syncFromSupabaseOnLogin
} from "../services/supabase-sync"

export function useSupabaseSync(user: User | null) {
  const timerRef = useRef<number | null>(null)
  const pendingSnapshotsRef = useRef<AppStateSnapshots | null>(null)
  const isBootstrappingRef = useRef(false)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return
    }

    isBootstrappingRef.current = true
    void syncFromSupabaseOnLogin(user).finally(() => {
      isBootstrappingRef.current = false
    })

    const getCurrentSnapshots = () =>
      buildAppStateSnapshots({
        transactionState: useTransactionStore.getState(),
        goalState: useGoalStore.getState()
      })

    const queueSnapshots = () => {
      const snapshots = getCurrentSnapshots()
      pendingSnapshotsRef.current = snapshots
      persistSnapshotsLocally(snapshots)
    }

    const flushPendingSnapshots = () => {
      if (!pendingSnapshotsRef.current) {
        queueSnapshots()
      }

      const snapshots = pendingSnapshotsRef.current
      if (!snapshots) {
        return
      }

      pendingSnapshotsRef.current = null
      void pushSnapshotsToSupabase(user, snapshots)
    }

    const schedulePush = () => {
      if (isBootstrappingRef.current) {
        return
      }

      queueSnapshots()

      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        flushPendingSnapshots()
      }, 700)
    }

    const unsubscribeTransaction = useTransactionStore.subscribe(() => {
      schedulePush()
    })

    const unsubscribeGoals = useGoalStore.subscribe(() => {
      schedulePush()
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSnapshots()
      }
    }

    const handlePageHide = () => {
      flushPendingSnapshots()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      isBootstrappingRef.current = false
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      flushPendingSnapshots()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      unsubscribeTransaction()
      unsubscribeGoals()
    }
  }, [user])
}
