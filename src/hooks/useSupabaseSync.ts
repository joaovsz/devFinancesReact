import { useEffect, useRef } from "react"
import { User } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "../lib/supabase"
import { useGoalStore } from "../store/useGoalStore"
import { useTransactionStore } from "../store/useTransactionStore"
import { pushLocalStateToSupabase, syncFromSupabaseOnLogin } from "../services/supabase-sync"

export function useSupabaseSync(user: User | null) {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return
    }

    syncFromSupabaseOnLogin(user)

    const schedulePush = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        pushLocalStateToSupabase(user)
      }, 700)
    }

    const unsubscribeTransaction = useTransactionStore.subscribe(() => {
      schedulePush()
    })

    const unsubscribeGoals = useGoalStore.subscribe(() => {
      schedulePush()
    })

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      unsubscribeTransaction()
      unsubscribeGoals()
    }
  }, [user])
}
