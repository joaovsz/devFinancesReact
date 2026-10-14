import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  ChartLine,
  ClipboardCheck,
  ClipboardList,
  Home,
  PackageSearch,
  Settings,
  Target,
  Wallet
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

type DockItem = {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
}

export const dockItems: DockItem[] = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/transacoes", label: "Transações", icon: Wallet },
  { to: "/planejamento", label: "Planejamento", shortLabel: "Planejar", icon: ClipboardList },
  { to: "/compromissos", label: "Compromissos", shortLabel: "Contas", icon: ClipboardCheck },
  { to: "/projecoes", label: "Projeções", icon: ChartLine },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/configuracoes", label: "Config", icon: Settings }
]

const commerceDockItem: DockItem = {
  to: "/commerce",
  label: "Commerce",
  shortLabel: "Commerce",
  icon: PackageSearch
}

export function getDockItems(canAccessCommerce: boolean) {
  return canAccessCommerce
    ? [...dockItems.slice(0, -1), commerceDockItem, dockItems[dockItems.length - 1]]
    : dockItems
}

type MagicDockProps = {
  theme: "dark" | "light"
  canAccessCommerce?: boolean
}

// Low damping makes the width change overshoot and settle, the "jelly" feel
const dockSpring = { type: "spring", stiffness: 520, damping: 17, mass: 0.7 } as const
const MOBILE_DOCK_ITEMS = 4

export const MagicDock = ({ theme, canAccessCommerce = false }: MagicDockProps) => {
  const visibleDockItems = getDockItems(canAccessCommerce)
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const layoutTransition = prefersReducedMotion ? { duration: 0 } : dockSpring

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t backdrop-blur-xl ${
          theme === "dark"
            ? "from-zinc-950/70 via-zinc-900/30 to-transparent"
            : "from-white/80 via-white/45 to-transparent"
        }`}
        style={{
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0.75) 58%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 100%)"
        }}
      />
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 z-40 flex justify-center px-3"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <motion.ul
          layout
          transition={layoutTransition}
          className={`flex items-center gap-1 rounded-2xl border p-1.5 shadow-2xl backdrop-blur ${
            theme === "dark"
              ? "border-zinc-700/80 bg-zinc-900/95 shadow-zinc-950/40"
              : "border-zinc-300/80 bg-white/95 shadow-zinc-300/40"
          }`}
        >
          {visibleDockItems.map((item, index) => {
            const Icon = item.icon
            const isCurrent =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
            // On phones only the first items fit; the current page always stays visible
            const isHiddenOnMobile = index >= MOBILE_DOCK_ITEMS && !isCurrent

            return (
              <motion.li
                key={item.to}
                layout
                transition={layoutTransition}
                className={isHiddenOnMobile ? "hidden sm:block" : ""}
              >
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  aria-current={isCurrent ? "page" : undefined}
                  title={item.label}
                  className="relative flex h-11 min-w-11 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="dock-active-pill"
                      transition={layoutTransition}
                      className="absolute inset-0 rounded-xl border border-emerald-500/60 bg-emerald-500/20"
                    />
                  )}
                  <motion.span
                    key={isCurrent ? `${item.to}-active` : item.to}
                    initial={isCurrent && !prefersReducedMotion ? { scaleX: 0.86, scaleY: 1.12 } : false}
                    animate={{ scaleX: 1, scaleY: 1 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 600, damping: 9, mass: 0.6 }
                    }
                    className={`relative flex items-center gap-2 px-3 ${
                      isCurrent
                        ? "text-emerald-300"
                        : theme === "dark"
                          ? "text-zinc-400 hover:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    <Icon size={19} className="shrink-0" />
                    <AnimatePresence initial={false}>
                      {isCurrent && (
                        <motion.span
                          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0, filter: "blur(4px)" }}
                          animate={{ opacity: 1, width: "auto", filter: "blur(0px)" }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0, filter: "blur(4px)" }}
                          transition={layoutTransition}
                          className="overflow-hidden whitespace-nowrap text-sm font-semibold"
                        >
                          {item.shortLabel || item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                </NavLink>
              </motion.li>
            )
          })}
        </motion.ul>
      </nav>
    </>
  )
}
