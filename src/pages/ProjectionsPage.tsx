import { useEffect, useMemo, useState } from "react"
import ReactEChartsCore from "echarts-for-react/lib/core"
import type { EChartsOption } from "echarts"
import { echarts } from "../utils/echarts"
import { NumberTicker } from "../components/magic/NumberTicker"
import { formatCurrency } from "../components/Transactions"
import { DismissibleInfoCard } from "../components/ui/DismissibleInfoCard"
import { useTransactionStore } from "../store/useTransactionStore"
import { fetchBrazilHolidaysByYear } from "../services/calendar"
import { getWorkingMonthMetrics } from "../utils/business-days"
import {
  addMonths,
  buildProjectionTimeline,
  getCurrentMonthKey,
  getMonthLabel,
  getAverageMonthlyLeftover
} from "../utils/projections"

export const ProjectionsPage = () => {
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const [targetMonth, setTargetMonth] = useState(getCurrentMonthKey())
  const [holidaysByYear, setHolidaysByYear] = useState<Record<number, string[]>>({})
  const [calendarError, setCalendarError] = useState("")

  const monthKeys = useMemo(
    () => Array.from({ length: 12 }).map((_, index) => addMonths(targetMonth, index)),
    [targetMonth]
  )
  const yearsInScope = useMemo(
    () =>
      Array.from(new Set(monthKeys.map((monthKey) => Number(monthKey.split("-")[0])))),
    [monthKeys]
  )

  useEffect(() => {
    let ignore = false

    if (!contractConfig.useHolidayApi) {
      setHolidaysByYear({})
      setCalendarError("")
      return () => {
        ignore = true
      }
    }

    async function loadHolidays() {
      try {
        const entries = await Promise.all(
          yearsInScope.map(async (year) => {
            const holidays = await fetchBrazilHolidaysByYear(year)
            return [year, holidays.map((holiday) => holiday.date)] as const
          })
        )
        if (!ignore) {
          setHolidaysByYear(Object.fromEntries(entries))
          setCalendarError("")
        }
      } catch {
        if (!ignore) {
          setHolidaysByYear({})
          setCalendarError("Falha ao consultar API de feriados. Cálculo local ativo.")
        }
      }
    }

    loadHolidays()

    return () => {
      ignore = true
    }
  }, [contractConfig.useHolidayApi, yearsInScope])

  const monthlyWorkMetrics = useMemo(
    () =>
      monthKeys.map((monthKey) => {
        const year = Number(monthKey.split("-")[0])
        const holidaysForMonth =
          (holidaysByYear[year] || [])
            .filter((date) => date.startsWith(monthKey))
            .map((date) => ({ date, name: "Feriado" })) || []

        return getWorkingMonthMetrics({
          monthKey,
          holidays: holidaysForMonth,
          hoursPerWorkday: contractConfig.hoursPerWorkday,
          hourlyRate: contractConfig.hourlyRate
        })
      }),
    [
      monthKeys,
      holidaysByYear,
      contractConfig.hoursPerWorkday,
      contractConfig.hourlyRate
    ]
  )

  const projectedRevenueByMonth = useMemo(
    () =>
      Object.fromEntries(
        monthlyWorkMetrics.map((metrics) => [
          metrics.monthKey,
          contractConfig.incomeMode === "pj"
            ? metrics.projectedRevenue
            : contractConfig.cltNetSalary
        ])
      ),
    [monthlyWorkMetrics, contractConfig.incomeMode, contractConfig.cltNetSalary]
  )

  const timeline = useMemo(
    () =>
      buildProjectionTimeline({
        transactions,
        fixedCosts,
        installmentPlans,
        targetMonth,
        monthsForward: 12,
        projectedRevenueByMonth
      }),
    [
      transactions,
      fixedCosts,
      installmentPlans,
      targetMonth,
      projectedRevenueByMonth
    ]
  )

  const firstMonth = timeline[0]
  const firstMonthWork = monthlyWorkMetrics[0]
  const monthlyAverage = useMemo(
    () => getAverageMonthlyLeftover(transactions, targetMonth, 3),
    [transactions, targetMonth]
  )
  const projectedYearTotal = useMemo(
    () => timeline.reduce((sum, item) => sum + item.projectedLeftover, 0),
    [timeline]
  )

  const chartOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: "transparent",
      color: ["#a3e635", "#f59e0b", "#22d3ee", "#f97316", "#60a5fa"],
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => formatCurrency(Number(value || 0))
      },
      legend: {
        top: 0,
        textStyle: { color: "#a1a1aa", fontSize: 12 }
      },
      grid: {
        left: 16,
        right: 16,
        top: 48,
        bottom: 16,
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: timeline.map((item) => getMonthLabel(item.monthKey)),
        axisLabel: { color: "#a1a1aa", fontSize: 11 },
        axisLine: { lineStyle: { color: "#3f3f46" } }
      },
      yAxis: [
        {
          type: "value",
          axisLabel: {
            color: "#a1a1aa",
            formatter: (value: number) => `R$ ${Math.round(value).toLocaleString("pt-BR")}`
          },
          splitLine: { lineStyle: { color: "#27272a" } }
        },
        {
          type: "value",
          axisLabel: {
            color: "#a1a1aa",
            formatter: (value: number) => `R$ ${Math.round(value).toLocaleString("pt-BR")}`
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "Sobra base",
          type: "line",
          smooth: true,
          data: timeline.map((item) => item.monthlyLeftover),
          lineStyle: { width: 2, type: "dashed" },
          symbolSize: 7
        },
        {
          name: "Compromissos",
          type: "line",
          smooth: true,
          data: timeline.map((item) => item.committedCosts),
          lineStyle: { width: 2 },
          symbolSize: 7
        },
        {
          name: contractConfig.incomeMode === "pj" ? "Receita PJ" : "Receita CLT",
          type: "line",
          smooth: true,
          data: timeline.map((item) => item.projectedRevenue),
          lineStyle: { width: 2 },
          symbolSize: 6
        },
        {
          name: "Sobra projetada",
          type: "line",
          smooth: true,
          data: timeline.map((item) => item.projectedLeftover),
          areaStyle: { opacity: 0.15 },
          lineStyle: { width: 3 },
          symbolSize: 7
        },
        {
          name: "Saldo acumulado",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: timeline.map((item) => item.cumulativeBalance),
          lineStyle: { width: 2 },
          symbolSize: 6
        }
      ]
    }),
    [timeline, contractConfig.incomeMode]
  )

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <DismissibleInfoCard
        storageKey="info-card-projections"
        title="Como usar Projeções"
        description="Projeções simulam os próximos meses com base no histórico e no planejamento."
        items={[
          "Selecione o mês inicial para recalcular a janela de 12 meses.",
          "Veja compromissos, receita projetada e saldo acumulado no gráfico.",
          "Funciona para PJ e CLT, respeitando o modo de renda configurado no planejamento."
        ]}
      />
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Projeções</h1>
          <p className="text-sm text-zinc-400">
            Evolução mensal baseada nas sobras reais das transações e nos compromissos do Planejamento.
          </p>
        </div>
        <input
          className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
          type="month"
          value={targetMonth}
          onChange={(event) => setTargetMonth(event.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Sobra projetada (mês)</div>
          <NumberTicker
            className={`mt-1 text-xl font-semibold ${
              (firstMonth?.projectedLeftover || 0) >= 0 ? "text-emerald-300" : "text-amber-300"
            }`}
            value={firstMonth?.projectedLeftover || 0}
            format={formatCurrency}
          />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Compromissos (mês)</div>
          <NumberTicker className="mt-1 text-xl font-semibold text-zinc-100" value={firstMonth?.committedCosts || 0} format={formatCurrency} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            {contractConfig.incomeMode === "pj" ? "Receita PJ (mês)" : "Receita CLT (mês)"}
          </div>
          <NumberTicker className="mt-1 text-xl font-semibold text-zinc-100" value={firstMonth?.projectedRevenue || 0} format={formatCurrency} />
          <p className="mt-1 text-xs text-zinc-500">
            {contractConfig.incomeMode === "pj"
              ? `${firstMonthWork?.businessDays || 0} dias úteis · ${firstMonthWork?.workableHours || 0}h`
              : `Salário líquido mensal: ${formatCurrency(contractConfig.cltNetSalary)}`}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Resultado 12 meses</div>
          <NumberTicker className={`mt-1 text-xl font-semibold ${projectedYearTotal >= 0 ? "text-emerald-300" : "text-amber-300"}`} value={projectedYearTotal} format={formatCurrency} />
          <p className="mt-1 text-xs text-zinc-500">
            Média sobras base: {formatCurrency(monthlyAverage)}
          </p>
        </div>
      </div>

      {calendarError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {calendarError}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Evolução mensal (linha)</h2>
        <ReactEChartsCore
          echarts={echarts}
          option={chartOption}
          style={{ height: 380, width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>
    </section>
  )
}
