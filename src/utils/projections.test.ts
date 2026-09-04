import { describe, expect, it, vi } from "vitest"
import { CreditCard } from "../types/card"
import { ContractConfig, FixedCost, InstallmentPlan } from "../types/planning"
import { Transaction } from "../types/transaction"
import {
  buildProjectionTimeline,
  CREDIT_STATEMENT_BACKFILL_MONTHS,
  freezeCreditFixedCostStatementMonths,
  freezeCreditInstallmentStatementMonths,
  freezeCreditTransactionStatementMonth,
  getCommittedCostsForMonth,
  getCreditFixedCostStatementMonth,
  getCreditInstallmentStatementMonth,
  getCreditTransactionStatementMonth,
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

describe("credit statement month freezing", () => {
  function createCard(overrides: Partial<CreditCard> = {}): CreditCard {
    return {
      id: "card-1",
      name: "Cartao Teste",
      brandColor: "#111111",
      limitTotal: 1000,
      closeDay: 4,
      dueDay: 10,
      manualInvoiceAmount: 0,
      ...overrides
    }
  }

  function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: "tx-1",
      label: "Compra",
      value: 100,
      date: "2025-05-10",
      type: 2,
      paymentMethod: "credit",
      cardId: "card-1",
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      tags: [],
      ...overrides
    }
  }

  it("freezes the statement month calculated with the closeDay in effect", () => {
    const card = createCard({ closeDay: 4, dueDay: 20 })
    const transaction = createTransaction({ date: "2025-05-10" })

    const frozen = freezeCreditTransactionStatementMonth(transaction, card)

    expect(frozen.statementMonth).toBe(
      getCreditTransactionStatementMonth(transaction.date, card)
    )
    expect(frozen.statementMonth).toBe("2025-05")
  })

  it("does not overwrite an already frozen statement month", () => {
    const card = createCard({ closeDay: 4 })
    const transaction = createTransaction({ statementMonth: "2025-04" })

    const frozen = freezeCreditTransactionStatementMonth(transaction, card)

    expect(frozen.statementMonth).toBe("2025-04")
  })

  it("editing closeDay does not reclassify a transaction that already froze its statement month", () => {
    const oldCard = createCard({ closeDay: 4, dueDay: 20 })
    const transaction = createTransaction({ date: "2025-05-10" })
    const frozen = freezeCreditTransactionStatementMonth(transaction, oldCard)

    // Simula a edicao do cartao: dia 04 -> 13. A compra do dia 10, que passaria
    // a cair no mes anterior pelo calculo dinamico, deve manter o mes congelado.
    const newCard = createCard({ closeDay: 13, dueDay: 20 })

    expect(getCreditTransactionStatementMonth(transaction.date, newCard)).toBe("2025-04")
    expect(
      getCreditTransactionStatementMonth(frozen.date, newCard, frozen.statementMonth)
    ).toBe("2025-05")
  })

  it("legacy transaction without a frozen statement month still uses the dynamic fallback", () => {
    const card = createCard({ closeDay: 13, dueDay: 20 })

    expect(getCreditTransactionStatementMonth("2025-05-10", card, undefined)).toBe("2025-04")
  })

  it("freezes only fixed cost occurrences already posted, leaving future ones dynamic", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2025-05-20T12:00:00.000Z"))

      const oldCard = createCard({ closeDay: 4, dueDay: 10 })
      const fixedCost: FixedCost = {
        id: "fixed-1",
        name: "Assinatura",
        amount: 50,
        startMonth: "2025-03",
        chargeDay: 15,
        categoryId: "cat-1",
        subcategoryId: "sub-1",
        paymentMethod: "credit",
        cardId: "card-1"
      }

      const frozenCost = freezeCreditFixedCostStatementMonths(fixedCost, oldCard)

      // Marco, abril e maio ja postaram (chargeDay 15, hoje e 20/05); nenhuma
      // ocorrencia futura deve estar presente no mapa congelado.
      expect(frozenCost.statementMonthByOccurrence?.["2025-03"]).toBe("2025-03")
      expect(frozenCost.statementMonthByOccurrence?.["2025-04"]).toBe("2025-04")
      expect(frozenCost.statementMonthByOccurrence?.["2025-05"]).toBe("2025-05")
      expect(frozenCost.statementMonthByOccurrence?.["2025-06"]).toBeUndefined()

      const newCard = createCard({ closeDay: 13, dueDay: 10 })
      const unfrozenCost = { ...fixedCost }

      // Ocorrencia ja postada mantem o mes congelado, diferente do que o calculo
      // dinamico daria se recalculado agora com o closeDay novo.
      const frozenMay = getCreditFixedCostStatementMonth(frozenCost, "2025-05", newCard)
      const dynamicMay = getCreditFixedCostStatementMonth(unfrozenCost, "2025-05", newCard)
      expect(frozenMay).toBe("2025-05")
      expect(dynamicMay).not.toBe(frozenMay)

      // Ocorrencia futura (ainda nao postada) usa o closeDay novo dinamicamente,
      // igual ao calculo sem nenhum congelamento.
      const frozenJune = getCreditFixedCostStatementMonth(frozenCost, "2025-06", newCard)
      const dynamicJune = getCreditFixedCostStatementMonth(unfrozenCost, "2025-06", newCard)
      expect(frozenJune).toBe(dynamicJune)
    } finally {
      vi.useRealTimers()
    }
  })

  it("bounds retroactive freezing of startMonth-less fixed costs to CREDIT_STATEMENT_BACKFILL_MONTHS", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2025-05-20T12:00:00.000Z"))

      const card = createCard({ closeDay: 4, dueDay: 10 })
      const fixedCost: FixedCost = {
        id: "fixed-legacy",
        name: "Assinatura antiga",
        amount: 20,
        chargeDay: 15,
        categoryId: "cat-1",
        subcategoryId: "sub-1",
        paymentMethod: "credit",
        cardId: "card-1"
      }

      const frozenCost = freezeCreditFixedCostStatementMonths(fixedCost, card)
      const occurrenceMonths = Object.keys(frozenCost.statementMonthByOccurrence || {})

      expect(occurrenceMonths.length).toBeLessThanOrEqual(CREDIT_STATEMENT_BACKFILL_MONTHS + 1)
      expect(occurrenceMonths).toContain("2025-05")
    } finally {
      vi.useRealTimers()
    }
  })

  it("freezes installment occurrences already posted and stops at the last installment", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2025-05-20T12:00:00.000Z"))

      const oldCard = createCard({ closeDay: 4, dueDay: 10 })
      const plan: InstallmentPlan = {
        id: "installment-1",
        name: "Notebook",
        installmentValue: 100,
        totalInstallments: 3,
        paidInstallments: 0,
        startMonth: "2025-04",
        chargeDay: 15,
        paymentMethod: "credit",
        cardId: "card-1"
      }

      const frozenPlan = freezeCreditInstallmentStatementMonths(plan, oldCard)

      expect(frozenPlan.statementMonthByOccurrence?.["2025-04"]).toBe("2025-04")
      expect(frozenPlan.statementMonthByOccurrence?.["2025-05"]).toBe("2025-05")
      // 2025-06 e a ultima parcela, mas ainda nao postou (referencia e 20/05).
      expect(frozenPlan.statementMonthByOccurrence?.["2025-06"]).toBeUndefined()

      const newCard = createCard({ closeDay: 13, dueDay: 10 })
      const unfrozenPlan = { ...plan }

      // Ocorrencia ja postada mantem o mes congelado, diferente do calculo dinamico.
      const frozenApril = getCreditInstallmentStatementMonth(frozenPlan, "2025-04", newCard)
      const dynamicApril = getCreditInstallmentStatementMonth(unfrozenPlan, "2025-04", newCard)
      expect(frozenApril).toBe("2025-04")
      expect(dynamicApril).not.toBe(frozenApril)

      // Ultima parcela ainda nao postou: usa o closeDay novo dinamicamente.
      const frozenJune = getCreditInstallmentStatementMonth(frozenPlan, "2025-06", newCard)
      const dynamicJune = getCreditInstallmentStatementMonth(unfrozenPlan, "2025-06", newCard)
      expect(frozenJune).toBe(dynamicJune)
    } finally {
      vi.useRealTimers()
    }
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

    // The 1200 average reflects only historical variable spending; the rent
    // starting this month is added on top instead of being masked by it.
    expect(projection.averageHistoricalCosts).toBe(1200)
    expect(projection.committedCosts).toBe(1600)
    expect(projection.projectedLeftover).toBe(1400)
  })

  it("drops committed costs once a structural commitment ends, even while using the historical average", () => {
    const timeline = buildProjectionTimeline({
      cards: [],
      transactions: [
        expense("jan", "2025-01-10", 900),
        expense("feb", "2025-02-10", 1200),
        expense("mar", "2025-03-10", 1500)
      ],
      fixedCosts: [],
      installmentPlans: [
        {
          id: "phone",
          name: "Celular",
          startMonth: "2025-04",
          paymentMethod: "pix",
          installmentValue: 300,
          paidInstallments: 0,
          totalInstallments: 1
        }
      ],
      targetMonth: "2025-04",
      monthsForward: 2,
      projectedRevenueByMonth: {
        "2025-01": 2500,
        "2025-02": 3000,
        "2025-03": 3500,
        "2025-04": 3000,
        "2025-05": 3000
      }
    })

    // April: installment active, so it's added on top of the 1200 average variable cost.
    expect(timeline[0].committedCosts).toBe(1500)
    // May: the single installment already finished, so committed costs drop
    // back down to just the historical average instead of staying frozen.
    expect(timeline[1].committedCosts).toBe(1200)
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
