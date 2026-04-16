import { motion } from "framer-motion"
import { ChartLine, ClipboardList, Home, Settings, Target, Wallet } from "lucide-react"
import { LucideIcon } from "lucide-react"
import { NavLink } from "react-router-dom"

type DockItem = {
  to: string
  label: string
  icon: LucideIcon
}

const dockItems: DockItem[] = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/transacoes", label: "Transações", icon: Wallet },
  { to: "/planejamento", label: "Planejamento", icon: ClipboardList },
  { to: "/projecoes", label: "Projeções", icon: ChartLine },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/configuracoes", label: "Config", icon: Settings }
]

type MagicDockProps = {
  theme: "dark" | "light"
}

export const MagicDock = ({ theme }: MagicDockProps) => {
  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 h-36 bg-gradient-to-t backdrop-blur-xl ${
          theme === "dark"
            ? "from-zinc-950/70 via-zinc-900/30 to-transparent"
            : "from-white/80 via-white/45 to-transparent"
        }`}
        style={{
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0.75) 58%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 100%)"
        }}
      />
      <div
        className={`fixed bottom-4 left-1/2 z-40 w-[calc(100vw-1rem)] max-w-fit -translate-x-1/2 overflow-x-auto rounded-2xl border p-1.5 shadow-2xl backdrop-blur sm:p-2 ${
          theme === "dark"
            ? "border-zinc-700/80 bg-zinc-900/90 shadow-zinc-950/40"
            : "border-zinc-300/80 bg-white/90 shadow-zinc-300/40"
        }`}
      >
        <div className="flex min-w-max items-center gap-1.5 sm:gap-2">
          {dockItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} aria-label={item.label}>
                {({ isActive }) => (
                  <motion.div
                    whileHover={{ y: -4, scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    className={`flex h-13 min-w-14 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 transition sm:h-14 sm:min-w-20 sm:px-2 ${
                      isActive
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100"
                    }`}
                    title={item.label}
                  >
                    <Icon size={18} />
                    <span className="max-w-12 truncate text-[9px] font-medium leading-none sm:max-w-20 sm:text-xs">
                      {item.label}
                    </span>
                  </motion.div>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>
    </>
  )
}
