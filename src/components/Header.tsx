import { motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import Logo from "./icons/Logo"
import { useTransactionStore } from "../store/useTransactionStore"
import { getCurrentMonthKey, getMonthLabel } from "../utils/projections"

type HeaderProps = {
  theme: "dark" | "light"
  onToggleTheme: () => void
  userEmail?: string | null
  onSignOut?: () => void
}

export const Header = ({ theme, onToggleTheme, userEmail, onSignOut }: HeaderProps) => {
  const activeMonthKey = useTransactionStore((state) => state.activeMonthKey)
  const setActiveMonthKey = useTransactionStore((state) => state.setActiveMonthKey)
  const resetActiveMonthKey = useTransactionStore((state) => state.resetActiveMonthKey)
  const isCurrentOperationalMonth = activeMonthKey === getCurrentMonthKey()

  return (
    <header className="bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 md:px-8 xl:max-w-7xl xl:px-10 2xl:max-w-[1500px] 2xl:px-12">
        <motion.button
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onToggleTheme}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
            theme === "dark"
              ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100"
              : "border-zinc-300 bg-white text-zinc-700 hover:text-zinc-900"
          }`}
          title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
        <Logo className="text-zinc-100" />

        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:ml-auto md:w-auto">
          <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 md:w-auto">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">
              Mês operacional
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 md:flex-none"
                type="month"
                value={activeMonthKey}
                onChange={(event) => setActiveMonthKey(event.target.value)}
              />
              <button
                type="button"
                onClick={resetActiveMonthKey}
                disabled={isCurrentOperationalMonth}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hoje
              </button>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">{getMonthLabel(activeMonthKey)}</div>
          </div>
          {userEmail && (
            <span className="hidden max-w-[18rem] truncate text-sm text-zinc-400 md:block">
              {userEmail}
            </span>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
