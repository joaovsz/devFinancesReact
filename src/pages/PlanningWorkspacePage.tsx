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
  getExpectedIncomeForMonth,
  getCurrentMonthKey,
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
    if (currentMonth !== getCurrentMonthKey()) {
      return []
    }

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
    const monthLabel = new Date(`${item.monthKey}-01T00:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric"
    })

    if (!item.dueDate) {
      return `sem vencimento definido · ${monthLabel}`
    }

    const [year, month, day] = item.dueDate.split("-")
    return `vence em ${day}/${month}/${year} · ${monthLabel}`
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
              Saídas do mês
            </div>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              {formatCurrency(operationalCostsCurrentMonth)}
            </p>
            {goalsMonthlyContribution > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Inclui {formatCurrency(goalsMonthlyContribution)} de metas
              </p>
            )}
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

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">
              Saúde de quitação
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Acompanha contas do mês que ainda faltam pagar e o progresso já quitado.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">% pago por valor</div>
            <div className="text-lg font-semibold text-zinc-100">
              {paymentMetrics.paidAmountPercentage.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Contas do mês</div>
            <p className="mt-1 text-base font-semibold text-zinc-100">{paymentMetrics.totalCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Pagas</div>
            <p className="mt-1 text-base font-semibold text-emerald-300">
              {formatCurrency(paymentMetrics.paidAmount)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {paymentMetrics.paidCount}/{paymentMetrics.totalCount} itens
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Não pagas</div>
            <p className="mt-1 text-base font-semibold text-amber-300">
              {formatCurrency(paymentMetrics.unpaidAmount)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {paymentMetrics.unpaidCount} itens pendentes
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">% pago por quantidade</div>
            <p className="mt-1 text-base font-semibold text-zinc-100">
              {paymentMetrics.paidCountPercentage.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${Math.min(paymentMetrics.paidAmountPercentage, 100)}%` }}
          />
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

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Clock3 size={16} />
            Alertas operacionais
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Atrasadas</div>
              <p className="mt-1 text-base font-semibold text-rose-300">
                {paymentAlerts.overdue.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Vencem em breve</div>
              <p className="mt-1 text-base font-semibold text-amber-300">
                {paymentAlerts.dueSoon.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Faturas pendentes</div>
              <p className="mt-1 text-base font-semibold text-zinc-100">
                {paymentAlerts.pendingInvoices.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Despesas pendentes</div>
              <p className="mt-1 text-base font-semibold text-zinc-100">
                {paymentAlerts.pendingFixedCosts.length + paymentAlerts.pendingInstallments.length}
              </p>
            </div>
          </div>
          {committedCostsCurrentMonth > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              Compromissos a pagar do mês: {formatCurrency(committedCostsCurrentMonth)}
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <CheckCircle2 size={16} />
            Compromissos do mês
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {monthlyPayables.length === 0 && (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
                Nenhum compromisso calculado para este mês.
              </p>
            )}
            {monthlyPayables.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-100">{item.label}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{formatCurrency(item.amount)}</span>
                    <span>{formatPayableDueLabel(item)}</span>
                    <span className={`rounded-md border px-2 py-0.5 ${getPayableStatusClass(item)}`}>
                      {getPayableStatusLabel(item)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePayable(item)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    item.status === "paid"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                  }`}
                >
                  {item.status === "paid" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  { item.status === "paid"
                      ? "Desmarcar pago"
                      : "Marcar pago"}
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

    </section>
  )
}
