import { useEffect, useState } from "react"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { MagicDock } from "./components/MagicDock"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { OverviewPage } from "./pages/OverviewPage"
import { TransactionsPage } from "./pages/TransactionsPage"
import { ProjectionsPage } from "./pages/ProjectionsPage"
import { PlanningPage } from "./pages/PlanningPage"
import { GoalsPage } from "./pages/GoalsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { LoginPage } from "./components/auth/LoginPage"
import { useAuth } from "./context/AuthContext"
import { useSupabaseSync } from "./hooks/useSupabaseSync"

export type ColorTheme =
  | "indigo-calm"
  | "ocean-slate"
  | "violet-focus"
  | "amber-graphite"

const COLOR_THEME_STORAGE_KEY = "devfinances-color-theme"
const COLOR_THEME_CLASSNAMES: Record<ColorTheme, string> = {
  "indigo-calm": "color-indigo-calm",
  "ocean-slate": "color-ocean-slate",
  "violet-focus": "color-violet-focus",
  "amber-graphite": "color-amber-graphite"
}

function App() {
  const { isConfigured, isLoading, user, signOut } = useAuth()
  const location = useLocation()
  const isTransactionsRoute = location.pathname === "/transacoes"
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const storedTheme = localStorage.getItem("devfinances-theme")
    return storedTheme === "light" ? "light" : "dark"
  })
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    if (
      stored === "indigo-calm" ||
      stored === "ocean-slate" ||
      stored === "violet-focus" ||
      stored === "amber-graphite"
    ) {
      return stored
    }

    return "indigo-calm"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", theme === "light")
    localStorage.setItem("devfinances-theme", theme)
  }, [theme])

  useEffect(() => {
    Object.values(COLOR_THEME_CLASSNAMES).forEach((className) => {
      document.documentElement.classList.remove(className)
    })
    document.documentElement.classList.add(COLOR_THEME_CLASSNAMES[colorTheme])
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, colorTheme)
  }, [colorTheme])

  useSupabaseSync(user)

  const isAuthRequired = isConfigured
  const isAuthenticated = Boolean(user)
  const isLoginRoute = location.pathname === "/login"

  if (isAuthRequired && isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8 xl:max-w-7xl xl:px-10 2xl:max-w-[1500px] 2xl:px-12">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
            <div className="mt-4 h-4 w-72 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  if (isAuthRequired && !isAuthenticated && !isLoginRoute) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        theme={theme}
        onToggleTheme={() =>
          setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))
        }
        userEmail={user?.email || null}
        onSignOut={isAuthRequired && isAuthenticated ? () => void signOut() : undefined}
      />
      <main
        className={`mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-2 md:px-8 md:pt-4 xl:max-w-7xl xl:gap-10 xl:px-10 2xl:max-w-[1500px] 2xl:px-12 ${
          isTransactionsRoute
            ? "pb-[calc(6.25rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<OverviewPage />} />
          <Route path="/transacoes" element={<TransactionsPage />} />
          <Route path="/cartoes" element={<Navigate to="/" replace />} />
          <Route path="/planejamento" element={<PlanningPage />} />
          <Route path="/projecoes" element={<ProjectionsPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route
            path="/configuracoes"
            element={
              <SettingsPage
                colorTheme={colorTheme}
                onColorThemeChange={setColorTheme}
              />
            }
          />
        </Routes>
      </main>
      {!isTransactionsRoute && <Footer />}
      <MagicDock theme={theme} />
    </div>
  )
}

export default App
