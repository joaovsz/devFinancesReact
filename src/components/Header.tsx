import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Menu, Moon, Sun, User } from "lucide-react"
import { NavLink } from "react-router-dom"
import Logo from "./icons/Logo"
import { dockItems } from "./MagicDock"
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const navMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
      if (!navMenuRef.current?.contains(event.target as Node)) {
        setIsNavMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  return (
    <header className="bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 md:px-8 xl:max-w-7xl xl:px-10 2xl:max-w-[1500px] 2xl:px-12">
        <div className="flex w-full items-center justify-between md:w-auto md:justify-start md:gap-3">
          <div className="flex items-center gap-3">
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
          </div>

          <div className="relative shrink-0 md:hidden" ref={navMenuRef}>
            <button
              type="button"
              onClick={() => setIsNavMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              aria-label="Abrir menu de navegação"
              title="Menu"
            >
              <Menu size={18} />
            </button>

            {isNavMenuOpen && (
              <div className="fixed inset-0 z-20 bg-zinc-950/80 backdrop-blur-sm md:absolute md:left-0 md:top-full md:mt-2 md:bg-transparent md:backdrop-blur-none">
                <div className="fixed inset-x-4 top-20 bottom-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl shadow-zinc-950/40 md:static md:w-[220px] md:rounded-xl md:p-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-2 py-3 md:block md:px-2 md:py-2">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 md:text-[10px]">
                      Navegação
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNavMenuOpen(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 md:hidden"
                      aria-label="Fechar menu"
                    >
                      <Menu size={16} />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 overflow-y-auto md:mt-2 md:space-y-1">
                    {dockItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsNavMenuOpen(false)}
                      >
                        {({ isActive }) => (
                          <div
                            className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-base transition md:min-h-0 md:rounded-lg md:px-3 md:py-2 md:text-sm ${
                              isActive
                                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                                : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 hover:text-zinc-100"
                            }`}
                          >
                            <Icon size={20} className="md:h-4 md:w-4" />
                            <span>{item.label}</span>
                          </div>
                        )}
                      </NavLink>
                    )
                  })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
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
          </div>

          <div className="relative shrink-0" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              aria-label="Abrir menu da conta"
              title="Conta"
            >
              <User size={18} />
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl shadow-zinc-950/40">
                <div className="border-b border-zinc-800 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Conta</div>
                  <div className="mt-1 break-all text-sm text-zinc-200">
                    {userEmail || "Sem sessao ativa"}
                  </div>
                </div>
                {onSignOut ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false)
                      onSignOut()
                    }}
                    className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                  >
                    Sair
                  </button>
                ) : (
                  <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
                    Menu local para teste
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
