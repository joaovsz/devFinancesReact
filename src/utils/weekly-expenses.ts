import { Transaction } from "../types/transaction"

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

export function getMonthWeeks(monthKey: string): MonthWeekDefinition[] {
  const daysInMonth = getDaysInMonthFromKey(monthKey)
  const [yearStr, monthStr] = monthKey.split("-")
  const monthIndex = Number(monthStr) - 1
  const monthName = MONTH_NAMES_PT[monthIndex] || ""

  const intervals: [number, number][] = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 28]
  ]

  if (daysInMonth >= 29) {
    intervals.push([29, daysInMonth])
  }

  return intervals.map(([startDay, endDay], index) => {
    const weekNumber = index + 1
    const startDateKey = `${monthKey}-${String(startDay).padStart(2, "0")}`
    const endDateKey = `${monthKey}-${String(endDay).padStart(2, "0")}`
    const startFormatted = String(startDay).padStart(2, "0")
    const endFormatted = String(endDay).padStart(2, "0")

    return {
      weekNumber,
      startDay,
      endDay,
      startDateKey,
      endDateKey,
      label: `Semana ${weekNumber} (${startFormatted} a ${endFormatted} de ${monthName})`,
      shortLabel: `${startFormatted} a ${endFormatted}`,
      daysCount: endDay - startDay + 1
    }
  })
}

export function getWeekForDate(monthKey: string, dateString: string): number {
  const weeks = getMonthWeeks(monthKey)
  if (!dateString.startsWith(monthKey)) {
    return 1
  }
  const day = Number(dateString.split("-")[2])
  const found = weeks.find((w) => day >= w.startDay && day <= w.endDay)
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
  referenceToday?: string
  outlierCapValue?: number | null
  excludedTransactionIds?: string[]
  categoryId?: string | null
}): MonthWeekExpensesSummary {
  const todayKey = input.referenceToday || getTodayDateString()
  const weeks = getMonthWeeks(input.monthKey)
  const week = weeks.find((w) => w.weekNumber === input.weekNumber) || weeks[0]

  const capValue = input.outlierCapValue && input.outlierCapValue > 0 ? input.outlierCapValue : null
  const excludedSet = new Set(input.excludedTransactionIds || [])
  const categoryFilter = input.categoryId?.trim() || null

  const isCurrentWeek = todayKey >= week.startDateKey && todayKey <= week.endDateKey
  const isPastWeek = todayKey > week.endDateKey
  const isFutureWeek = todayKey < week.startDateKey

  let daysElapsedCount = week.daysCount
  if (isCurrentWeek) {
    const todayDay = Number(todayKey.split("-")[2])
    daysElapsedCount = Math.max(1, todayDay - week.startDay + 1)
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

  for (let dayNum = week.startDay; dayNum <= week.endDay; dayNum += 1) {
    const dateKey = `${input.monthKey}-${String(dayNum).padStart(2, "0")}`
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
      dayIndex: dayNum - week.startDay,
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
  referenceToday?: string
  outlierCapValue?: number | null
  excludedTransactionIds?: string[]
  categoryId?: string | null
}): MonthToDateExpensesSummary {
  const todayKey = input.referenceToday || getTodayDateString()
  const currentMonthKey = todayKey.slice(0, 7)
  const daysInMonth = getDaysInMonthFromKey(input.monthKey)

  const isCurrentMonth = input.monthKey === currentMonthKey
  const isPastMonth = input.monthKey < currentMonthKey
  const isFutureMonth = input.monthKey > currentMonthKey

  let daysElapsed = 0
  if (isCurrentMonth) {
    const todayDay = Number(todayKey.split("-")[2])
    daysElapsed = Math.min(todayDay, daysInMonth)
  } else if (isPastMonth) {
    daysElapsed = daysInMonth
  } else {
    daysElapsed = 0
  }

  const capValue = input.outlierCapValue && input.outlierCapValue > 0 ? input.outlierCapValue : null
  const excludedSet = new Set(input.excludedTransactionIds || [])
  const categoryFilter = input.categoryId?.trim() || null

  const monthExpenses = input.transactions.filter((tx) => {
    if (tx.type !== 2) return false
    if (!tx.date.startsWith(input.monthKey)) return false
    if (isCurrentMonth && tx.date > todayKey) return false
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
