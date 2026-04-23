import { SelectHTMLAttributes, useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import ReactEChartsCore from "echarts-for-react/lib/core"
import type { EChartsOption } from "echarts"
import { echarts } from "../utils/echarts"
import { NumberTicker } from "../components/magic/NumberTicker"
import { formatCurrency } from "../components/Transactions"
import { DismissibleInfoCard } from "../components/ui/DismissibleInfoCard"
import { useTransactionStore } from "../store/useTransactionStore"
import { selectTotalMonthlyContribution, useGoalStore } from "../store/useGoalStore"
import { fetchBrazilHolidaysByYear } from "../services/calendar"
import { getWorkingMonthMetrics } from "../utils/business-days"
import {
  addMonths,
  buildProjectionTimeline,
  getCltProjectedRevenueForMonth,
  getCurrentMonthKey,
  getMonthLabel,
  getPjProjectedRevenueForMonth
} from "../utils/projections"

const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${selectClassName} ${props.className || ""}`.trim()} />
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
    </div>
  )
}

type ProjectionsPageProps = {
  embedded?: boolean
}

export const ProjectionsPage = ({ embedded = false }: ProjectionsPageProps) => {
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const goalsMonthlyContribution = useGoalStore(selectTotalMonthlyContribution)
  const [targetMonth, setTargetMonth] = useState(getCurrentMonthKey())
  const [visibleMonths, setVisibleMonths] = useState(6)
  const [isMobile, setIsMobile] = useState(false)
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
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)")
    const updateMode = () => {
      const mobile = mediaQuery.matches
      setIsMobile(mobile)
    }

    updateMode()
    mediaQuery.addEventListener("change", updateMode)

    return () => {
      mediaQuery.removeEventListener("change", updateMode)
    }
  }, [])

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
            ? getPjProjectedRevenueForMonth({
                contractConfig,
                monthKey: metrics.monthKey,
                holidays:
                  (holidaysByYear[Number(metrics.monthKey.split("-")[0])] || [])
                    .filter((date) => date.startsWith(metrics.monthKey))
                    .map((date) => ({ date, name: "Feriado" }))
              })
            : getCltProjectedRevenueForMonth(contractConfig, metrics.monthKey)
        ])
      ),
    [monthlyWorkMetrics, contractConfig, holidaysByYear]
  )

  const timeline = useMemo(
    () =>
      buildProjectionTimeline({
        cards,
        transactions,
        fixedCosts,
        installmentPlans,
        goalsMonthlyContribution,
        targetMonth,
        monthsForward: 12,
        projectedRevenueByMonth
      }),
    [
      cards,
      transactions,
      fixedCosts,
      installmentPlans,
      goalsMonthlyContribution,
      targetMonth,
      projectedRevenueByMonth
    ]
  )

  const firstMonth = timeline[0]
  const firstMonthWork = monthlyWorkMetrics[0]
  const projectedYearTotal = useMemo(
    () => timeline.reduce((sum, item) => sum + item.projectedLeftover, 0),
    [timeline]
  )
  const visibleTimeline = useMemo(
    () => timeline.slice(0, visibleMonths),
    [timeline, visibleMonths]
  )
  const installmentDropInsight = useMemo(() => {
    let bestDrop = 0
    let bestMonthKey = ""

    for (let index = 1; index < timeline.length; index += 1) {
      const previous = timeline[index - 1]
      const current = timeline[index]
      const drop = previous.installmentsTotal - current.installmentsTotal
      if (drop > bestDrop) {
        bestDrop = drop
        bestMonthKey = current.monthKey
      }
    }

    if (bestDrop <= 0 || !bestMonthKey) {
      return null
    }

    return {
      monthKey: bestMonthKey,
      dropAmount: bestDrop
    }
  }, [timeline])
  const commitmentsPressureInsight = useMemo(() => {
    const monthsWithRevenue = timeline.filter((item) => item.projectedRevenue > 0)
    if (monthsWithRevenue.length === 0) {
      return null
    }

    const averageRatio =
      monthsWithRevenue.reduce(
        (sum, item) => sum + item.committedCosts / item.projectedRevenue,
        0
      ) / monthsWithRevenue.length

    const peak = monthsWithRevenue.reduce((currentMax, item) => {
      const ratio = item.committedCosts / item.projectedRevenue
      if (!currentMax || ratio > currentMax.ratio) {
        return {
          monthKey: item.monthKey,
          ratio
        }
      }

      return currentMax
    }, null as { monthKey: string; ratio: number } | null)

    return {
      averageRatio,
      peak
    }
  }, [timeline])

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
        data: visibleTimeline.map((item) => getMonthLabel(item.monthKey)),
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
          name: "Compromissos",
          type: "line",
          smooth: true,
          data: visibleTimeline.map((item) => item.committedCosts),
          lineStyle: { width: 2 },
          symbolSize: 7
        },
        {
          name: contractConfig.incomeMode === "pj" ? "Receita PJ" : "Receita CLT",
          type: "line",
          smooth: true,
          data: visibleTimeline.map((item) => item.projectedRevenue),
          lineStyle: { width: 2 },
          symbolSize: 6
        },
        {
          name: "Sobra do mês (estimada)",
          type: "line",
          smooth: true,
          data: visibleTimeline.map((item) => item.projectedLeftover),
          areaStyle: { opacity: 0.15 },
          lineStyle: { width: 3 },
          symbolSize: 7
        },
        {
          name: "Saldo acumulado",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: visibleTimeline.map((item) => item.cumulativeBalance),
          lineStyle: { width: 2 },
          symbolSize: 6
        }
      ]
    }),
    [visibleTimeline, contractConfig.incomeMode]
  )

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 md:gap-5 md:p-5">
      {!embedded && (
        <DismissibleInfoCard
          storageKey="info-card-projections"
          title="Como usar Projeções"
          description="Projeções simulam os próximos meses com base no histórico e no planejamento."
          items={[
            "Selecione o mês inicial para recalcular a janela de 12 meses.",
            "Veja compromissos (incluindo aportes de metas), receita projetada e saldo acumulado no gráfico.",
            "Funciona para PJ e CLT, respeitando o modo de renda configurado no planejamento."
          ]}
        />
      )}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        {!embedded && (
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Projeções</h1>
            <p className="text-sm text-zinc-400">
              Evolução mensal baseada nas sobras reais das transações e nos compromissos do Planejamento.
            </p>
          </div>
        )}
        <input
          className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
          type="month"
          value={targetMonth}
          onChange={(event) => setTargetMonth(event.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Sobra do mês (estimada)</div>
          <NumberTicker
            className={`mt-1 text-xl font-semibold ${
              (firstMonth?.projectedLeftover || 0) >= 0 ? "text-emerald-300" : "text-amber-300"
            }`}
            value={firstMonth?.projectedLeftover || 0}
            format={formatCurrency}
          />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Compromissos (mês)</div>
          <NumberTicker className="mt-1 text-xl font-semibold text-zinc-100" value={firstMonth?.committedCosts || 0} format={formatCurrency} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Resultado 12 meses</div>
          <NumberTicker className={`mt-1 text-xl font-semibold ${projectedYearTotal >= 0 ? "text-emerald-300" : "text-amber-300"}`} value={projectedYearTotal} format={formatCurrency} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Virada dos parcelamentos</div>
          {installmentDropInsight ? (
            <p className="mt-1 text-sm text-zinc-200">
              A partir de{" "}
              <span className="font-semibold text-zinc-100">
                {getMonthLabel(installmentDropInsight.monthKey)}
              </span>
              , seus parcelamentos caem{" "}
              <span className="font-semibold text-emerald-300">
                {formatCurrency(installmentDropInsight.dropAmount)}/mês
              </span>
              .
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Não há queda relevante de parcelamentos no horizonte atual.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Pressão de compromissos</div>
          {commitmentsPressureInsight ? (
            <p className="mt-1 text-sm text-zinc-200">
              Em média, compromissos consomem{" "}
              <span className="font-semibold text-zinc-100">
                {(commitmentsPressureInsight.averageRatio * 100).toFixed(1)}%
              </span>{" "}
              da receita projetada. Pico em{" "}
              <span className="font-semibold text-zinc-100">
                {commitmentsPressureInsight.peak
                  ? getMonthLabel(commitmentsPressureInsight.peak.monthKey)
                  : "-"}
              </span>{" "}
              com{" "}
              <span className="font-semibold text-amber-300">
                {commitmentsPressureInsight.peak
                  ? (commitmentsPressureInsight.peak.ratio * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
              .
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Sem receita projetada para calcular pressão no período.
            </p>
          )}
        </div>
      </div>

      {calendarError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {calendarError}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">
            Evolução mensal ({isMobile ? "tabela" : "gráfico"})
          </h2>
          <div className="grid grid-cols-1 gap-2 md:flex">
            <SelectField
              className="h-9 py-2 text-xs"
              value={String(visibleMonths)}
              onChange={(event) => setVisibleMonths(Number(event.target.value))}
            >
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </SelectField>
          </div>
        </div>
        {!isMobile ? (
          <ReactEChartsCore
            echarts={echarts}
            option={chartOption}
            style={{ height: 280, width: "100%" }}
            notMerge
            lazyUpdate
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-5 border-b border-zinc-800 px-2 py-2 text-[11px] uppercase tracking-wide text-zinc-400">
                <span>Mês</span>
                <span>Compromissos</span>
                <span>Receita</span>
                <span>Sobra proj.</span>
                <span>Saldo acum.</span>
              </div>
              {visibleTimeline.map((item) => (
                <div
                  key={item.monthKey}
                  className="grid grid-cols-5 border-b border-zinc-800/70 px-2 py-2 text-xs text-zinc-200 last:border-b-0"
                >
                  <span>{getMonthLabel(item.monthKey)}</span>
                  <span>{formatCurrency(item.committedCosts)}</span>
                  <span>{formatCurrency(item.projectedRevenue)}</span>
                  <span>{formatCurrency(item.projectedLeftover)}</span>
                  <span>{formatCurrency(item.cumulativeBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
