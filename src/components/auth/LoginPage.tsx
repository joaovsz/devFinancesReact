import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

function buildRedirectPath(from: unknown) {
  if (typeof from === "string" && from.startsWith("/")) {
    return from
  }

  return "/"
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isConfigured, signInWithGoogle, signInWithPassword, signUpWithPassword } =
    useAuth()

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null
    return buildRedirectPath(state?.from)
  }, [location.state])

  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGoogle() {
    setStatus(null)
    setIsSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao entrar com Google.")
      setIsSubmitting(false)
    }
  }

  async function handleEmailPassword(event: React.FormEvent) {
    event.preventDefault()
    setStatus(null)
    setIsSubmitting(true)

    const safeEmail = email.trim().toLowerCase()
    if (!safeEmail || !password) {
      setStatus("Preencha email e senha.")
      setIsSubmitting(false)
      return
    }

    try {
      if (mode === "signup") {
        await signUpWithPassword({ email: safeEmail, password })
        setStatus("Conta criada. Se necessário, confirme o email e faça login.")
        setMode("signin")
      } else {
        await signInWithPassword({ email: safeEmail, password })
        navigate(redirectTo, { replace: true })
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao autenticar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Entrar</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {isConfigured
          ? "Use Google ou email e senha."
          : "Supabase não está configurado. Defina as env vars para habilitar login."}
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!isConfigured || isSubmitting}
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-5 w-5 place-items-center rounded-md bg-white text-[10px] font-black text-zinc-950">
          G
        </span>
        Continuar com Google
      </button>

      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-500">ou</span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <form className="mt-5 space-y-3" onSubmit={handleEmailPassword}>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Email</span>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!isConfigured || isSubmitting}
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Senha</span>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!isConfigured || isSubmitting}
          />
        </label>

        {status && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={!isConfigured || isSubmitting}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "signup" ? "Criar conta" : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => setMode((current) => (current === "signup" ? "signin" : "signup"))}
          disabled={!isConfigured || isSubmitting}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "signup"
            ? "Já tenho conta"
            : "Criar uma conta com email e senha"}
        </button>
      </form>
    </section>
  )
}

