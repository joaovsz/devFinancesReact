import { describe, expect, it } from "vitest"
import {
  addDaysToDateKey,
  computeSevenDaysExpenses,
  computeWeeklyDailyExpenses,
  formatWeekRangeLabel,
  getLastSevenDaysStartDate,
  getMondayOfWeek,
  getNextWeekMonday,
  getPreviousWeekMonday,
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
})


