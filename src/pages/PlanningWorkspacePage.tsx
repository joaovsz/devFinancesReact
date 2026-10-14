import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Circle, Clock3 } from "lucide-react"
import { formatCurrency } from "../components/Transactions"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import { useTransactionStore } from "../store/useTransactionStore"
import { selectTotalMonthlyContribution, useGoalStore } from "../store/useGoalStore"
import {
  buildMonthlyPayables,
  getMonthlyPaymentAlerts,
  getMonthlyPaymentMetrics,
  MonthlyPayable
} from "../utils/domain/monthly-payments"
import {
  getCommittedCostsForMonth,
  getCurrentMonthKey,
  getExpectedIncomeForMonth,
  getOperationalCostsForMonth,
} from "../utils/projections"

function getMonthReferenceDate(monthKey: string) {
  if (monthKey === getCurrentMonthKey()) {
    return new Date().toISOString().slice(0, 10)
  }

  const [year, month] = monthKey.split("-").map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return `${monthKey}-${String(lastDay).padStart(2, "0")}`
}

export const PlanningWorkspacePage = () => {
  const currentMonth = useTransactionStore((state) => state.activeMonthKey)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const transactions = useTransactionStore((state) => state.transactions)
  const cards = useTransactionStore((state) => state.cards)
  const paidPlannedItems = useTransactionStore((state) => state.paidPlannedItems)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const goalsMonthlyContribution = useGoalStore(selectTotalMonthlyContribution)
  const markCardInvoiceAsPaid = useTransactionStore((state) => state.markCardInvoiceAsPaid)
  const markCardInvoiceAsUnpaid = useTransactionStore((state) => state.markCardInvoiceAsUnpaid)
  const markPlannedItemAsPaid = useTransactionStore((state) => state.markPlannedItemAsPaid)
  const markPlannedItemAsUnpaid = useTransactionStore((state) => state.markPlannedItemAsUnpaid)
  const [holidays, setHolidays] = useState<Holiday[]>([])

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
    return getExpectedIncomeForMonth({
      contractConfig,
      transactions,
      monthKey: currentMonth,
      holidays
    })
  }, [
    contractConfig.cltNetSalary,
    contractConfig.cltPaydayDate,
    contractConfig.cltCompetenceOffsetMonths,
    contractConfig.hoursPerWorkday,
    contractConfig.hourlyRate,
    contractConfig.pjPaydayDate,
    contractConfig.pjCompetenceOffsetMonths,
    transactions,
    currentMonth,
    holidays
  ])

  const operationalCostsCurrentMonthBase = useMemo(
    () =>
      getOperationalCostsForMonth({
        cards,
        transactions,
        fixedCosts,
        installmentPlans,
        monthKey: currentMonth
      }).total,
    [cards, transactions, fixedCosts, installmentPlans, currentMonth]
  )
  const operationalCostsCurrentMonth =
    operationalCostsCurrentMonthBase + goalsMonthlyContribution
  const projectedLeftoverCurrentMonth =
    projectedRevenueCurrentMonth - operationalCostsCurrentMonth

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

  const monthlyPayables = useMemo(
    () =>
      buildMonthlyPayables({
        cards,
        transactions,
        fixedCosts,
        installmentPlans,
        monthKey: currentMonth,
        paidPlannedItems,
        referenceDate: getMonthReferenceDate(currentMonth)
      }),
    [cards, transactions, fixedCosts, installmentPlans, currentMonth, paidPlannedItems]
  )
  const paymentMetrics = useMemo(
    () => getMonthlyPaymentMetrics(monthlyPayables),
    [monthlyPayables]
  )
  const paymentAlerts = useMemo(
    () => getMonthlyPaymentAlerts(monthlyPayables),
    [monthlyPayables]
  )

  const nonCreditDueAlerts = useMemo(() => {
    return monthlyPayables.filter(
      (item) =>
        item.kind !== "cardInvoice" &&
        (item.status === "overdue" || item.status === "dueSoon")
    )
  }, [monthlyPayables])

  function togglePayable(item: MonthlyPayable) {
    if (item.kind === "cardInvoice") {
      if (item.status === "paid") {
        markCardInvoiceAsUnpaid(item.sourceId, item.monthKey)
      } else {
        markCardInvoiceAsPaid(item.sourceId, item.monthKey)
      }
      return
    }

    if (item.status === "paid") {
      markPlannedItemAsUnpaid(item.kind, item.sourceId, item.monthKey)
      return
    }

    markPlannedItemAsPaid(item.kind, item.sourceId, item.monthKey)
  }

  function getPayableStatusLabel(item: MonthlyPayable) {
    if (!item.dueDate) {
      return "Informe a data de vencimento"
    }
    if (item.status === "paid") {
      return "Pago"
    }
    if (item.status === "overdue") {
      return "Atrasado"
    }
    if (item.status === "dueSoon") {
      return "Vence em breve"
    }

    return "Pendente"
  }

  function getPayableStatusClass(item: MonthlyPayable) {
    if (!item.dueDate) {
      return "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
    }
    if (item.status === "paid") {
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
    }
    if (item.status === "overdue") {
      return "border-rose-500/40 bg-rose-500/15 text-rose-300"
    }
    if (item.status === "dueSoon") {
      return "border-amber-500/40 bg-amber-500/15 text-amber-300"
    }

    return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }

  function formatPayableDueLabel(item: MonthlyPayable) {
    if (!item.dueDate) {
      return "sem vencimento definido"
    }

    const [, month, day] = item.dueDate.split("-")
    return `vence em ${day}/${month}`
  }

  const alertRows = [
    { label: "Atrasadas", value: paymentAlerts.overdue.length, tone: "text-rose-300" },
    { label: "Vencem em breve", value: paymentAlerts.dueSoon.length, tone: "text-amber-300" },
    { label: "Faturas pendentes", value: paymentAlerts.pendingInvoices.length, tone: "text-zinc-100" },
    {
      label: "Despesas pendentes",
      value: paymentAlerts.pendingFixedCosts.length + paymentAlerts.pendingInstallments.length,
      tone: "text-zinc-100"
    }
  ]

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100 sm:text-xl">Planejamento & Impacto</h1>
        <p className="mt-1 text-sm text-zinc-400">Planeje custos e acompanhe a projeção no mesmo fluxo.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Sidebar: month summary, payment health and alerts */}
        <aside className="flex flex-col gap-4">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-100">Resumo do mês</h2>
            <dl className="mt-2 divide-y divide-zinc-800">
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-sm text-zinc-400">Receita estimada</dt>
                <dd className="text-base font-semibold tabular-nums text-zinc-100">
                  {formatCurrency(projectedRevenueCurrentMonth)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-sm text-zinc-400">
                  Saídas do mês
                  {goalsMonthlyContribution > 0 && (
                    <span className="block text-xs text-zinc-500">
                      Inclui {formatCurrency(goalsMonthlyContribution)} de metas
                    </span>
                  )}
                </dt>
                <dd className="text-base font-semibold tabular-nums text-zinc-100">
                  {formatCurrency(operationalCostsCurrentMonth)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-2.5">
                <dt className="text-sm text-zinc-400">Sobra projetada</dt>
                <dd
                  className={`text-base font-semibold tabular-nums ${
                    projectedLeftoverCurrentMonth >= 0 ? "text-emerald-300" : "text-amber-300"
                  }`}
                >
                  {formatCurrency(projectedLeftoverCurrentMonth)}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-100">Saúde de quitação</h2>
              <p className="shrink-0 text-sm text-zinc-400">
                <span className="text-lg font-semibold tabular-nums text-zinc-100">
                  {paymentMetrics.paidAmountPercentage.toFixed(0)}%
                </span>{" "}
                pago
              </p>
            </div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800"
              role="progressbar"
              aria-label="Percentual pago por valor"
              aria-valuenow={Math.round(Math.min(paymentMetrics.paidAmountPercentage, 100))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.min(paymentMetrics.paidAmountPercentage, 100)}%` }}
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-zinc-400">Pagas</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-emerald-300">
                  {formatCurrency(paymentMetrics.paidAmount)}
                </dd>
                <dd className="text-xs text-zinc-500">
                  {paymentMetrics.paidCount} de {paymentMetrics.totalCount} contas
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-sm text-zinc-400">A pagar</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-amber-300">
                  {formatCurrency(paymentMetrics.unpaidAmount)}
                </dd>
                <dd className="text-xs text-zinc-500">
                  {paymentMetrics.unpaidCount} {paymentMetrics.unpaidCount === 1 ? "pendente" : "pendentes"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
              <Clock3 size={16} className="text-zinc-400" />
              Alertas
            </h2>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
              {alertRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 border-b border-zinc-800 py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0 lg:[&:nth-last-child(2)]:border-b"
                >
                  <dt className="text-sm text-zinc-400">{row.label}</dt>
                  <dd className={`text-base font-semibold tabular-nums ${row.value > 0 ? row.tone : "text-zinc-500"}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            {committedCostsCurrentMonth > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                Compromissos a pagar no mês: {formatCurrency(committedCostsCurrentMonth)}
              </p>
            )}
          </article>
        </aside>

        {/* Main column: what needs action this month */}
        <div className="flex min-w-0 flex-col gap-4">
          {nonCreditDueAlerts.length > 0 && (
            <article className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
                <AlertTriangle size={16} />
                Vencem em até 3 dias ou estão atrasadas
              </div>
              <ul className="divide-y divide-amber-500/20">
                {nonCreditDueAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm text-zinc-200"
                  >
                    <span className="min-w-0 truncate">
                      {alert.label}
                      <span className="text-zinc-400"> · {formatPayableDueLabel(alert)}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(alert.amount)}</span>
                  </li>
                ))}
              </ul>
            </article>
          )}

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
                <CheckCircle2 size={16} className="text-zinc-400" />
                Compromissos do mês
              </h2>
              {monthlyPayables.length > 0 && (
                <span className="text-sm text-zinc-400">
                  {paymentMetrics.paidCount} de {paymentMetrics.totalCount} pagos
                </span>
              )}
            </div>

            {monthlyPayables.length === 0 ? (
              <p className="py-6 text-sm text-zinc-500">Nenhum compromisso calculado para este mês.</p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-800">
                {monthlyPayables.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => togglePayable(item)}
                      aria-label={item.status === "paid" ? `Desmarcar ${item.label} como pago` : `Marcar ${item.label} como pago`}
                      aria-pressed={item.status === "paid"}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        item.status === "paid"
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                          : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-emerald-500 hover:text-emerald-300"
                      }`}
                    >
                      {item.status === "paid" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          item.status === "paid" ? "text-zinc-400" : "text-zinc-100"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{formatPayableDueLabel(item)}</p>
                    </div>

                    <span
                      className={`hidden shrink-0 rounded-md border px-2 py-0.5 text-xs sm:inline ${getPayableStatusClass(item)}`}
                    >
                      {getPayableStatusLabel(item)}
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-100 sm:w-28">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}
