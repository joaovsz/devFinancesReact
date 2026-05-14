import { beforeEach, describe, expect, it } from "vitest"
import { CreditCard } from "../types/card"
import { InstallmentPlan } from "../types/planning"
import { getCreditCardUsageSummary } from "../utils/domain/creditCards"
import { useTransactionStore } from "./useTransactionStore"

const card: CreditCard = {
  id: "card-1",
  name: "Cartao teste",
  brandColor: "#111111",
  limitTotal: 1000,
  closeDay: 26,
  dueDay: 1,
  manualInvoiceAmount: 0
}

const installmentPlan: InstallmentPlan = {
  id: "installment-1",
  name: "Notebook",
  installmentValue: 100,
  totalInstallments: 5,
  paidInstallments: 0,
  startMonth: "2025-03",
  paymentMethod: "credit",
  cardId: card.id
}

describe("transaction store card invoice payment", () => {
  beforeEach(() => {
    useTransactionStore.setState({
      activeMonthKey: "2025-05",
      bankAccounts: [],
      cards: [card],
      transactions: [],
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      paidPlannedItems: {},
      totalIncomes: 0,
      totalExpenses: 100,
      totalAmount: -100
    })
  })

  it("marks invoice as paid without changing current total expenses or balance", () => {
    const before = useTransactionStore.getState()

    before.markCardInvoiceAsPaid(card.id, "2025-05")

    const after = useTransactionStore.getState()

    expect(after.cards[0]?.paidThroughMonth).toBe("2025-05")
    expect(after.totalIncomes).toBe(before.totalIncomes)
    expect(after.totalExpenses).toBe(before.totalExpenses)
    expect(after.totalAmount).toBe(before.totalAmount)
  })

  it("releases card limit while keeping chronological installment progress", () => {
    const beforeUsage = getCreditCardUsageSummary({
      card,
      transactions: [],
      fixedCosts: [],
      installmentPlans: [installmentPlan],
      monthKey: "2025-05"
    })

    useTransactionStore.getState().markCardInvoiceAsPaid(card.id, "2025-05")
    const after = useTransactionStore.getState()
    const paidCard = after.cards[0] as CreditCard
    const paidPlan = after.installmentPlans[0] as InstallmentPlan
    const afterUsage = getCreditCardUsageSummary({
      card: paidCard,
      transactions: [],
      fixedCosts: [],
      installmentPlans: [paidPlan],
      monthKey: "2025-05"
    })

    expect(beforeUsage.used).toBe(300)
    expect(afterUsage.used).toBe(200)
    expect(afterUsage.available).toBe(800)
    expect(paidPlan.paidInstallments).toBe(3)
  })
})
