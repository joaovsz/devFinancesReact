import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Settings2,
  X
} from "lucide-react"
import { Transaction, PaymentMethod } from "../../types/transaction"
import { CreditCard } from "../../types/card"
import { defaultCategories } from "../../data/categories"
import { formatCurrency } from "../Transactions"
import { NumberTicker } from "../magic/NumberTicker"
import {
  computeMonthToDateExpenses,
  computeMonthWeekExpenses,
  formatCycleStartLabel,
  getCycleWeeks,
  getExpenseCycle,
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

// Day breakdown shows 5 rows collapsed; expanded, 10 rows fit before the list scrolls
const COLLAPSED_DAY_EXPENSES = 5
const MAX_VISIBLE_DAY_EXPENSES = 10
const VISIBLE_DAYS = 4

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
  cards?: CreditCard[]
  targetMonth?: string
  outlierCap?: {
    enabled: boolean
    value: number
  }
  onOpenOutlierModal?: () => void
}

export function WeeklyDailyExpenses({
  transactions,
  cards = [],
  targetMonth,
  outlierCap: externalOutlierCap,
  onOpenOutlierModal
}: WeeklyDailyExpensesProps) {
  const todayKey = useMemo(() => getTodayDateString(), [])
  const currentMonthKey = useMemo(() => todayKey.slice(0, 7), [todayKey])
  const activeMonthKey = targetMonth || currentMonthKey

  // Apenas cartoes com compras definem o ciclo, para cartoes parados nao deslocarem o inicio.
  const cycleCards = useMemo(() => {
    const usedCardIds = new Set(
      transactions
        .filter((tx) => tx.paymentMethod === "credit" && tx.cardId)
        .map((tx) => tx.cardId)
    )
    return cards.filter((card) => usedCardIds.has(card.id))
  }, [cards, transactions])

  const cycle = useMemo(
    () => getExpenseCycle(activeMonthKey, cycleCards),
    [activeMonthKey, cycleCards]
  )
  const weeks = useMemo(() => getCycleWeeks(cycle), [cycle])
  const isTodayInCycle = todayKey >= cycle.startDateKey && todayKey <= cycle.endDateKey
  const todayWeekNumber = useMemo(
    () =>
      weeks.find((w) => todayKey >= w.startDateKey && todayKey <= w.endDateKey)?.weekNumber ?? 1,
    [weeks, todayKey]
  )
  const cycleStartLabel = formatCycleStartLabel(cycle)

  const initialWeekNumber = todayWeekNumber

  const [activeWeekNumber, setActiveWeekNumber] = useState<number>(initialWeekNumber)
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

  // Sync active week when month changes
  useEffect(() => {
    setActiveWeekNumber(todayWeekNumber)
  }, [todayWeekNumber])

  // Ensure activeWeekNumber is within bounds of available weeks
  useEffect(() => {
    if (activeWeekNumber > weeks.length) {
      setActiveWeekNumber(weeks.length)
    } else if (activeWeekNumber < 1) {
      setActiveWeekNumber(1)
    }
  }, [weeks, activeWeekNumber])

  const effectiveOutlierCapValue =
    activeOutlierCap && activeOutlierCap.enabled && activeOutlierCap.value > 0
      ? activeOutlierCap.value
      : null

  const weekData = useMemo(() => {
    return computeMonthWeekExpenses({
      transactions,
      monthKey: activeMonthKey,
      weekNumber: activeWeekNumber,
      cards: cycleCards,
      referenceToday: todayKey,
      outlierCapValue: effectiveOutlierCapValue,
      excludedTransactionIds: manuallyExcludedIds,
    })
  }, [
    transactions,
    activeMonthKey,
    activeWeekNumber,
    cycleCards,
    todayKey,
    effectiveOutlierCapValue,
    manuallyExcludedIds
  ])

  const monthToDateData = useMemo(() => {
    return computeMonthToDateExpenses({
      transactions,
      monthKey: activeMonthKey,
      cards: cycleCards,
      referenceToday: todayKey,
      outlierCapValue: effectiveOutlierCapValue,
      excludedTransactionIds: manuallyExcludedIds,
    })
  }, [
    transactions,
    activeMonthKey,
    cycleCards,
    todayKey,
    effectiveOutlierCapValue,
    manuallyExcludedIds
  ])

  // Selected day for inspection (defaults to today if present in window, or first day with expense, or latest day)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const todayInWeek = weekData.days.find((d) => d.dateKey === todayKey)
    if (todayInWeek) {
      return todayKey
    }
    if (weekData.maxDay && weekData.maxDay.totalExpense > 0) {
      return weekData.maxDay.dateKey
    }
    return weekData.days[0]?.dateKey || todayKey
  })

  // Keep selected day within the current window when week changes
  useEffect(() => {
    const isSelectedInWindow = weekData.days.some((d) => d.dateKey === selectedDateKey)
    if (!isSelectedInWindow) {
      const todayInWeek = weekData.days.find((d) => d.dateKey === todayKey)
      if (todayInWeek) {
        setSelectedDateKey(todayKey)
      } else if (weekData.maxDay && weekData.maxDay.totalExpense > 0) {
        setSelectedDateKey(weekData.maxDay.dateKey)
      } else {
        setSelectedDateKey(weekData.days[0]?.dateKey || todayKey)
      }
    }
  }, [weekData, selectedDateKey, todayKey])

  const selectedDayIndex = weekData.days.findIndex((d) => d.dateKey === selectedDateKey)
  const maxDayWindowStart = Math.max(weekData.days.length - VISIBLE_DAYS, 0)
  // 4-day window derived from the selection: keeps the previous day in view for context
  const dayWindowStart = Math.min(Math.max(selectedDayIndex - 1, 0), maxDayWindowStart)

  // Arrows move the selection; the window above follows it
  const selectAdjacentDay = (direction: -1 | 1) => {
    const nextDay = weekData.days[selectedDayIndex + direction]
    if (nextDay) {
      setSelectedDateKey(nextDay.dateKey)
    }
  }

  const visibleDays = weekData.days.slice(dayWindowStart, dayWindowStart + VISIBLE_DAYS)

  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null)
  const isDayListExpanded = expandedDateKey === selectedDateKey

  const selectedDayData = useMemo(() => {
    return weekData.days.find((d) => d.dateKey === selectedDateKey) || weekData.days[0]
  }, [weekData, selectedDateKey])

  const canGoPrevWeek = activeWeekNumber > 1
  const canGoNextWeek = activeWeekNumber < weeks.length

  const handlePrevWeek = () => {
    if (canGoPrevWeek) {
      setActiveWeekNumber((prev) => prev - 1)
    }
  }

  const handleNextWeek = () => {
    if (canGoNextWeek) {
      setActiveWeekNumber((prev) => prev + 1)
    }
  }

  const handleResetToCurrentWeek = () => {
    setActiveWeekNumber(todayWeekNumber)
    if (isTodayInCycle) {
      setSelectedDateKey(todayKey)
    }
  }

  const toggleExcludeTransaction = (txId: string) => {
    setManuallyExcludedIds((prev) =>
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    )
  }

  const maxEffectiveDailyExpense = useMemo(() => {
    return Math.max(...weekData.days.map((d) => d.discretionaryExpense), 0)
  }, [weekData.days])

  const hasExclusionsInWeek = weekData.outlierExpensesCount > 0
  const isCurrentWeek = weekData.isCurrentWeek

  return (
    <article className="w-full max-w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 pt-2 lg:pt-0 text-base font-semibold text-zinc-100">Gastos diários</h2>
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
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition lg:hidden ${
              activeOutlierCap?.enabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
            }`}
            aria-label="Configurar limite de gasto pontual"
          >
            <Settings2 size={14} />
            {activeOutlierCap?.enabled ? formatCurrency(activeOutlierCap.value) : "Limite"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
          <div className="flex h-10 items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950 p-0.5">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={!canGoPrevWeek}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
              aria-label="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex min-w-0 items-center gap-1.5 px-2 text-sm font-medium text-zinc-200">
              <span className="truncate">
                Semana {weekData.week.weekNumber} · {weekData.week.shortLabel}
              </span>
              {isTodayInCycle && isCurrentWeek && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-label="Semana atual" />
              )}
            </div>
            <button
              type="button"
              onClick={handleNextWeek}
              disabled={!canGoNextWeek}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
              aria-label="Próxima semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            {isTodayInCycle && !isCurrentWeek && (
              <button
                type="button"
                onClick={handleResetToCurrentWeek}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
              >
                <RotateCcw size={13} />
                Hoje
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
              className={`hidden h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition lg:inline-flex ${
                activeOutlierCap?.enabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
              title="Configurar corte de gastos pontuais da média diária"
            >
              <Settings2 size={13} />
              {activeOutlierCap?.enabled
                ? `Limite: ${formatCurrency(activeOutlierCap.value)}`
                : "Limite pontual"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <dl className="grid grid-cols-2 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="flex min-w-0 flex-col justify-center p-3 sm:p-4">
            <dt className="text-xs text-zinc-400">Média por dia</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
              <NumberTicker value={monthToDateData.averageDailyExpense} format={formatCurrency} />
            </dd>
            <dd className="mt-0.5 text-xs text-zinc-500">
              desde {cycleStartLabel} · {monthToDateData.daysElapsed}{" "}
              {monthToDateData.daysElapsed === 1 ? "dia" : "dias"}
            </dd>
          </div>

          <div className="flex min-w-0 flex-col justify-center p-3 sm:p-4">
            <dt className="text-xs text-zinc-400">Total da semana</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-rose-300">
              <NumberTicker value={weekData.totalWeekExpense} format={formatCurrency} />
            </dd>
            <dd className="mt-0.5 text-xs text-zinc-500">
              {hasExclusionsInWeek ? (
                <>
                  {formatCurrency(weekData.outlierWeekExpense)} pontual fora da média
                  {manuallyExcludedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setManuallyExcludedIds([])}
                      className="ml-1.5 font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                    >
                      Restaurar
                    </button>
                  )}
                </>
              ) : (
                `${weekData.days.reduce((acc, d) => acc + d.count, 0)} lançamentos`
              )}
            </dd>
          </div>
        </dl>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {weekData.days.length > VISIBLE_DAYS
                ? `Dias ${dayWindowStart + 1}–${dayWindowStart + visibleDays.length} de ${weekData.days.length}`
                : "Dias"}
            </span>
            {weekData.days.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => selectAdjacentDay(-1)}
                  disabled={selectedDayIndex <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Dia anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => selectAdjacentDay(1)}
                  disabled={selectedDayIndex >= weekData.days.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Próximo dia"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {visibleDays.map((day) => {
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
                  aria-pressed={isSelected}
                  className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2 text-left transition sm:p-3 ${
                    isSelected
                      ? "border-emerald-500/60 bg-zinc-950 ring-1 ring-emerald-500/30"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-950"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-1">
                    <span
                      className={`text-sm font-semibold ${
                        day.isToday ? "text-emerald-300" : isSelected ? "text-zinc-100" : "text-zinc-400"
                      }`}
                    >
                      {day.isToday ? "Hoje" : day.dayNameShort}
                    </span>
                    <span className="text-[11px] tabular-nums text-zinc-500">{day.formattedDay}</span>
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`truncate text-xs font-semibold tabular-nums sm:text-sm ${
                        dayAmount > 0 ? "text-rose-300" : "text-zinc-500"
                      }`}
                    >
                      {formatCurrency(dayAmount)}
                    </div>
                    <div className="truncate text-[11px] text-zinc-500 sm:text-xs">
                      {day.count === 1 ? "1 gasto" : `${day.count} gastos`}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none ${
                        isSelected ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                      style={{ transform: `scaleX(${percentage / 100})` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected day breakdown */}
      <div className="mt-4 border-t border-zinc-800 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-zinc-200">
            {selectedDayData.dayNameFull}, {selectedDayData.formattedDay}
            {selectedDayData.isToday && <span className="ml-1.5 text-xs text-emerald-300">hoje</span>}
          </p>
          <p
            className={`shrink-0 text-sm font-semibold tabular-nums ${
              selectedDayData.discretionaryExpense > 0 ? "text-rose-300" : "text-zinc-400"
            }`}
          >
            {formatCurrency(selectedDayData.discretionaryExpense)}
          </p>
        </div>
        {selectedDayData.outlierExpense > 0 && (
          <p className="mt-0.5 text-xs text-zinc-500">
            + {formatCurrency(selectedDayData.outlierExpense)} pontual fora da média
          </p>
        )}

        <AnimatePresence mode="wait">
          {selectedDayData.transactions.length > 0 ? (
            <motion.ul
              key={selectedDayData.dateKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`mt-2 divide-y divide-zinc-800/70 ${
                isDayListExpanded && selectedDayData.transactions.length > MAX_VISIBLE_DAY_EXPENSES
                  ? "max-h-[560px] overflow-y-auto overscroll-contain pr-1"
                  : ""
              }`}
            >
              {(isDayListExpanded
                ? selectedDayData.transactions
                : selectedDayData.transactions.slice(0, COLLAPSED_DAY_EXPENSES)
              ).map((transaction) => {
                const categoryName =
                  CATEGORY_MAP.get(transaction.categoryId) ||
                  transaction.categoryId ||
                  "Sem categoria"
                const methodLabel =
                  PAYMENT_METHOD_LABELS[transaction.paymentMethod] ||
                  transaction.paymentMethod
                const isExcluded = transaction.isExcludedFromPace

                return (
                  <li
                    key={transaction.id}
                    className={`flex items-center justify-between gap-3 py-2.5 transition ${
                      isExcluded ? "opacity-60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${
                          isExcluded ? "text-zinc-400 line-through" : "text-zinc-200"
                        }`}
                      >
                        {transaction.label}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {categoryName} · {methodLabel}
                        {transaction.isOutlier && <span className="text-amber-300"> · pontual</span>}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          isExcluded ? "text-zinc-400" : "text-rose-300"
                        }`}
                      >
                        −{formatCurrency(transaction.value)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExcludeTransaction(transaction.id)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg transition sm:h-8 sm:w-8 ${
                          isExcluded
                            ? "text-emerald-300 hover:bg-emerald-500/10"
                            : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
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
                        {isExcluded ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </li>
                )
              })}
            </motion.ul>
          ) : (
            <motion.p
              key={`${selectedDayData.dateKey}-empty`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-3 text-sm text-zinc-500"
            >
              {selectedDayData.isFuture
                ? "Dia ainda não chegou."
                : "Nenhum gasto neste dia."}
            </motion.p>
          )}
        </AnimatePresence>

        {selectedDayData.transactions.length > COLLAPSED_DAY_EXPENSES && (
          <button
            type="button"
            onClick={() => setExpandedDateKey(isDayListExpanded ? null : selectedDateKey)}
            aria-expanded={isDayListExpanded}
            className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm text-zinc-400 transition hover:bg-zinc-950 hover:text-zinc-200"
          >
            {isDayListExpanded
              ? "Mostrar menos"
              : `Mostrar mais ${selectedDayData.transactions.length - COLLAPSED_DAY_EXPENSES}`}
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 motion-reduce:transition-none ${
                isDayListExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
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
