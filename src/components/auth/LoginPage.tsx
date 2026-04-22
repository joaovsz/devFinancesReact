import { FormEvent, useState } from "react"
import { useAuth } from "../../context/AuthContext"

const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

export const LoginPage = () => {
  const { isConfigured, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || !password) {
      setMessage("Preencha e-mail e senha.")
      return
    }

    setSubmitting(true)
    setMessage("")
    const action = mode === "login" ? signInWithPassword : signUpWithPassword
    const error = await action(email.trim(), password)
    setSubmitting(false)

    if (error) {
      setMessage(error)
      return
    }

    if (mode === "signup") {
      setMessage("Conta criada. Se necessário, confirme o e-mail para entrar.")
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold text-zinc-100">Entrar no dev.finance$</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Faça login para sincronizar seus dados com Supabase.
        </p>

        {!isConfigured && (
          <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env`.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 text-xs transition ${
              mode === "login"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
            }`}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 text-xs transition ${
              mode === "signup"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
            }`}
            onClick={() => setMode("signup")}
          >
            Criar conta
          </button>
        </div>

        <button
          type="button"
          disabled={!isConfigured}
          onClick={() => signInWithGoogle()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.2-1.5 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6H12z"
            />
            <path
              fill="#34A853"
              d="M2.4 12c0 1.9.7 3.7 2 5.1l3.3-2.6c-.9-.6-1.5-1.6-1.5-2.5s.6-1.9 1.5-2.5L4.4 6.9C3.1 8.3 2.4 10.1 2.4 12z"
            />
            <path
              fill="#4A90E2"
              d="M12 21.7c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.6-1.9 1-3.3 1-2.6 0-4.7-1.7-5.5-4l-3.4 2.6c1.6 3 4.7 5.2 8.9 5.2z"
            />
            <path
              fill="#FBBC05"
              d="M6.5 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.1 7.5C2.6 8.6 2.4 9.8 2.4 12s.2 3.4.7 4.5l3.4-2.6z"
            />
          </svg>
          Continuar com Google
        </button>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-zinc-700" />
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">ou</span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-xs uppercase tracking-wide text-zinc-400">
            E-mail
            <input
              className={`${inputClassName} mt-1`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-xs uppercase tracking-wide text-zinc-400">
            Senha
            <input
              className={`${inputClassName} mt-1`}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <button
            type="submit"
            disabled={!isConfigured || submitting}
            className="w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Processando..." : mode === "login" ? "Entrar com e-mail" : "Criar conta"}
          </button>
        </form>

        {message && (
          <p className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
            {message}
          </p>
        )}
      </section>
    </div>
  )
}
