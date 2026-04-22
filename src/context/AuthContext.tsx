import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"
import { Session, User } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase"
import {
  AUTH_USER_STORAGE_KEY,
  clearLocalAppData
} from "../services/supabase-sync"

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signUpWithPassword: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        clearLocalAppData()
        localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      }
      setSession(nextSession || null)
      setLoading(false)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user || null,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      signInWithGoogle: async () => {
        const supabase = getSupabaseClient()
        if (!supabase) {
          return
        }

        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin
          }
        })
      },
      signInWithPassword: async (email: string, password: string) => {
        const supabase = getSupabaseClient()
        if (!supabase) {
          return "Supabase não configurado."
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        return error?.message || null
      },
      signUpWithPassword: async (email: string, password: string) => {
        const supabase = getSupabaseClient()
        if (!supabase) {
          return "Supabase não configurado."
        }

        const { error } = await supabase.auth.signUp({
          email,
          password
        })

        return error?.message || null
      },
      signOut: async () => {
        const supabase = getSupabaseClient()
        if (!supabase) {
          return
        }

        await supabase.auth.signOut()
        clearLocalAppData()
        localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      }
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }

  return context
}
