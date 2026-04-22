import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { formatCurrency } from "../components/Transactions"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import { useTransactionStore } from "../store/useTransactionStore"
import {
  getCltProjectedRevenueForMonth,
  getCommittedCostsForMonth,
  getCurrentMonthKey,
  getPjProjectedRevenueForMonth
} from "../utils/projections"
import { PlanningPage } from "./PlanningPage"
import { ProjectionsPage } from "./ProjectionsPage"

type WorkspaceTab = "planejar" | "impacto"

export const PlanningWorkspacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentMonth = getCurrentMonthKey()
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const transactions = useTransactionStore((state) => state.transactions)
  const cards = useTransactionStore((state) => state.cards)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const hasDirectEditParams =
    searchParams.has("editFixedCostId") || searchParams.has("editInstallmentId")
  const requestedTab = searchParams.get("tab")
  const activeTab: WorkspaceTab =
    hasDirectEditParams || requestedTab !== "impacto" ? "planejar" : "impacto"

  useEffect(() => {
    let ignore = false
    const year = Number(currentMonth.split("-")[0])

    if (!(contractConfig.incomeMode === "pj" && contractConfig.useHolidayApi)) {
      setHolidays([])
      return () => {
        ignore = true
      }
    }

    fetchBrazilHolidaysByYear(year)
      .then((data) => {
        if (!ignore) {
          setHolidays(data.filter((holiday) => holiday.date.startsWith(currentMonth)))
        }
      })
      .catch(() => {
        if (!ignore) {
          setHolidays([])
        }
      })

    return () => {
      ignore = true
    }
  }, [currentMonth, contractConfig.incomeMode, contractConfig.useHolidayApi])

  const projectedRevenueCurrentMonth = useMemo(() => {
    if (contractConfig.incomeMode === "clt") {
      return getCltProjectedRevenueForMonth(contractConfig, currentMonth)
    }

    return getPjProjectedRevenueForMonth({
      contractConfig,
      monthKey: currentMonth,
      holidays
    })
  }, [
    contractConfig.incomeMode,
    contractConfig.cltNetSalary,
    contractConfig.hoursPerWorkday,
    contractConfig.hourlyRate,
    contractConfig.pjPaydayDate,
    currentMonth,
    holidays
  ])

  const committedCostsCurrentMonth = useMemo(
    () =>
      getCommittedCostsForMonth({
        cards,
        transactions,
        fixedCosts,
        installmentPlans,
        monthKey: currentMonth
      }).total,
    [cards, transactions, fixedCosts, installmentPlans, currentMonth]
  )
  const projectedLeftoverCurrentMonth =
    projectedRevenueCurrentMonth - committedCostsCurrentMonth

  const nonCreditDueAlerts = useMemo(() => {
    const today = new Date()
    const todayDay = today.getDate()
    return fixedCosts
      .filter(
        (cost) =>
          cost.paymentMethod !== "credit" &&
          Number.isFinite(cost.dueDay) &&
          Number(cost.dueDay) >= 1 &&
          Number(cost.dueDay) <= 31
      )
      .map((cost) => {
        const dueDay = Number(cost.dueDay)
        const deltaDays = dueDay - todayDay
        const status: "overdue" | "soon" | "ok" =
          deltaDays < 0 ? "overdue" : deltaDays <= 3 ? "soon" : "ok"
        return {
          id: cost.id,
          name: cost.name,
          amount: cost.amount,
          dueDay,
          deltaDays,
          status
        }
      })
      .filter((alert) => alert.status !== "ok")
      .sort((left, right) => left.dueDay - right.dueDay)
  }, [fixedCosts])

  function selectTab(nextTab: WorkspaceTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("tab", nextTab)
      return next
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-zinc-100">Planejamento & Impacto</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Planeje custos e acompanhe a projeção no mesmo fluxo.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Receita estimada (mês)
            </div>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              {formatCurrency(projectedRevenueCurrentMonth)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Compromissos (mês)
            </div>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              {formatCurrency(committedCostsCurrentMonth)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Sobra projetada (mês)
            </div>
            <p
              className={`mt-1 text-lg font-semibold ${
                projectedLeftoverCurrentMonth >= 0 ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {formatCurrency(projectedLeftoverCurrentMonth)}
            </p>
          </div>
        </div>
      </article>

      {nonCreditDueAlerts.length > 0 && (
        <article className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle size={16} />
            Avisos de vencimento (não crédito)
          </div>
          <div className="space-y-1.5">
            {nonCreditDueAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-amber-500/25 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200"
              >
                <span className="truncate">
                  {alert.name} · vence dia {alert.dueDay}
                </span>
                <span className="ml-3 font-semibold">{formatCurrency(alert.amount)}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => selectTab("planejar")}
          className={`rounded-xl border px-3 py-2 text-sm transition ${
            activeTab === "planejar"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          }`}
        >
          Planejar
        </button>
        <button
          type="button"
          onClick={() => selectTab("impacto")}
          className={`rounded-xl border px-3 py-2 text-sm transition ${
            activeTab === "impacto"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          }`}
        >
          Impacto
        </button>
      </div>

      {activeTab === "planejar" ? (
        <PlanningPage embedded />
      ) : (
        <ProjectionsPage embedded />
      )}
    </section>
  )
}
