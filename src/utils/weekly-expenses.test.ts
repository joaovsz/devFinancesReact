import { describe, expect, it } from "vitest"
import {
  addDaysToDateKey,
  computeMonthToDateExpenses,
  computeMonthWeekExpenses,
  computeSevenDaysExpenses,
  computeWeeklyDailyExpenses,
  formatWeekRangeLabel,
  getLastSevenDaysStartDate,
  getMonthWeeks,
  getMondayOfWeek,
  getNextWeekMonday,
  getPreviousWeekMonday,
  getWeekForDate,
  parseLocalDate,
  toDateKey
} from "./weekly-expenses"
import { Transaction } from "../types/transaction"

describe("weekly-expenses utilities", () => {
  it("computes monday of the week correctly for any day of the week", () => {
    // 2026-09-15 is Tuesday -> Monday is 2026-09-14
    expect(getMondayOfWeek("2026-09-15")).toBe("2026-09-14")
    // 2026-09-14 is Monday -> Monday is 2026-09-14
    expect(getMondayOfWeek("2026-09-14")).toBe("2026-09-14")
    // 2026-09-20 is Sunday -> Monday is 2026-09-14
    expect(getMondayOfWeek("2026-09-20")).toBe("2026-09-14")
    // 2026-09-21 is next Monday -> Monday is 2026-09-21
    expect(getMondayOfWeek("2026-09-21")).toBe("2026-09-21")
  })

  it("navigates previous and next weeks correctly", () => {
    const monday = "2026-09-14"
    expect(getPreviousWeekMonday(monday)).toBe("2026-09-07")
    expect(getNextWeekMonday(monday)).toBe("2026-09-21")
  })

  it("adds days across month boundaries accurately", () => {
    expect(addDaysToDateKey("2026-08-31", 1)).toBe("2026-09-01")
    expect(addDaysToDateKey("2026-09-01", -1)).toBe("2026-08-31")
  })

  it("formats week range labels in Portuguese", () => {
    // Same month
    expect(formatWeekRangeLabel("2026-09-14", "2026-09-20")).toBe("14 a 20 de setembro de 2026")
    // Crossing month boundary
    expect(formatWeekRangeLabel("2026-09-28", "2026-10-04")).toBe("28 de setembro a 04 de outubro de 2026")
    // Crossing year boundary
    expect(formatWeekRangeLabel("2026-12-28", "2027-01-03")).toBe("28 de dezembro de 2026 a 03 de janeiro de 2027")
  })

  it("computes weekly expenses summary correctly", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-1",
        label: "Supermercado",
        value: 150,
        date: "2026-09-14",
        type: 2,
        paymentMethod: "credit",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-2",
        label: "Padaria",
        value: 25,
        date: "2026-09-14",
        type: 2,
        paymentMethod: "pix",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-3",
        label: "Salário (receita)",
        value: 5000,
        date: "2026-09-15",
        type: 1, // Income should be ignored in daily expense calculation
        paymentMethod: "pix",
        categoryId: "rendas",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-4",
        label: "Combustível",
        value: 200,
        date: "2026-09-18",
        type: 2,
        paymentMethod: "debit",
        categoryId: "transporte",
        subcategoryId: "",
        tags: []
      }
    ]

    const result = computeWeeklyDailyExpenses({
      transactions: mockTransactions,
      mondayDateKey: "2026-09-14",
      referenceToday: "2026-09-15"
    })

    expect(result.mondayDateKey).toBe("2026-09-14")
    expect(result.sundayDateKey).toBe("2026-09-20")
    expect(result.isCurrentWeek).toBe(true)
    expect(result.days).toHaveLength(7)

    // Monday 14/09: 150 + 25 = 175
    expect(result.days[0].dateKey).toBe("2026-09-14")
    expect(result.days[0].totalExpense).toBe(175)
    expect(result.days[0].count).toBe(2)

    // Tuesday 15/09: 0 (only income logged)
    expect(result.days[1].dateKey).toBe("2026-09-15")
    expect(result.days[1].totalExpense).toBe(0)
    expect(result.days[1].isToday).toBe(true)

    // Friday 18/09: 200
    expect(result.days[4].dateKey).toBe("2026-09-18")
    expect(result.days[4].totalExpense).toBe(200)

    // Total week expense: 175 + 200 = 375
    expect(result.totalWeekExpense).toBe(375)
    expect(result.maxDailyExpense).toBe(200)
    expect(result.maxDay?.dateKey).toBe("2026-09-18")
    expect(result.daysWithExpensesCount).toBe(2)
    expect(result.daysWithoutExpensesCount).toBe(5)
    expect(result.averageDailyExpense).toBeCloseTo(375 / 7, 2)
  })

  it("excludes outlier expenses from daily average when outlierCapValue is set", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-1",
        label: "Aluguel (pontual/grande)",
        value: 1200,
        date: "2026-09-14",
        type: 2,
        paymentMethod: "bank-slip",
        categoryId: "moradia",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-2",
        label: "Almoço",
        value: 35,
        date: "2026-09-14",
        type: 2,
        paymentMethod: "pix",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      }
    ]

    const result = computeWeeklyDailyExpenses({
      transactions: mockTransactions,
      mondayDateKey: "2026-09-14",
      outlierCapValue: 500
    })

    // Total week expense still includes everything (1235)
    expect(result.totalWeekExpense).toBe(1235)
    // But discretionary expense only includes the 35
    expect(result.discretionaryWeekExpense).toBe(35)
    expect(result.outlierWeekExpense).toBe(1200)
    expect(result.outlierExpensesCount).toBe(1)
    // Daily average is 35 / 7 = 5
    expect(result.averageDailyExpense).toBe(5)
    expect(result.rawAverageDailyExpense).toBeCloseTo(1235 / 7, 2)

    const mondayTxs = result.days[0].transactions
    expect(mondayTxs[0].isOutlier).toBe(true)
    expect(mondayTxs[0].isExcludedFromPace).toBe(true)
    expect(mondayTxs[1].isOutlier).toBe(false)
  })

  it("supports manual transaction exclusion from weekly calculations", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-lunch",
        label: "Almoço",
        value: 50,
        date: "2026-09-15",
        type: 2,
        paymentMethod: "pix",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-uber",
        label: "Corrida avulsa",
        value: 30,
        date: "2026-09-15",
        type: 2,
        paymentMethod: "credit",
        categoryId: "transporte",
        subcategoryId: "",
        tags: []
      }
    ]

    const result = computeWeeklyDailyExpenses({
      transactions: mockTransactions,
      mondayDateKey: "2026-09-14",
      excludedTransactionIds: ["tx-uber"]
    })

    expect(result.totalWeekExpense).toBe(80)
    expect(result.discretionaryWeekExpense).toBe(50)
    expect(result.outlierWeekExpense).toBe(30)
    expect(result.averageDailyExpense).toBeCloseTo(50 / 7, 2)

    const tuesdayTxs = result.days[1].transactions
    const uberTx = tuesdayTxs.find((t) => t.id === "tx-uber")
    expect(uberTx?.isManuallyExcluded).toBe(true)
    expect(uberTx?.isExcludedFromPace).toBe(true)
  })

  it("computes last 7 days start date correctly", () => {
    // If reference is 2026-09-15 (day 15), 7 days window starts 6 days prior on 2026-09-09
    expect(getLastSevenDaysStartDate("2026-09-15")).toBe("2026-09-09")
    // Crossing month boundary: 2026-09-03 -> 2026-08-28
    expect(getLastSevenDaysStartDate("2026-09-03")).toBe("2026-08-28")
  })

  it("filters expenses by category in the 7-day period", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-food-1",
        label: "Mercado",
        value: 100,
        date: "2026-09-14",
        type: 2,
        paymentMethod: "pix",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-transport-1",
        label: "Gasolina",
        value: 200,
        date: "2026-09-14",
        type: 2,
        paymentMethod: "credit",
        categoryId: "transporte",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-food-2",
        label: "Restaurante",
        value: 50,
        date: "2026-09-15",
        type: 2,
        paymentMethod: "debit",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      }
    ]

    const result = computeSevenDaysExpenses({
      transactions: mockTransactions,
      startDateKey: "2026-09-09",
      referenceToday: "2026-09-15",
      categoryId: "alimentacao"
    })

    // Total should only be alimentacao (100 + 50 = 150), ignoring transporte (200)
    expect(result.totalWeekExpense).toBe(150)
    expect(result.averageDailyExpense).toBeCloseTo(150 / 7, 2)
    expect(result.isLatestSevenDays).toBe(true)

    // Day with 2026-09-14 (index 5) should only have Mercado
    const day14 = result.days.find((d) => d.dateKey === "2026-09-14")
    expect(day14?.totalExpense).toBe(100)
    expect(day14?.transactions).toHaveLength(1)
    expect(day14?.transactions[0].id).toBe("tx-food-1")
  })

  it("divides month into discrete weeks starting on day 01", () => {
    // 30 days month (September)
    const septWeeks = getMonthWeeks("2026-09")
    expect(septWeeks).toHaveLength(5)
    expect(septWeeks[0]).toMatchObject({
      weekNumber: 1,
      startDay: 1,
      endDay: 7,
      startDateKey: "2026-09-01",
      endDateKey: "2026-09-07",
      shortLabel: "01 a 07",
      daysCount: 7
    })
    expect(septWeeks[1]).toMatchObject({
      weekNumber: 2,
      startDay: 8,
      endDay: 14,
      shortLabel: "08 a 14",
      daysCount: 7
    })
    expect(septWeeks[2]).toMatchObject({
      weekNumber: 3,
      startDay: 15,
      endDay: 21,
      shortLabel: "15 a 21",
      daysCount: 7
    })
    expect(septWeeks[3]).toMatchObject({
      weekNumber: 4,
      startDay: 22,
      endDay: 28,
      shortLabel: "22 a 28",
      daysCount: 7
    })
    expect(septWeeks[4]).toMatchObject({
      weekNumber: 5,
      startDay: 29,
      endDay: 30,
      shortLabel: "29 a 30",
      daysCount: 2
    })

    // 28 days month (Feb 2026 non-leap)
    const febWeeks = getMonthWeeks("2026-02")
    expect(febWeeks).toHaveLength(4)
    expect(febWeeks[3]).toMatchObject({
      weekNumber: 4,
      startDay: 22,
      endDay: 28,
      daysCount: 7
    })

    // 31 days month (October)
    const octWeeks = getMonthWeeks("2026-10")
    expect(octWeeks).toHaveLength(5)
    expect(octWeeks[4]).toMatchObject({
      weekNumber: 5,
      startDay: 29,
      endDay: 31,
      daysCount: 3
    })
  })

  it("finds correct week number for any date", () => {
    expect(getWeekForDate("2026-09", "2026-09-01")).toBe(1)
    expect(getWeekForDate("2026-09", "2026-09-07")).toBe(1)
    expect(getWeekForDate("2026-09", "2026-09-08")).toBe(2)
    expect(getWeekForDate("2026-09", "2026-09-14")).toBe(2)
    expect(getWeekForDate("2026-09", "2026-09-15")).toBe(3)
    expect(getWeekForDate("2026-09", "2026-09-30")).toBe(5)
  })

  it("computes month-to-date daily average with and without outlier cap", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-1",
        label: "Aluguel (pontual/grande)",
        value: 1200,
        date: "2026-09-02",
        type: 2,
        paymentMethod: "pix",
        categoryId: "moradia",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-2",
        label: "Alimentação",
        value: 150,
        date: "2026-09-05",
        type: 2,
        paymentMethod: "credit",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-3",
        label: "Farmácia",
        value: 150,
        date: "2026-09-10",
        type: 2,
        paymentMethod: "debit",
        categoryId: "saude",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-future",
        label: "Gasto futuro (dia 20)",
        value: 200,
        date: "2026-09-20",
        type: 2,
        paymentMethod: "credit",
        categoryId: "lazer",
        subcategoryId: "",
        tags: []
      }
    ]

    // Reference date is day 15 (2026-09-15)
    // Without outlier cap: (1200 + 150 + 150) / 15 = 1500 / 15 = 100/dia
    const mtdWithoutCap = computeMonthToDateExpenses({
      transactions: mockTransactions,
      monthKey: "2026-09",
      referenceToday: "2026-09-15"
    })
    expect(mtdWithoutCap.daysElapsed).toBe(15)
    expect(mtdWithoutCap.totalMonthToDateExpense).toBe(1500)
    expect(mtdWithoutCap.discretionaryMonthToDateExpense).toBe(1500)
    expect(mtdWithoutCap.averageDailyExpense).toBe(100)

    // With outlier cap of 500: tx-1 (1200) is excluded from discretionary average
    // Discretionary: 150 + 150 = 300. Average: 300 / 15 = 20/dia
    const mtdWithCap = computeMonthToDateExpenses({
      transactions: mockTransactions,
      monthKey: "2026-09",
      referenceToday: "2026-09-15",
      outlierCapValue: 500
    })
    expect(mtdWithCap.daysElapsed).toBe(15)
    expect(mtdWithCap.totalMonthToDateExpense).toBe(1500)
    expect(mtdWithCap.discretionaryMonthToDateExpense).toBe(300)
    expect(mtdWithCap.outlierMonthToDateExpense).toBe(1200)
    expect(mtdWithCap.outlierExpensesCount).toBe(1)
    expect(mtdWithCap.averageDailyExpense).toBe(20)
  })

  it("computes discrete week expenses correctly (e.g. Week 1: 01 to 07 and Week 2: 08 to 14)", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-w1",
        label: "Mercado semana 1",
        value: 140,
        date: "2026-09-03",
        type: 2,
        paymentMethod: "pix",
        categoryId: "alimentacao",
        subcategoryId: "",
        tags: []
      },
      {
        id: "tx-w2",
        label: "Farmácia semana 2",
        value: 70,
        date: "2026-09-10",
        type: 2,
        paymentMethod: "debit",
        categoryId: "saude",
        subcategoryId: "",
        tags: []
      }
    ]

    // Week 1 (01 a 07): 140 spent over 7 days -> 20/dia
    const w1 = computeMonthWeekExpenses({
      transactions: mockTransactions,
      monthKey: "2026-09",
      weekNumber: 1,
      referenceToday: "2026-09-15"
    })
    expect(w1.week.startDay).toBe(1)
    expect(w1.week.endDay).toBe(7)
    expect(w1.totalWeekExpense).toBe(140)
    expect(w1.averageDailyExpense).toBe(20)
    expect(w1.isPastWeek).toBe(true)

    // Week 2 (08 a 14): 70 spent over 7 days -> 10/dia
    const w2 = computeMonthWeekExpenses({
      transactions: mockTransactions,
      monthKey: "2026-09",
      weekNumber: 2,
      referenceToday: "2026-09-15"
    })
    expect(w2.week.startDay).toBe(8)
    expect(w2.week.endDay).toBe(14)
    expect(w2.totalWeekExpense).toBe(70)
    expect(w2.averageDailyExpense).toBe(10)
    expect(w2.isPastWeek).toBe(true)
  })
})


