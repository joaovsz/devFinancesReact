import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  Eye,
  EyeOff,
  Filter,
  Flame,
  RotateCcw,
  Settings2,
  Sparkles,
  TrendingDown,
  Wallet,
  X
} from "lucide-react"
import { Transaction, PaymentMethod } from "../../types/transaction"
import { defaultCategories } from "../../data/categories"
import { formatCurrency } from "../Transactions"
import { NumberTicker } from "../magic/NumberTicker"
import {
  addDaysToDateKey,
  computeSevenDaysExpenses,
  getLastSevenDaysStartDate,
  getTodayDateString,
  loadOutlierCapSettings,
  OUTLIER_CAP_STORAGE_KEY,
  OutlierCapSettings
} from "../../utils/weekly-expenses"

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Conta",
  debit: "Débito",
  pix: "Pix",
  "bank-transfer": "Transferência",
  "bank-slip": "Boleto",
  "cash-money": "Dinheiro",
  credit: "Crédito"
}

const CATEGORY_MAP = new Map(
  defaultCategories.map((cat) => [cat.id, cat.name])
)

const MANUAL_EXCLUSIONS_STORAGE_KEY = "devfinances-weekly-excluded-tx-ids"

function loadManualExclusions(): string[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const raw = window.localStorage.getItem(MANUAL_EXCLUSIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

type WeeklyDailyExpensesProps = {
  transactions: Transaction[]
  targetMonth?: string
  outlierCap?: {
    enabled: boolean
    value: number
  }
  onOpenOutlierModal?: () => void
}

export function WeeklyDailyExpenses({
  transactions,
  targetMonth,
  outlierCap: externalOutlierCap,
  onOpenOutlierModal
}: WeeklyDailyExpensesProps) {
  const todayKey = useMemo(() => getTodayDateString(), [])
  const defaultStartDate = useMemo(() => {
    if (targetMonth) {
      const todayMonth = todayKey.slice(0, 7)
      if (targetMonth === todayMonth) {
        return getLastSevenDaysStartDate(todayKey)
      }
      return `${targetMonth}-01`
    }
    return getLastSevenDaysStartDate(todayKey)
  }, [targetMonth, todayKey])

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [manuallyExcludedIds, setManuallyExcludedIds] = useState<string[]>(() =>
    loadManualExclusions()
  )

  // Internal outlier cap state used when externalOutlierCap is not provided
  const [internalOutlierCap, setInternalOutlierCap] = useState<OutlierCapSettings>(() =>
    loadOutlierCapSettings()
  )
  const [isInternalModalOpen, setIsInternalModalOpen] = useState(false)
  const [draftCapValue, setDraftCapValue] = useState("")

  const activeOutlierCap = externalOutlierCap || internalOutlierCap

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(
      MANUAL_EXCLUSIONS_STORAGE_KEY,
      JSON.stringify(manuallyExcludedIds)
    )
  }, [manuallyExcludedIds])

  // Sync with targetMonth changes if user changes month in parent
  useEffect(() => {
    if (targetMonth) {
      const todayMonth = todayKey.slice(0, 7)
      if (targetMonth === todayMonth) {
        setStartDate(getLastSevenDaysStartDate(todayKey))
      } else {
        setStartDate(`${targetMonth}-01`)
      }
    }
  }, [targetMonth, todayKey])

  const effectiveOutlierCapValue =
    activeOutlierCap && activeOutlierCap.enabled && activeOutlierCap.value > 0
      ? activeOutlierCap.value
      : null

  const weeklyData = useMemo(() => {
    return computeSevenDaysExpenses({
      transactions,
      startDateKey: startDate,
      referenceToday: todayKey,
      outlierCapValue: effectiveOutlierCapValue,
      excludedTransactionIds: manuallyExcludedIds,
      categoryId: selectedCategoryId || null
    })
  }, [
    transactions,
    startDate,
    todayKey,
    effectiveOutlierCapValue,
    manuallyExcludedIds,
    selectedCategoryId
  ])

  // List of categories that actually have expense transactions, sorted
  const availableCategories = useMemo(() => {
    const categoryIdsWithExpenses = new Set<string>()
    transactions.forEach((tx) => {
      if (tx.type === 2 && tx.categoryId) {
        categoryIdsWithExpenses.add(tx.categoryId)
      }
    })

    const categoriesList = defaultCategories
      .filter((cat) => categoryIdsWithExpenses.has(cat.id))
      .map((cat) => ({ id: cat.id, name: cat.name }))

    // Add any categories from transactions not in defaultCategories
    categoryIdsWithExpenses.forEach((catId) => {
      if (!categoriesList.some((c) => c.id === catId)) {
        categoriesList.push({ id: catId, name: catId })
      }
    })

    return categoriesList.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [transactions])

  // Selected day for inspection (defaults to today if present in window, or first day with expense, or latest day)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    if (weeklyData.isLatestSevenDays) {
      return todayKey
    }
    return weeklyData.days[weeklyData.days.length - 1].dateKey
  })

  // Keep selected day within the current window when range changes
  useEffect(() => {
    const isSelectedInWindow = weeklyData.days.some((d) => d.dateKey === selectedDateKey)
    if (!isSelectedInWindow) {
      if (weeklyData.isLatestSevenDays) {
        setSelectedDateKey(todayKey)
      } else if (weeklyData.maxDay && weeklyData.maxDay.totalExpense > 0) {
        setSelectedDateKey(weeklyData.maxDay.dateKey)
      } else {
        setSelectedDateKey(weeklyData.days[weeklyData.days.length - 1].dateKey)
      }
    }
  }, [weeklyData, selectedDateKey, todayKey])

  const selectedDayData = useMemo(() => {
    return weeklyData.days.find((d) => d.dateKey === selectedDateKey) || weeklyData.days[0]
  }, [weeklyData, selectedDateKey])

  const handlePrev7Days = () => {
    setStartDate((prev) => addDaysToDateKey(prev, -7))
  }

  const handleNext7Days = () => {
    setStartDate((prev) => addDaysToDateKey(prev, 7))
  }

  const handleResetToLatestSevenDays = () => {
    setStartDate(getLastSevenDaysStartDate(todayKey))
    setSelectedDateKey(todayKey)
  }

  const toggleExcludeTransaction = (txId: string) => {
    setManuallyExcludedIds((prev) =>
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    )
  }

  const maxEffectiveDailyExpense = useMemo(() => {
    return Math.max(...weeklyData.days.map((d) => d.discretionaryExpense), 0)
  }, [weeklyData.days])

  const maxEffectiveDay = useMemo(() => {
    return (
      weeklyData.days.find(
        (d) => d.discretionaryExpense === maxEffectiveDailyExpense && d.discretionaryExpense > 0
      ) || null
    )
  }, [weeklyData.days, maxEffectiveDailyExpense])

  const hasExclusionsInWeek = weeklyData.outlierExpensesCount > 0
  const isLatestSevenDays = weeklyData.isLatestSevenDays

  return (
    <article className="w-full max-w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      {/* Top Header & Integrated Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Gastos diários
            </h2>
            {isLatestSevenDays ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Últimos 7 dias
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResetToLatestSevenDays}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                title="Voltar para os últimos 7 dias"
              >
                <RotateCcw size={11} />
                <span>Hoje</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onOpenOutlierModal) {
                  onOpenOutlierModal()
                } else {
                  setDraftCapValue(activeOutlierCap.value ? String(activeOutlierCap.value) : "")
                  setIsInternalModalOpen(true)
                }
              }}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                activeOutlierCap?.enabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
              title="Configurar corte de gastos pontuais da média diária"
            >
              <Settings2 size={11} />
              {activeOutlierCap?.enabled
                ? `Limite: ${formatCurrency(activeOutlierCap.value)}`
                : "Limite pontual"}
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Ritmo de consumo diário nos 7 dias selecionados
          </p>
        </div>

        {/* Action Controls: Category Filter + Period Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Select */}
          <div className="relative min-w-[160px] flex-1 sm:w-auto sm:flex-none">
            <Filter size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="h-9 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 pl-7 pr-8 text-xs text-zinc-200 outline-none transition hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 sm:w-auto"
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas as categorias</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
          </div>

          {selectedCategoryId && (
            <button
              type="button"
              onClick={() => setSelectedCategoryId("")}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              title="Limpar filtro de categoria"
            >
              <X size={12} />
              <span>Limpar</span>
            </button>
          )}

          {/* 7-Day Range Navigation with Arrows */}
          <div className="inline-flex h-9 items-center rounded-xl border border-zinc-700 bg-zinc-950 p-0.5">
            <button
              type="button"
              onClick={handlePrev7Days}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 active:scale-95"
              aria-label="7 dias anteriores"
              title="7 dias anteriores"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex min-w-0 items-center gap-1.5 px-2 text-xs font-medium text-zinc-200">
              <Calendar size={13} className="shrink-0 text-zinc-400" />
              <span className="truncate">{weeklyData.rangeLabel}</span>
            </div>

            <button
              type="button"
              onClick={handleNext7Days}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 active:scale-95"
              aria-label="Próximos 7 dias"
              title="Próximos 7 dias"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Category filter active tag */}
      {selectedCategoryId && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Filtrando por:</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
            {CATEGORY_MAP.get(selectedCategoryId) || selectedCategoryId}
            <button
              type="button"
              onClick={() => setSelectedCategoryId("")}
              className="ml-1 text-indigo-300/70 hover:text-indigo-100"
              aria-label="Remover filtro"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Outlier / Exclusions notice if any are active this week */}
      {hasExclusionsInWeek && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>
              {weeklyData.outlierExpensesCount === 1
                ? "1 gasto pontual desconsiderado da média"
                : `${weeklyData.outlierExpensesCount} gastos pontuais desconsiderados da média`}{" "}
              ({formatCurrency(weeklyData.outlierWeekExpense)} fora do ritmo).
            </span>
          </div>
          {manuallyExcludedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setManuallyExcludedIds([])}
              className="text-[11px] font-medium text-emerald-400 underline hover:text-emerald-300"
            >
              Restaurar manuais
            </button>
          )}
        </div>
      )}

      {/* Stats row: Totals and Insights for the 7-day period */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Total do período */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total (7 dias)</span>
            <Wallet size={13} className="text-zinc-500" />
          </div>
          <div className="mt-1 text-lg font-semibold text-rose-300">
            <NumberTicker value={weeklyData.totalWeekExpense} format={formatCurrency} />
          </div>
          {hasExclusionsInWeek && (
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {formatCurrency(weeklyData.discretionaryWeekExpense)} recorrentes
            </p>
          )}
        </div>

        {/* Média diária */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Média diária</span>
            <TrendingDown size={13} className="text-zinc-500" />
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-200">
            <NumberTicker value={weeklyData.averageDailyExpense} format={formatCurrency} />
            <span className="text-[11px] font-normal text-zinc-500">/dia</span>
          </div>
          {hasExclusionsInWeek && (
            <p className="mt-0.5 text-[10px] text-emerald-400">
              Sem gastos pontuais
            </p>
          )}
        </div>

        {/* Pico de gasto */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Maior gasto</span>
            <Flame size={13} className="text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-200">
            {maxEffectiveDailyExpense > 0 ? (
              <>
                {formatCurrency(maxEffectiveDailyExpense)}
                {maxEffectiveDay && (
                  <span className="ml-1 text-[11px] font-normal text-zinc-400">
                    ({maxEffectiveDay.dayNameShort})
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm font-normal text-zinc-500">Nenhum</span>
            )}
          </div>
        </div>

        {/* Dias sem gastos */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dias sem gastos</span>
            <Sparkles size={13} className="text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1 text-lg font-semibold text-emerald-300">
            <span>{weeklyData.daysWithoutExpensesCount}</span>
            <span className="text-xs font-normal text-zinc-500">de 7 dias</span>
          </div>
        </div>
      </div>

      {/* 7-Day Interactive Columns Grid */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {weeklyData.days.map((day) => {
            const isSelected = day.dateKey === selectedDateKey
            const dayAmount = day.discretionaryExpense
            const percentage =
              maxEffectiveDailyExpense > 0
                ? Math.min(Math.round((dayAmount / maxEffectiveDailyExpense) * 100), 100)
                : 0

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(day.dateKey)}
                className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                  isSelected
                    ? "border-emerald-500/60 bg-zinc-950 shadow-md ring-1 ring-emerald-500/40"
                    : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-950"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isSelected ? "text-emerald-300" : "text-zinc-400"
                    }`}
                  >
                    {day.dayNameShort}
                  </span>
                  <span className="text-[11px] text-zinc-400">{day.formattedDay}</span>
                </div>

                {/* Today Badge */}
                {day.isToday && (
                  <span className="mt-1 self-start rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-medium text-emerald-300">
                    Hoje
                  </span>
                )}

                {/* Amount */}
                <div className="my-2.5">
                  <div
                    className={`text-sm font-semibold ${
                      dayAmount > 0
                        ? "text-rose-300"
                        : day.isFuture
                        ? "text-zinc-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {formatCurrency(dayAmount)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {day.count === 0
                      ? "0 gastos"
                      : day.count === 1
                      ? "1 gasto"
                      : `${day.count} gastos`}
                    {day.outlierExpense > 0 && (
                      <span className="ml-1 text-amber-400 font-medium">
                        (-{formatCurrency(day.outlierExpense)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Bar Relative to Period's Max */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    className={`h-full rounded-full transition-all ${
                      dayAmount > 0
                        ? isSelected
                          ? "bg-emerald-400"
                          : "bg-rose-400"
                        : "bg-transparent"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Transaction Breakdown Panel */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 md:p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {selectedDayData.dayNameFull}
            </span>
            <span className="text-xs text-zinc-400">
              ({selectedDayData.formattedDay})
            </span>
            {selectedDayData.isToday && (
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                Hoje
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400">
            Total do dia:{" "}
            <span
              className={`font-semibold ${
                selectedDayData.discretionaryExpense > 0 ? "text-rose-300" : "text-zinc-300"
              }`}
            >
              {formatCurrency(selectedDayData.discretionaryExpense)}
            </span>{" "}
            ({selectedDayData.count} {selectedDayData.count === 1 ? "registro" : "registros"})
            {selectedDayData.outlierExpense > 0 && (
              <span className="ml-1.5 text-zinc-500 text-[11px] font-normal">
                (+ {formatCurrency(selectedDayData.outlierExpense)} pontual desconsiderado)
              </span>
            )}
          </div>
        </div>

        {/* Transactions list with per-item exclusion toggle */}
        <div className="mt-2.5">
          <AnimatePresence mode="wait">
            {selectedDayData.transactions.length > 0 ? (
              <motion.div
                key={selectedDayData.dateKey}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                {selectedDayData.transactions.map((transaction) => {
                  const categoryName =
                    CATEGORY_MAP.get(transaction.categoryId) ||
                    transaction.categoryId ||
                    "Sem categoria"
                  const methodLabel =
                    PAYMENT_METHOD_LABELS[transaction.paymentMethod] ||
                    transaction.paymentMethod

                  const isExcluded = transaction.isExcludedFromPace

                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                        isExcluded
                          ? "border-zinc-800/40 bg-zinc-950/30 opacity-60 hover:opacity-100"
                          : "border-zinc-800/60 bg-zinc-950/60 hover:border-zinc-700/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {transaction.paymentMethod === "credit" ? (
                            <CreditCardIcon size={14} className="text-amber-400" />
                          ) : (
                            <Wallet size={14} className="text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`truncate font-medium ${
                                isExcluded
                                  ? "text-zinc-400 line-through"
                                  : "text-zinc-200"
                              }`}
                            >
                              {transaction.label}
                            </p>
                            {transaction.isOutlier && (
                              <span className="shrink-0 rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-medium text-amber-300">
                                Pontual
                              </span>
                            )}
                            {transaction.isManuallyExcluded && (
                              <span className="shrink-0 rounded bg-zinc-800 px-1 py-0.2 text-[9px] font-medium text-zinc-400">
                                Desconsiderado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <span>{categoryName}</span>
                            <span>•</span>
                            <span className="rounded bg-zinc-800/80 px-1 py-0.2 text-[10px] text-zinc-300">
                              {methodLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <span
                          className={`font-semibold ${
                            isExcluded ? "text-zinc-400" : "text-rose-300"
                          }`}
                        >
                          - {formatCurrency(transaction.value)}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleExcludeTransaction(transaction.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition ${
                            isExcluded
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                          title={
                            isExcluded
                              ? "Incluir novamente no cálculo da média"
                              : "Desconsiderar gasto do cálculo da média"
                          }
                          aria-label={
                            isExcluded
                              ? "Incluir no cálculo da média"
                              : "Desconsiderar do cálculo da média"
                          }
                        >
                          {isExcluded ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            ) : (
              <motion.div
                key={`${selectedDayData.dateKey}-empty`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 py-4 text-xs text-zinc-400"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <Sparkles size={15} />
                </div>
                <div>
                  <p className="text-zinc-300 font-medium">Nenhum gasto registrado neste dia</p>
                  <p className="text-zinc-400 text-[11px]">
                    {selectedCategoryId
                      ? "Nenhuma despesa para a categoria filtrada nesta data."
                      : selectedDayData.isFuture
                      ? "Data futura dentro do período de 7 dias selecionado."
                      : "Excelente para a manutenção do orçamento!"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Internal Outlier Cap Modal when parent does not supply one */}
      {isInternalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsInternalModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Sobra por gasto diário</h3>
              <button
                type="button"
                onClick={() => setIsInternalModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs leading-snug text-zinc-400">
              Compras pontuais e não recorrentes (aluguel, uma compra grande) podem inflar sua média
              de gasto diário e distorcer a projeção. Ative essa opção e informe um
              valor de limite: qualquer transação igual ou acima dele é ignorada no cálculo da
              média diária.
            </p>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <span className="text-sm text-zinc-200">Ativar limite de gasto</span>
              <button
                type="button"
                role="switch"
                aria-checked={internalOutlierCap.enabled}
                onClick={() =>
                  setInternalOutlierCap((current) => ({ ...current, enabled: !current.enabled }))
                }
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  internalOutlierCap.enabled ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    internalOutlierCap.enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </label>

            <div className="mt-3">
              <label className="mb-1 block text-xs text-zinc-400">
                Considerar como gasto pontual a partir de
              </label>
              <input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                disabled={!internalOutlierCap.enabled}
                value={draftCapValue}
                onChange={(event) => setDraftCapValue(event.target.value)}
                placeholder="Ex.: 500"
                className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInternalModalOpen(false)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const parsedValue = Number(draftCapValue.replace(",", "."))
                  const updated: OutlierCapSettings = {
                    enabled: internalOutlierCap.enabled,
                    value: Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
                  }
                  setInternalOutlierCap(updated)
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(OUTLIER_CAP_STORAGE_KEY, JSON.stringify(updated))
                  }
                  setIsInternalModalOpen(false)
                }}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
