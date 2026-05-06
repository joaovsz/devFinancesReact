import { describe, expect, it } from "vitest"
import { CreditCard } from "../../types/card"
import { FixedCost, InstallmentPlan } from "../../types/planning"
import { buildMonthlyPayables } from "./monthly-payments"

describe("monthly payments operational month", () => {
  it("keeps credit card invoices in the operational month instead of the due month", () => {
    const card: CreditCard = {
      id: "credicard",
      name: "Credicard",
      brandColor: "#111111",
      limitTotal: 5000,
      closeDay: 26,
      dueDay: 5,
      manualInvoiceAmount: 0
    }

    const transactions = [
      {
        id: "tx-1",
        createdAt: "2025-04-20T10:00:00.000Z",
        label: "Compra abril",
        value: 120,
        date: "2025-04-20",
        type: 2,
        paymentMethod: "credit" as const,
        cardId: card.id,
        categoryId: "cat",
        subcategoryId: "sub",
        tags: []
      }
    ]

    const aprilPayables = buildMonthlyPayables({
      cards: [card],
      transactions,
      fixedCosts: [],
      installmentPlans: [],
      monthKey: "2025-04",
      paidPlannedItems: {},
      referenceDate: "2025-04-30"
    })
    const mayPayables = buildMonthlyPayables({
      cards: [card],
      transactions,
      fixedCosts: [],
      installmentPlans: [],
      monthKey: "2025-05",
      paidPlannedItems: {},
      referenceDate: "2025-05-31"
    })

    expect(aprilPayables).toHaveLength(1)
    expect(aprilPayables[0]?.label).toBe("Fatura Credicard")
    expect(aprilPayables[0]?.amount).toBe(120)
    expect(aprilPayables[0]?.dueDate).toBe("2025-05-05")
    expect(mayPayables).toHaveLength(0)
  })

  it("keeps non-credit fixed costs in the operational month even when they mature next month", () => {
    const fixedCost: FixedCost = {
      id: "rent",
      name: "Aluguel",
      amount: 1500,
      startMonth: "2025-04",
      dueOffsetMonths: 1,
      dueDay: 8,
      categoryId: "moradia",
      subcategoryId: "aluguel",
      paymentMethod: "pix"
    }

    const aprilPayables = buildMonthlyPayables({
      cards: [],
      transactions: [],
      fixedCosts: [fixedCost],
      installmentPlans: [],
      monthKey: "2025-04",
      paidPlannedItems: {},
      referenceDate: "2025-04-30"
    })
    const mayPayables = buildMonthlyPayables({
      cards: [],
      transactions: [],
      fixedCosts: [fixedCost],
      installmentPlans: [],
      monthKey: "2025-05",
      paidPlannedItems: {},
      referenceDate: "2025-05-31"
    })

    expect(aprilPayables).toHaveLength(1)
    expect(aprilPayables[0]?.label).toBe("Aluguel")
    expect(aprilPayables[0]?.dueDate).toBe("2025-05-08")
    expect(mayPayables).toHaveLength(1)
  })

  it("keeps non-credit installments in the operational month even when they mature next month", () => {
    const plan: InstallmentPlan = {
      id: "phone",
      name: "Celular",
      installmentValue: 300,
      totalInstallments: 3,
      paidInstallments: 0,
      startMonth: "2025-04",
      dueOffsetMonths: 1,
      chargeDay: 12,
      paymentMethod: "pix"
    }

    const aprilPayables = buildMonthlyPayables({
      cards: [],
      transactions: [],
      fixedCosts: [],
      installmentPlans: [plan],
      monthKey: "2025-04",
      paidPlannedItems: {},
      referenceDate: "2025-04-30"
    })
    const mayPayables = buildMonthlyPayables({
      cards: [],
      transactions: [],
      fixedCosts: [],
      installmentPlans: [plan],
      monthKey: "2025-05",
      paidPlannedItems: {},
      referenceDate: "2025-05-31"
    })

    expect(aprilPayables).toHaveLength(1)
    expect(aprilPayables[0]?.label).toContain("Celular (1/3)")
    expect(aprilPayables[0]?.dueDate).toBe("2025-05-12")
    expect(mayPayables).toHaveLength(1)
    expect(mayPayables[0]?.label).toContain("Celular (2/3)")
  })
})
