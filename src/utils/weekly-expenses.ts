import { Transaction } from "../types/transaction"
import { CreditCard } from "../types/card"
import { addMonths, getCreditTransactionStatementMonth } from "./projections"

const MONTH_NAMES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
]

const DAY_NAMES_BY_DAY_INDEX = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DAY_NAMES_FULL_BY_DAY_INDEX = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
]

export const OUTLIER_CAP_STORAGE_KEY = "devfinances-daily-pace-outlier-cap"

export type OutlierCapSettings = {
  enabled: boolean
  value: number
}

export function loadOutlierCapSettings(): OutlierCapSettings {
  if (typeof window === "undefined") {
    return { enabled: false, value: 0 }
  }

  try {
    const raw = window.localStorage.getItem(OUTLIER_CAP_STORAGE_KEY)
    if (!raw) {
      return { enabled: false, value: 0 }
    }

    const parsed = JSON.parse(raw)
    return {
      enabled: Boolean(parsed.enabled),
      value: Number(parsed.value) || 0
    }
  } catch {
    return { enabled: false, value: 0 }
  }
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0)
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getTodayDateString(): string {
  const now = new Date()
  return toDateKey(now)
}

/**
 * Returns the Monday (YYYY-MM-DD) of the week containing the given date.
 */
export function getMondayOfWeek(dateString: string): string {
  const date = parseLocalDate(dateString)
  const day = date.getDay()
  const diffToMonday = (day + 6) % 7
  date.setDate(date.getDate() - diffToMonday)
  return toDateKey(date)
}

/**
 * Returns the start date of the last 7 days ending on referenceDate (defaults to today).
 * For instance, if today is 15/09, last 7 days starts on 09/09.
 */
export function getLastSevenDaysStartDate(referenceDateString?: string): string {
  const ref = referenceDateString || getTodayDateString()
  return addDaysToDateKey(ref, -6)
}

export function addDaysToDateKey(dateString: string, days: number): string {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function getPreviousWeekMonday(mondayString: string): string {
  return addDaysToDateKey(mondayString, -7)
}

export function getNextWeekMonday(mondayString: string): string {
  return addDaysToDateKey(mondayString, 7)
}

export function formatWeekRangeLabel(startDateString: string, endDateString: string): string {
  const start = parseLocalDate(startDateString)
  const end = parseLocalDate(endDateString)

  const startDay = String(start.getDate()).padStart(2, "0")
  const endDay = String(end.getDate()).padStart(2, "0")

  const startMonth = MONTH_NAMES_PT[start.getMonth()]
  const endMonth = MONTH_NAMES_PT[end.getMonth()]

  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startYear !== endYear) {
    return `${startDay} de ${startMonth} de ${startYear} a ${endDay} de ${endMonth} de ${endYear}`
  }

  if (start.getMonth() !== end.getMonth()) {
    return `${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${endYear}`
  }

  return `${startDay} a ${endDay} de ${endMonth} de ${endYear}`
}

export type MonthWeekDefinition = {
  weekNumber: number
  startDay: number
  endDay: number
  startDateKey: string
  endDateKey: string
  label: string
  shortLabel: string
  daysCount: number
}

export function getDaysInMonthFromKey(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  return new Date(year, month, 0).getDate()
}

export type ExpenseCycle = {
  monthKey: string
  startDateKey: string
  endDateKey: string
}

function diffDaysBetween(startDateKey: string, endDateKey: string): number {
  const start = parseLocalDate(startDateKey).getTime()
  const end = parseLocalDate(endDateKey).getTime()
  return Math.round((end - start) / 86400000)
}

// Primeiro dia cujas compras no cartao ja caem na fatura do mes informado.
function getCardCycleStartDateKey(monthKey: string, card: CreditCard): string | null {
  const scanStart = `${addMonths(monthKey, -1)}-01`
  const scanEnd = `${monthKey}-${String(getDaysInMonthFromKey(monthKey)).padStart(2, "0")}`

  for (let dateKey = scanStart; dateKey <= scanEnd; dateKey = addDaysToDateKey(dateKey, 1)) {
    if (getCreditTransactionStatementMonth(dateKey, card) === monthKey) {
      return dateKey
    }
  }

  return null
}

// Inicio do "mes de gastos": dia seguinte ao primeiro fechamento que virou
// para o mes. Sem cartoes, o ciclo e o mes calendario.
function getCycleStartDateKey(monthKey: string, cards: CreditCard[]): string {
  const cardStarts = cards
    .map((card) => getCardCycleStartDateKey(monthKey, card))
    .filter((dateKey): dateKey is string => Boolean(dateKey))

  if (cardStarts.length === 0) {
    return `${monthKey}-01`
  }

  return cardStarts.reduce((earliest, dateKey) => (dateKey < earliest ? dateKey : earliest))
}

export function getExpenseCycle(monthKey: string, cards: CreditCard[] = []): ExpenseCycle {
  const startDateKey = getCycleStartDateKey(monthKey, cards)
  const nextStartDateKey = getCycleStartDateKey(addMonths(monthKey, 1), cards)

  return {
    monthKey,
    startDateKey,
    endDateKey: addDaysToDateKey(nextStartDateKey, -1)
  }
}

function formatDayMonth(dateKey: string): string {
  const [, month, day] = dateKey.split("-")
  return `${day}/${month}`
}

export function formatCycleStartLabel(cycle: ExpenseCycle): string {
  return cycle.startDateKey.startsWith(cycle.monthKey)
    ? cycle.startDateKey.slice(8, 10)
    : formatDayMonth(cycle.startDateKey)
}

export function getCycleWeeks(cycle: ExpenseCycle): MonthWeekDefinition[] {
  const weeks: MonthWeekDefinition[] = []
  const totalDays = diffDaysBetween(cycle.startDateKey, cycle.endDateKey) + 1

  for (let offset = 0, weekNumber = 1; offset < totalDays; offset += 7, weekNumber += 1) {
    const startDateKey = addDaysToDateKey(cycle.startDateKey, offset)
    const candidateEnd = addDaysToDateKey(startDateKey, 6)
    const endDateKey = candidateEnd > cycle.endDateKey ? cycle.endDateKey : candidateEnd
    const startDay = Number(startDateKey.slice(8, 10))
    const endDay = Number(endDateKey.slice(8, 10))
    const isSameMonth =
      startDateKey.startsWith(cycle.monthKey) && endDateKey.startsWith(cycle.monthKey)
    const shortLabel = isSameMonth
      ? `${String(startDay).padStart(2, "0")} a ${String(endDay).padStart(2, "0")}`
      : `${formatDayMonth(startDateKey)} a ${formatDayMonth(endDateKey)}`
    const monthName = MONTH_NAMES_PT[Number(endDateKey.slice(5, 7)) - 1] || ""

    weeks.push({
      weekNumber,
      startDay,
      endDay,
      startDateKey,
      endDateKey,
      label: isSameMonth
        ? `Semana ${weekNumber} (${shortLabel} de ${monthName})`
        : `Semana ${weekNumber} (${shortLabel})`,
      shortLabel,
      daysCount: diffDaysBetween(startDateKey, endDateKey) + 1
    })
  }

  return weeks
}

export function getMonthWeeks(monthKey: string, cards: CreditCard[] = []): MonthWeekDefinition[] {
  return getCycleWeeks(getExpenseCycle(monthKey, cards))
}

export function getWeekForDate(
  monthKey: string,
  dateString: string,
  cards: CreditCard[] = []
): number {
  const weeks = getMonthWeeks(monthKey, cards)
  const found = weeks.find((w) => dateString >= w.startDateKey && dateString <= w.endDateKey)
  return found ? found.weekNumber : 1
}

export type EnrichedTransaction = Transaction & {
  isOutlier: boolean
  isManuallyExcluded: boolean
  isExcludedFromPace: boolean
}

export type DayExpenseSummary = {
  dateKey: string
  dayIndex: number
  dayNameShort: string
  dayNameFull: string
  formattedDay: string
  isToday: boolean
  isFuture: boolean
  totalExpense: number
  discretionaryExpense: number
  outlierExpense: number
  transactions: EnrichedTransaction[]
  count: number
}

export type WeekExpensesSummary = {
  startDateKey: string
  endDateKey: string
  mondayDateKey: string // for backwards compatibility
  sundayDateKey: string // for backwards compatibility
  rangeLabel: string
  isCurrentWeek: boolean
  isLatestSevenDays: boolean
  days: DayExpenseSummary[]
  totalWeekExpense: number
  discretionaryWeekExpense: number
  outlierWeekExpense: number
  averageDailyExpense: number
  rawAverageDailyExpense: number
  outlierExpensesCount: number
  maxDailyExpense: number
  maxDay: DayExpenseSummary | null
  daysWithExpensesCount: number
  daysWithoutExpensesCount: number
}

export function computeSevenDaysExpenses(input: {
  transactions: Transaction[]
  startDateKey: string
  referenceToday?: string
  outlierCapValue?: number | null
  excludedTransactionIds?: string[]
  categoryId?: string | null
}): WeekExpensesSummary {
  const todayKey = input.referenceToday || getTodayDateString()
  const endDateKey = addDaysToDateKey(input.startDateKey, 6)
  const rangeLabel = formatWeekRangeLabel(input.startDateKey, endDateKey)

  const isCurrentWeek = todayKey >= input.startDateKey && todayKey <= endDateKey
  const isLatestSevenDays = endDateKey === todayKey
  const capValue = input.outlierCapValue && input.outlierCapValue > 0 ? input.outlierCapValue : null
  const excludedSet = new Set(input.excludedTransactionIds || [])
  const categoryFilter = input.categoryId?.trim() || null

  const days: DayExpenseSummary[] = []
  let totalWeekExpense = 0
  let discretionaryWeekExpense = 0
  let outlierWeekExpense = 0
  let outlierExpensesCount = 0
  let maxDailyExpense = 0
  let maxDay: DayExpenseSummary | null = null

  for (let i = 0; i < 7; i += 1) {
    const dateKey = addDaysToDateKey(input.startDateKey, i)
    const localDate = parseLocalDate(dateKey)
    const dayOfWeek = localDate.getDay()
    const formattedDay = `${String(localDate.getDate()).padStart(2, "0")}/${String(
      localDate.getMonth() + 1
    ).padStart(2, "0")}`

    const dayTransactions = input.transactions.filter((transaction) => {
      if (transaction.type !== 2 || transaction.date !== dateKey) {
        return false
      }
      if (categoryFilter && transaction.categoryId !== categoryFilter) {
        return false
      }
      return true
    })

    let dayTotal = 0
    let dayDiscretionary = 0
    let dayOutlier = 0

    const enrichedTransactions: EnrichedTransaction[] = dayTransactions.map((tx) => {
      dayTotal += tx.value

      const isOutlier = capValue !== null && tx.value >= capValue
      const isManuallyExcluded = excludedSet.has(tx.id)
      const isExcludedFromPace = isOutlier || isManuallyExcluded

      if (isExcludedFromPace) {
        dayOutlier += tx.value
        outlierExpensesCount += 1
      } else {
        dayDiscretionary += tx.value
      }

      return {
        ...tx,
        isOutlier,
        isManuallyExcluded,
        isExcludedFromPace
      }
    })

    totalWeekExpense += dayTotal
    discretionaryWeekExpense += dayDiscretionary
    outlierWeekExpense += dayOutlier

    const daySummary: DayExpenseSummary = {
      dateKey,
      dayIndex: i,
      dayNameShort: DAY_NAMES_BY_DAY_INDEX[dayOfWeek],
      dayNameFull: DAY_NAMES_FULL_BY_DAY_INDEX[dayOfWeek],
      formattedDay,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
      totalExpense: dayTotal,
      discretionaryExpense: dayDiscretionary,
      outlierExpense: dayOutlier,
      transactions: enrichedTransactions.sort((a, b) => b.value - a.value),
      count: enrichedTransactions.length
    }

    if (dayTotal > maxDailyExpense) {
      maxDailyExpense = dayTotal
      maxDay = daySummary
    }

    days.push(daySummary)
  }

  // If there's a tie for max > 0 or first day with max
  if (!maxDay && totalWeekExpense > 0) {
    maxDay = days.find((d) => d.totalExpense === maxDailyExpense) || null
  }

  const daysWithExpensesCount = days.filter((d) => d.totalExpense > 0).length
  const daysWithoutExpensesCount = 7 - daysWithExpensesCount

  const rawAverageDailyExpense = totalWeekExpense / 7
  const averageDailyExpense =
    capValue !== null || excludedSet.size > 0 ? discretionaryWeekExpense / 7 : rawAverageDailyExpense

  return {
    startDateKey: input.startDateKey,
    endDateKey,
    mondayDateKey: input.startDateKey,
    sundayDateKey: endDateKey,
    rangeLabel,
    isCurrentWeek,
    isLatestSevenDays,
    days,
    totalWeekExpense,
    discretionaryWeekExpense,
    outlierWeekExpense,
    averageDailyExpense,
    rawAverageDailyExpense,
    outlierExpensesCount,
    maxDailyExpense,
    maxDay,
    daysWithExpensesCount,
    daysWithoutExpensesCount
  }
}

/**
 * Backward compatibility wrapper for Monday-first calculations
 */
export function computeWeeklyDailyExpenses(input: {
  transactions: Transaction[]
  mondayDateKey: string
  referenceToday?: string
  outlierCapValue?: number | null
  excludedTransactionIds?: string[]
  categoryId?: string | null
}): WeekExpensesSummary {
  return computeSevenDaysExpenses({
    ...input,
    startDateKey: input.mondayDateKey
  })
}

export type MonthWeekExpensesSummary = {
  week: MonthWeekDefinition
  isCurrentWeek: boolean
  isPastWeek: boolean
  isFutureWeek: boolean
  daysElapsedCount: number
  days: DayExpenseSummary[]
  totalWeekExpense: number
  discretionaryWeekExpense: number
  outlierWeekExpense: number
  averageDailyExpense: number
  rawAverageDailyExpense: number
  outlierExpensesCount: number
  maxDailyExpense: number
  maxDay: DayExpenseSummary | null
  daysWithExpensesCount: number
  daysWithoutExpensesCount: number
}

export function computeMonthWeekExpenses(input: {
  transactions: Transaction[]
  monthKey: string
  weekNumber: number
  cards?: CreditCard[]
  referenceToday?: string
  outlierCapValue?: number | null
  excludedTransactionIds?: string[]
  categoryId?: string | null
}): MonthWeekExpensesSummary {
  const todayKey = input.referenceToday || getTodayDateString()
  const weeks = getMonthWeeks(input.monthKey, input.cards)
  const week = weeks.find((w) => w.weekNumber === input.weekNumber) || weeks[0]

  const capValue = input.outlierCapValue && input.outlierCapValue > 0 ? input.outlierCapValue : null
  const excludedSet = new Set(input.excludedTransactionIds || [])
  const categoryFilter = input.categoryId?.trim() || null

  const isCurrentWeek = todayKey >= week.startDateKey && todayKey <= week.endDateKey
  const isPastWeek = todayKey > week.endDateKey
  const isFutureWeek = todayKey < week.startDateKey

  let daysElapsedCount = week.daysCount
  if (isCurrentWeek) {
    daysElapsedCount = Math.max(1, diffDaysBetween(week.startDateKey, todayKey) + 1)
  } else if (isFutureWeek) {
    daysElapsedCount = 0
  }

  const days: DayExpenseSummary[] = []
  let totalWeekExpense = 0
  let discretionaryWeekExpense = 0
  let outlierWeekExpense = 0
  let outlierExpensesCount = 0
  let maxDailyExpense = 0
  let maxDay: DayExpenseSummary | null = null

  for (let dayIndex = 0; dayIndex < week.daysCount; dayIndex += 1) {
    const dateKey = addDaysToDateKey(week.startDateKey, dayIndex)
    const localDate = parseLocalDate(dateKey)
    const dayOfWeek = localDate.getDay()
    const formattedDay = `${String(localDate.getDate()).padStart(2, "0")}/${String(
      localDate.getMonth() + 1
    ).padStart(2, "0")}`

    const dayTransactions = input.transactions.filter((transaction) => {
      if (transaction.type !== 2 || transaction.date !== dateKey) {
        return false
      }
      if (categoryFilter && transaction.categoryId !== categoryFilter) {
        return false
      }
      return true
    })

    let dayTotal = 0
    let dayDiscretionary = 0
    let dayOutlier = 0

    const enrichedTransactions: EnrichedTransaction[] = dayTransactions.map((tx) => {
      dayTotal += tx.value

      const isOutlier = capValue !== null && tx.value >= capValue
      const isManuallyExcluded = excludedSet.has(tx.id)
      const isExcludedFromPace = isOutlier || isManuallyExcluded

      if (isExcludedFromPace) {
        dayOutlier += tx.value
        outlierExpensesCount += 1
      } else {
        dayDiscretionary += tx.value
      }

      return {
        ...tx,
        isOutlier,
        isManuallyExcluded,
        isExcludedFromPace
      }
    })

    totalWeekExpense += dayTotal
    discretionaryWeekExpense += dayDiscretionary
    outlierWeekExpense += dayOutlier

    const daySummary: DayExpenseSummary = {
      dateKey,
      dayIndex,
      dayNameShort: DAY_NAMES_BY_DAY_INDEX[dayOfWeek],
      dayNameFull: DAY_NAMES_FULL_BY_DAY_INDEX[dayOfWeek],
      formattedDay,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
      totalExpense: dayTotal,
      discretionaryExpense: dayDiscretionary,
      outlierExpense: dayOutlier,
      transactions: enrichedTransactions.sort((a, b) => b.value - a.value),
      count: enrichedTransactions.length
    }

    if (dayDiscretionary > maxDailyExpense) {
      maxDailyExpense = dayDiscretionary
      maxDay = daySummary
    }

    days.push(daySummary)
  }

  if (!maxDay && totalWeekExpense > 0) {
    maxDay = days.find((d) => d.totalExpense > 0) || null
  }

  const daysWithExpensesCount = days.filter((d) => d.totalExpense > 0).length
  const daysWithoutExpensesCount = week.daysCount - daysWithExpensesCount

  const divisor = daysElapsedCount > 0 ? daysElapsedCount : week.daysCount
  const rawAverageDailyExpense = totalWeekExpense / divisor
  const averageDailyExpense = discretionaryWeekExpense / divisor

  return {
    week,
    isCurrentWeek,
    isPastWeek,
    isFutureWeek,
    daysElapsedCount,
    days,
    totalWeekExpense,
    discretionaryWeekExpense,
    outlierWeekExpense,
    averageDailyExpense,
    rawAverageDailyExpense,
    outlierExpensesCount,
    maxDailyExpense,
    maxDay,
    daysWithExpensesCount,
    daysWithoutExpensesCount
  }
}

export type MonthToDateExpensesSummary = {
  monthKey: string
  cycle: ExpenseCycle
  daysElapsed: number
  daysInMonth: number
  isCurrentMonth: boolean
  isPastMonth: boolean
  isFutureMonth: boolean
  totalMonthToDateExpense: number
  discretionaryMonthToDateExpense: number
  outlierMonthToDateExpense: number
  averageDailyExpense: number
  outlierExpensesCount: number
}

export function computeMonthToDateExpenses(input: {
  transactions: Transaction[]
  monthKey: string
  cards?: CreditCard[]
  referenceToday?: string
  outlierCapValue?: number | null
  excludedTransactionIds?: string[]
  categoryId?: string | null
}): MonthToDateExpensesSummary {
  const todayKey = input.referenceToday || getTodayDateString()
  const cycle = getExpenseCycle(input.monthKey, input.cards)
  const daysInMonth = diffDaysBetween(cycle.startDateKey, cycle.endDateKey) + 1

  const isCurrentMonth = todayKey >= cycle.startDateKey && todayKey <= cycle.endDateKey
  const isPastMonth = todayKey > cycle.endDateKey
  const isFutureMonth = todayKey < cycle.startDateKey

  let daysElapsed = 0
  if (isCurrentMonth) {
    daysElapsed = diffDaysBetween(cycle.startDateKey, todayKey) + 1
  } else if (isPastMonth) {
    daysElapsed = daysInMonth
  }

  const capValue = input.outlierCapValue && input.outlierCapValue > 0 ? input.outlierCapValue : null
  const excludedSet = new Set(input.excludedTransactionIds || [])
  const categoryFilter = input.categoryId?.trim() || null

  const monthExpenses = input.transactions.filter((tx) => {
    if (tx.type !== 2) return false
    if (tx.date < cycle.startDateKey || tx.date > cycle.endDateKey) return false
    if (tx.date > todayKey) return false
    if (categoryFilter && tx.categoryId !== categoryFilter) return false
    return true
  })

  let totalMonthToDateExpense = 0
  let discretionaryMonthToDateExpense = 0
  let outlierMonthToDateExpense = 0
  let outlierExpensesCount = 0

  monthExpenses.forEach((tx) => {
    totalMonthToDateExpense += tx.value
    const isOutlier = capValue !== null && tx.value >= capValue
    const isExcluded = excludedSet.has(tx.id)

    if (isOutlier || isExcluded) {
      outlierMonthToDateExpense += tx.value
      outlierExpensesCount += 1
    } else {
      discretionaryMonthToDateExpense += tx.value
    }
  })

  const averageDailyExpense =
    daysElapsed > 0 ? discretionaryMonthToDateExpense / daysElapsed : 0

  return {
    monthKey: input.monthKey,
    cycle,
    daysElapsed,
    daysInMonth,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
    totalMonthToDateExpense,
    discretionaryMonthToDateExpense,
    outlierMonthToDateExpense,
    averageDailyExpense,
    outlierExpensesCount
  }
}
