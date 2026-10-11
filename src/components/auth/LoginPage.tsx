import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  CalendarClock,
  CreditCard,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { Logo, SwiftFinancesSymbol } from "../icons/Logo"

const HIGHLIGHTS = [
  {
    icon: CalendarClock,
    title: "Previsibilidade mês a mês",
    description: "Veja quanto vai sobrar nos próximos meses antes de gastar."
  },
  {
    icon: CreditCard,
    title: "Cartões e parcelas sob controle",
    description: "Faturas e parcelamentos entram no mês certo, sem surpresas."
  },
  {
    icon: ShieldCheck,
    title: "Seus dados, com privacidade",
    description: "Funciona offline e sincroniza com segurança entre dispositivos."
  }
]

function buildRedirectPath(from: unknown) {
  if (typeof from === "string" && from.startsWith("/")) {
    return from
  }

  return "/"
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  )
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
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDisabled = !isConfigured || isSubmitting

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
    <div className="relative flex min-h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 right-0 h-[26rem] w-[26rem] rounded-full bg-indigo-500/10 blur-3xl"
      />

      <aside className="relative hidden w-1/2 flex-col justify-between border-r border-zinc-900 px-12 py-12 lg:flex xl:px-16">
        <Logo className="text-zinc-100" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-lg"
        >
          <h1 className="font-['Archivo',system-ui,sans-serif] text-4xl font-[800] leading-tight tracking-tight text-zinc-100 xl:text-5xl">
            Seu dinheiro, <span className="text-emerald-400">sem ansiedade.</span>
          </h1>
          <p className="mt-4 text-base text-zinc-400">
            Organize entradas, cartões e parcelas em um só lugar e saiba com
            antecedência como os próximos meses vão fechar.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }, index) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + index * 0.1, ease: "easeOut" }}
                className="flex items-start gap-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-emerald-400">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{title}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <p className="text-xs text-zinc-500">
          © {new Date().getFullYear()} Swift Finances
        </p>
      </aside>

      <main className="relative flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <SwiftFinancesSymbol size={30} className="text-emerald-400" dotStroke="#18181b" />
            </span>
            <p className="mt-4 font-['Archivo',system-ui,sans-serif] text-lg font-[800] uppercase tracking-[0.02em]">
              SWIFT <span className="font-[600] text-zinc-400">FINANCES</span>
            </p>
            <p className="mt-1 text-sm text-zinc-400">Seu dinheiro, sem ansiedade.</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <h2 className="text-2xl font-semibold text-zinc-100">
              {mode === "signup" ? "Criar conta" : "Bem-vindo de volta"}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              {!isConfigured
                ? "Supabase não está configurado. Defina as env vars para habilitar login."
                : mode === "signup"
                  ? "Comece a planejar seus próximos meses."
                  : "Entre para acessar seu painel financeiro."}
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={isDisabled}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs uppercase tracking-wide text-zinc-500">ou com email</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <form className="space-y-4" onSubmit={handleEmailPassword}>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Email</span>
                <span className="relative mt-1.5 block">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isDisabled}
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Senha</span>
                <span className="relative mt-1.5 block">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isDisabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 transition hover:text-zinc-200"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>

              {status && (
                <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {status}
                </p>
              )}

              <button
                type="submit"
                disabled={isDisabled}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <LoaderCircle size={16} className="animate-spin" />}
                {mode === "signup" ? "Criar conta" : "Entrar"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              {mode === "signup" ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setStatus(null)
                  setMode((current) => (current === "signup" ? "signin" : "signup"))
                }}
                disabled={isDisabled}
                className="font-medium text-emerald-400 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mode === "signup" ? "Entrar" : "Criar conta"}
              </button>
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
