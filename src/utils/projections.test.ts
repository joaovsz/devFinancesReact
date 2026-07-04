import { describe, expect, it } from "vitest"
import { CreditCard } from "../types/card"
import { ContractConfig, FixedCost, InstallmentPlan } from "../types/planning"
import { Transaction } from "../types/transaction"
import {
  buildProjectionTimeline,
  getCommittedCostsForMonth,
  getPjProjectedRevenueForMonth
} from "./projections"

function createPjConfig(overrides: Partial<ContractConfig> = {}): ContractConfig {
  return {
    incomeMode: "pj",
    hourlyRate: 100,
    hoursPerWorkday: 8,
    cltNetSalary: 0,
    cltPaydayDate: "2025-05-05",
    pjPaydayDate: "2025-06-10",
    incomeStartMonth: "2025-04",
    pjCompetenceOffsetMonths: 1,
    cltCompetenceOffsetMonths: 0,
    localityState: "SP",
    localityCity: "Sao Paulo",
    useHolidayApi: false,
    ...overrides
  }
}

describe("projected revenue by competence", () => {
  it("uses incomeStartMonth to keep recurring revenue active in prior competence months", () => {
    const revenue = getPjProjectedRevenueForMonth({
      contractConfig: createPjConfig(),
      monthKey: "2025-04",
      holidays: []
    })

    expect(revenue).toBeGreaterThan(0)
  })

  it("falls back to first receipt month minus competence offset when no start month is set", () => {
    const revenue = getPjProjectedRevenueForMonth({
      contractConfig: createPjConfig({
        incomeStartMonth: undefined
      }),
      monthKey: "2025-04",
      holidays: []
    })

    expect(revenue).toBe(0)
  })
})

describe("invoice due month adjustments", () => {
  it("applies manual invoice adjustment from the operational month to the due month", () => {
    const card: CreditCard = {
      id: "credicard",
      name: "Credicard",
      brandColor: "#111111",
      limitTotal: 5000,
      closeDay: 26,
      dueDay: 5,
      manualInvoiceAmount: 0,
      manualInvoiceByMonth: {
        "2025-05": 2.99
      }
    }

    const total = getCommittedCostsForMonth({
      cards: [card],
      transactions: [
        {
          id: "tx-1",
          createdAt: "2025-05-01T12:00:00.000Z",
          label: "Compra",
          value: 435,
          date: "2025-04-27",
          type: 2,
          paymentMethod: "credit",
          cardId: "credicard",
          categoryId: "cat",
          subcategoryId: "sub",
          tags: []
        }
      ],
      fixedCosts: [],
      installmentPlans: [],
      monthKey: "2025-06"
    }).total

    expect(total).toBeCloseTo(437.99, 2)
  })
})

describe("non-credit due month offsets", () => {
  it("moves fixed costs due next month out of the occurrence month", () => {
    const fixedCost: FixedCost = {
      id: "rent",
      name: "Aluguel",
      amount: 1000,
      startMonth: "2025-04",
      dueOffsetMonths: 1,
      dueDay: 5,
      categoryId: "home",
      subcategoryId: "rent",
      paymentMethod: "cash"
    }

    expect(
      getCommittedCostsForMonth({
        cards: [],
        transactions: [],
        fixedCosts: [fixedCost],
        installmentPlans: [],
        monthKey: "2025-04"
      }).total
    ).toBe(0)

    expect(
      getCommittedCostsForMonth({
        cards: [],
        transactions: [],
        fixedCosts: [fixedCost],
        installmentPlans: [],
        monthKey: "2025-05"
      }).total
    ).toBe(1000)
  })

  it("moves non-credit installments due next month out of the occurrence month", () => {
    const plan: InstallmentPlan = {
      id: "course",
      name: "Curso",
      installmentValue: 200,
      totalInstallments: 3,
      paidInstallments: 0,
      startMonth: "2025-04",
      dueOffsetMonths: 1,
      chargeDay: 10,
      paymentMethod: "pix"
    }

    expect(
      getCommittedCostsForMonth({
        cards: [],
        transactions: [],
        fixedCosts: [],
        installmentPlans: [plan],
        monthKey: "2025-04"
      }).total
    ).toBe(0)

    expect(
      getCommittedCostsForMonth({
        cards: [],
        transactions: [],
        fixedCosts: [],
        installmentPlans: [plan],
        monthKey: "2025-05"
      }).total
    ).toBe(200)
  })
})

describe("projection leftovers from historical costs", () => {
  function expense(
    id: string,
    date: string,
    value: number
  ): Transaction {
    return {
      id,
      createdAt: `${date}T12:00:00.000Z`,
      label: id,
      value,
      date,
      type: 2,
      paymentMethod: "pix",
      categoryId: "cat",
      subcategoryId: "sub",
      tags: []
    }
  }

  it("uses projected revenue minus the average costs from the previous 3 months when every month has expenses", () => {
    const [projection] = buildProjectionTimeline({
      cards: [],
      transactions: [
        expense("jan", "2025-01-10", 900),
        expense("feb", "2025-02-10", 1200),
        expense("mar", "2025-03-10", 1500)
      ],
      fixedCosts: [
        {
          id: "rent",
          name: "Aluguel",
          amount: 400,
          startMonth: "2025-04",
          categoryId: "home",
          subcategoryId: "rent",
          paymentMethod: "pix"
        }
      ],
      installmentPlans: [],
      targetMonth: "2025-04",
      monthsForward: 1,
      projectedRevenueByMonth: {
        "2025-01": 2500,
        "2025-02": 3000,
        "2025-03": 3500,
        "2025-04": 3000
      }
    })

    expect(projection.averageHistoricalCosts).toBe(1200)
    expect(projection.committedCosts).toBe(1200)
    expect(projection.projectedLeftover).toBe(1800)
  })

  it("falls back to planned commitments when one of the previous 3 months has no expenses", () => {
    const [projection] = buildProjectionTimeline({
      cards: [],
      transactions: [
        expense("jan", "2025-01-10", 900),
        expense("mar", "2025-03-10", 1500)
      ],
      fixedCosts: [
        {
          id: "rent",
          name: "Aluguel",
          amount: 400,
          startMonth: "2025-04",
          categoryId: "home",
          subcategoryId: "rent",
          paymentMethod: "pix"
        }
      ],
      installmentPlans: [],
      targetMonth: "2025-04",
      monthsForward: 1,
      projectedRevenueByMonth: {
        "2025-04": 3000
      }
    })

    expect(projection.averageHistoricalCosts).toBeNull()
    expect(projection.committedCosts).toBe(400)
    expect(projection.projectedLeftover).toBe(2600)
  })
})
