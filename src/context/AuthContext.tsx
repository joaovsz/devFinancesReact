import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase"

type AuthContextValue = {
  isConfigured: boolean
  isLoading: boolean
  user: User | null
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (input: { email: string; password: string }) => Promise<void>
  signUpWithPassword: (input: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Erro desconhecido")
  }

  return "Erro desconhecido"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      setSession(null)
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      setIsLoading(false)
      setSession(null)
      return
    }

    let ignore = false

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (ignore) {
          return
        }
        if (error) {
          console.warn("Falha ao obter session:", getErrorMessage(error))
        }
        setSession(data.session || null)
        setIsLoading(false)
      })
      .catch((error) => {
        if (!ignore) {
          console.warn("Falha ao obter session:", getErrorMessage(error))
          setIsLoading(false)
        }
      })

    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => {
      ignore = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const supabase = getSupabaseClient()

    return {
      isConfigured: isSupabaseConfigured,
      isLoading,
      user: session?.user || null,
      signInWithGoogle: async () => {
        if (!supabase) {
          throw new Error("Supabase não configurado")
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/`
          }
        })

        if (error) {
          throw new Error(getErrorMessage(error))
        }
      },
      signInWithPassword: async ({ email, password }) => {
        if (!supabase) {
          throw new Error("Supabase não configurado")
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          throw new Error(getErrorMessage(error))
        }
      },
      signUpWithPassword: async ({ email, password }) => {
        if (!supabase) {
          throw new Error("Supabase não configurado")
        }

        const { error } = await supabase.auth.signUp({
          email,
          password
        })

        if (error) {
          throw new Error(getErrorMessage(error))
        }
      },
      signOut: async () => {
        if (!supabase) {
          return
        }

        const { error } = await supabase.auth.signOut()
        if (error) {
          throw new Error(getErrorMessage(error))
        }
      }
    }
  }, [isLoading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider />")
  }
  return value
}

