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

function App() {
  const location = useLocation()
  const isTransactionsRoute = location.pathname === "/transacoes"
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const storedTheme = localStorage.getItem("devfinances-theme")
    return storedTheme === "light" ? "light" : "dark"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", theme === "light")
    localStorage.setItem("devfinances-theme", theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        theme={theme}
        onToggleTheme={() =>
          setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))
        }
      />
      <main
        className={`mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-2 md:px-8 md:pt-4 xl:max-w-7xl xl:gap-10 xl:px-10 2xl:max-w-[1500px] 2xl:px-12 ${
          isTransactionsRoute
            ? "h-[calc(100dvh-6.5rem)] overflow-hidden pb-[calc(5rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/transacoes" element={<TransactionsPage />} />
          <Route path="/cartoes" element={<Navigate to="/" replace />} />
          <Route path="/planejamento" element={<PlanningPage />} />
          <Route path="/projecoes" element={<ProjectionsPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Routes>
      </main>
      {!isTransactionsRoute && <Footer />}
      <MagicDock theme={theme} />
    </div>
  )
}

export default App
