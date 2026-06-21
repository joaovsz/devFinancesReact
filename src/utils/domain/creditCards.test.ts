import { describe, expect, it, vi } from "vitest"
import { CreditCard } from "../../types/card"
import { FixedCost, InstallmentPlan } from "../../types/planning"
import { Transaction } from "../../types/transaction"
import {
  calculateManualInvoiceAdjustment,
  getCreditCardInvoicePlannedItems,
  getCreditCardInvoiceTransactions,
  getCreditCardUsageSummary
} from "./creditCards"
import {
  getCreditFixedCostStatementMonth,
  getInstallmentProgress,
  getCreditTransactionDueMonth,
  getCreditTransactionStatementMonth
} from "../projections"

function createCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: "card-1",
    name: "Cartao Teste",
    brandColor: "#111111",
    limitTotal: 1000,
    closeDay: 26,
    dueDay: 1,
    manualInvoiceAmount: 0,
    ...overrides
  }
}

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "transaction-1",
    label: "Compra teste",
    value: 100,
    date: "2025-04-27",
    type: 2,
    paymentMethod: "credit",
    cardId: "card-1",
    categoryId: "cat-1",
    subcategoryId: "sub-1",
    tags: [],
    ...overrides
  }
}

function createFixedCost(overrides: Partial<FixedCost> = {}): FixedCost {
  return {
    id: "fixed-1",
    name: "Assinatura",
    amount: 80,
    startMonth: "2025-05",
    chargeDay: 15,
    categoryId: "cat-1",
    subcategoryId: "sub-1",
    paymentMethod: "credit",
    cardId: "card-1",
    ...overrides
  }
}

function createInstallmentPlan(
  overrides: Partial<InstallmentPlan> = {}
): InstallmentPlan {
  return {
    id: "installment-1",
    name: "Notebook",
    installmentValue: 100,
    totalInstallments: 5,
    paidInstallments: 0,
    startMonth: "2025-03",
    chargeDay: 27,
    paymentMethod: "credit",
    cardId: "card-1",
    ...overrides
  }
}

describe("creditCards domain", () => {
  it("classifica compra apos fechamento na fatura operacional de maio com vencimento em junho", () => {
    const card = createCard({
      id: "nubank",
      closeDay: 26,
      dueDay: 1
    })
    const transaction = createTransaction({
      id: "purchase-1",
      cardId: card.id,
      date: "2025-04-27",
      value: 120
    })

    expect(getCreditTransactionStatementMonth(transaction.date, card)).toBe("2025-05")
    expect(getCreditTransactionDueMonth(transaction.date, card)).toBe("2025-06")

    const aprilSummary = getCreditCardUsageSummary({
      card,
      transactions: [transaction],
      fixedCosts: [],
      installmentPlans: [],
      monthKey: "2025-04"
    })
    const maySummary = getCreditCardUsageSummary({
      card,
      transactions: [transaction],
      fixedCosts: [],
      installmentPlans: [],
      monthKey: "2025-05"
    })
    const mayInvoiceTransactions = getCreditCardInvoiceTransactions({
      card,
      transactions: [transaction],
      monthKey: "2025-05"
    })

    expect(aprilSummary.currentInvoice).toBe(0)
    expect(maySummary.currentInvoice).toBe(120)
    expect(mayInvoiceTransactions).toHaveLength(1)
    expect(mayInvoiceTransactions[0]?.id).toBe(transaction.id)
  })

  it("mantem gasto fixo com cobranca apos fechamento na fatura operacional do proprio mes", () => {
    const card = createCard({
      id: "mercado-pago",
      closeDay: 9,
      dueDay: 15
    })
    const fixedCost = createFixedCost({
      id: "fixed-mp",
      cardId: card.id,
      startMonth: "2025-05",
      chargeDay: 15
    })

    expect(getCreditFixedCostStatementMonth(fixedCost, "2025-05", card)).toBe("2025-05")

    const aprilSummary = getCreditCardUsageSummary({
      card,
      transactions: [],
      fixedCosts: [fixedCost],
      installmentPlans: [],
      monthKey: "2025-04"
    })
    const maySummary = getCreditCardUsageSummary({
      card,
      transactions: [],
      fixedCosts: [fixedCost],
      installmentPlans: [],
      monthKey: "2025-05"
    })

    expect(aprilSummary.currentInvoice).toBe(0)
    expect(maySummary.currentInvoice).toBe(80)
  })

  it("calcula ajuste manual positivo como diferenca contra a base calculada", () => {
    expect(
      calculateManualInvoiceAdjustment({
        realInvoiceTotal: 807,
        currentInvoice: 250,
        manualAdjustmentValue: 0
      })
    ).toBe(557)
  })

  it("permite ajuste manual negativo quando a fatura real for menor que a calculada", () => {
    expect(
      calculateManualInvoiceAdjustment({
        realInvoiceTotal: 200,
        currentInvoice: 250,
        manualAdjustmentValue: 0
      })
    ).toBe(-50)
  })

  it("libera limite ao marcar fatura como paga sem reescrever a numeracao cronologica das parcelas", () => {
    const card = createCard({
      id: "card-paid",
      limitTotal: 1000,
      paidThroughMonth: "2025-05"
    })
    const installmentPlan = createInstallmentPlan({
      id: "installment-paid",
      cardId: card.id,
      startMonth: "2025-03",
      totalInstallments: 5,
      installmentValue: 100
    })

    const summary = getCreditCardUsageSummary({
      card,
      transactions: [],
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-05"
    })
    const progress = getInstallmentProgress(installmentPlan, "2025-05")

    expect(summary.used).toBe(200)
    expect(summary.available).toBe(800)
    expect(progress.isActive).toBe(true)
    expect(progress.currentInstallment).toBe(3)
  })

  it("nao soma parcelamento encerrado na fatura lancada", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-06-21T12:00:00.000Z"))

      const card = createCard({
        id: "card-completed-installment",
        closeDay: 30,
        dueDay: 10
      })
      const activeInstallment = createInstallmentPlan({
        id: "installment-active",
        cardId: card.id,
        startMonth: "2026-05",
        installmentValue: 117.49,
        totalInstallments: 4,
        paidInstallments: 1,
        chargeDay: undefined
      })
      const completedInstallment = createInstallmentPlan({
        id: "installment-completed",
        cardId: card.id,
        startMonth: "2026-01",
        installmentValue: 367.38,
        totalInstallments: 5,
        paidInstallments: 5,
        chargeDay: undefined
      })

      const summary = getCreditCardUsageSummary({
        card,
        transactions: [],
        fixedCosts: [],
        installmentPlans: [activeInstallment, completedInstallment],
        monthKey: "2026-06"
      })

      expect(summary.currentInvoice).toBe(117.49)
      expect(summary.postedInvoice).toBe(117.49)
    } finally {
      vi.useRealTimers()
    }
  })

  it("nao soma gasto fixo de credito antes do startMonth na fatura lancada", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-06-21T12:00:00.000Z"))

      const card = createCard({
        id: "card-future-fixed",
        closeDay: 30,
        dueDay: 10
      })
      const futureFixedCost = createFixedCost({
        id: "fixed-future",
        cardId: card.id,
        amount: 250,
        startMonth: "2026-07",
        chargeDay: undefined
      })

      const summary = getCreditCardUsageSummary({
        card,
        transactions: [],
        fixedCosts: [futureFixedCost],
        installmentPlans: [],
        monthKey: "2026-06"
      })

      expect(summary.currentInvoice).toBe(0)
      expect(summary.postedInvoice).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("mantem parcelamentos antigos sem chargeDay no mes correto via fallback de ciclo", () => {
    const card = createCard({
      id: "legacy-card",
      closeDay: 26,
      dueDay: 1
    })
    const installmentPlan = createInstallmentPlan({
      id: "legacy-installment",
      cardId: card.id,
      startMonth: "2025-05",
      chargeDay: undefined
    })

    const plannedItems = getCreditCardInvoicePlannedItems({
      card,
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-05"
    })

    expect(plannedItems).toHaveLength(1)
    expect(plannedItems[0]?.label).toContain("(1/5)")
  })

  it("itera parcelamento entre meses e remove a parcela depois do fim", () => {
    const card = createCard({
      id: "installment-card",
      closeDay: 26,
      dueDay: 1
    })
    const installmentPlan = createInstallmentPlan({
      id: "installment-cross-month",
      cardId: card.id,
      startMonth: "2025-03",
      totalInstallments: 3,
      installmentValue: 100,
      chargeDay: 15
    })

    const marchItems = getCreditCardInvoicePlannedItems({
      card,
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-03"
    })
    const aprilItems = getCreditCardInvoicePlannedItems({
      card,
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-04"
    })
    const mayItems = getCreditCardInvoicePlannedItems({
      card,
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-05"
    })
    const juneItems = getCreditCardInvoicePlannedItems({
      card,
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-06"
    })

    expect(marchItems[0]?.label).toContain("(1/3)")
    expect(aprilItems[0]?.label).toContain("(2/3)")
    expect(mayItems[0]?.label).toContain("(3/3)")
    expect(juneItems).toHaveLength(0)
  })
})
