import { Holiday } from "../services/calendar"

type WorkingMonthMetrics = {
  monthKey: string
  weekdays: number
  weekdayHolidays: number
  businessDays: number
  workableHours: number
  projectedRevenue: number
}

function isWeekday(date: Date) {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

function getMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  return { year, month, firstDay, lastDay }
}

function buildHolidaySet(holidays: Holiday[]) {
  return new Set(holidays.map((holiday) => holiday.date))
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getWorkingMonthMetrics(input: {
  monthKey: string
  holidays: Holiday[]
  hoursPerWorkday: number
  hourlyRate: number
}) {
  const { firstDay, lastDay } = getMonthRange(input.monthKey)
  const holidaySet = buildHolidaySet(input.holidays)

  let weekdays = 0
  let weekdayHolidays = 0

  for (
    const current = new Date(firstDay);
    current <= lastDay;
    current.setDate(current.getDate() + 1)
  ) {
    if (!isWeekday(current)) {
      continue
    }
    weekdays += 1
    if (holidaySet.has(toDateKey(current))) {
      weekdayHolidays += 1
    }
  }

  const businessDays = Math.max(weekdays - weekdayHolidays, 0)
  const workableHours = businessDays * Math.max(input.hoursPerWorkday, 0)
  const projectedRevenue = workableHours * Math.max(input.hourlyRate, 0)

  const result: WorkingMonthMetrics = {
    monthKey: input.monthKey,
    weekdays,
    weekdayHolidays,
    businessDays,
    workableHours,
    projectedRevenue
  }

  return result
}
