import { beforeEach, describe, expect, it, vi } from "vitest"
import { CreditCard } from "../types/card"
import { FixedCost, InstallmentPlan } from "../types/planning"
import { Transaction } from "../types/transaction"
import { getCreditCardUsageSummary } from "../utils/domain/creditCards"
import { getCreditTransactionStatementMonth } from "../utils/projections"
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

describe("credit statement month freezing on card edit", () => {
  const freezingCard: CreditCard = {
    id: "card-freezing",
    name: "Cartao freezing",
    brandColor: "#111111",
    limitTotal: 1000,
    closeDay: 4,
    dueDay: 20,
    manualInvoiceAmount: 0
  }

  beforeEach(() => {
    useTransactionStore.setState({
      activeMonthKey: "2025-05",
      bankAccounts: [],
      cards: [freezingCard],
      transactions: [],
      fixedCosts: [],
      installmentPlans: [],
      paidPlannedItems: {},
      totalIncomes: 0,
      totalExpenses: 0,
      totalAmount: 0
    })
  })

  it("freezes the statement month of a transaction when it is created", () => {
    const transaction: Transaction = {
      id: "tx-created",
      label: "Compra",
      value: 120,
      date: "2025-05-10",
      type: 2,
      paymentMethod: "credit",
      cardId: freezingCard.id,
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      tags: []
    }

    useTransactionStore.getState().addTransaction(transaction)

    const stored = useTransactionStore.getState().transactions[0]
    expect(stored?.statementMonth).toBe(
      getCreditTransactionStatementMonth(transaction.date, freezingCard)
    )
  })

  it("does not reclassify an existing transaction after editing closeDay", () => {
    const transaction: Transaction = {
      id: "tx-existing",
      label: "Compra",
      value: 120,
      date: "2025-05-10",
      type: 2,
      paymentMethod: "credit",
      cardId: freezingCard.id,
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      tags: []
    }
    useTransactionStore.getState().addTransaction(transaction)
    const statementMonthBeforeEdit = useTransactionStore.getState().transactions[0]?.statementMonth

    useTransactionStore.getState().updateCard({ ...freezingCard, closeDay: 13 })

    const afterEdit = useTransactionStore.getState()
    const storedTransaction = afterEdit.transactions[0]
    const editedCard = afterEdit.cards[0] as CreditCard

    expect(editedCard.closeDay).toBe(13)
    expect(storedTransaction?.statementMonth).toBe(statementMonthBeforeEdit)
    expect(
      getCreditTransactionStatementMonth(
        storedTransaction!.date,
        editedCard,
        storedTransaction!.statementMonth
      )
    ).toBe(statementMonthBeforeEdit)
  })

  it("uses the new closeDay for a transaction created after the edit", () => {
    useTransactionStore.getState().updateCard({ ...freezingCard, closeDay: 13 })
    const editedCard = useTransactionStore.getState().cards[0] as CreditCard

    const transaction: Transaction = {
      id: "tx-after-edit",
      label: "Compra",
      value: 90,
      date: "2025-05-10",
      type: 2,
      paymentMethod: "credit",
      cardId: freezingCard.id,
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      tags: []
    }
    useTransactionStore.getState().addTransaction(transaction)

    const stored = useTransactionStore.getState().transactions[0]
    expect(stored?.statementMonth).toBe(
      getCreditTransactionStatementMonth(transaction.date, editedCard)
    )
  })

  it("only re-freezes a transaction when its classification actually changes", () => {
    const transaction: Transaction = {
      id: "tx-relabel",
      label: "Compra",
      value: 120,
      date: "2025-05-10",
      type: 2,
      paymentMethod: "credit",
      cardId: freezingCard.id,
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      tags: []
    }
    useTransactionStore.getState().addTransaction(transaction)
    const statementMonthBeforeEdit = useTransactionStore.getState().transactions[0]?.statementMonth

    // Edita o cartao entre a criacao e a edicao da transacao, simulando o cenario
    // em que o usuario so quer renomear o lancamento, nao reclassificar a fatura.
    useTransactionStore.getState().updateCard({ ...freezingCard, closeDay: 13 })
    useTransactionStore.getState().updateTransaction({ ...transaction, label: "Compra renomeada" })

    const stored = useTransactionStore.getState().transactions[0]
    expect(stored?.label).toBe("Compra renomeada")
    expect(stored?.statementMonth).toBe(statementMonthBeforeEdit)
  })

  it("re-freezes with the new closeDay when the transaction date changes", () => {
    const transaction: Transaction = {
      id: "tx-redate",
      label: "Compra",
      value: 120,
      date: "2025-05-10",
      type: 2,
      paymentMethod: "credit",
      cardId: freezingCard.id,
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      tags: []
    }
    useTransactionStore.getState().addTransaction(transaction)

    useTransactionStore.getState().updateCard({ ...freezingCard, closeDay: 13 })
    const editedCard = useTransactionStore.getState().cards[0] as CreditCard
    useTransactionStore.getState().updateTransaction({ ...transaction, date: "2025-06-11" })

    const stored = useTransactionStore.getState().transactions[0]
    expect(stored?.statementMonth).toBe(
      getCreditTransactionStatementMonth("2025-06-11", editedCard)
    )
  })
})

describe("v35 migration backfills frozen statement months", () => {
  it("freezes posted occurrences using each card's current closeDay/dueDay", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2025-05-20T12:00:00.000Z"))

      const legacyCard: CreditCard = {
        id: "legacy-card",
        name: "Cartao legado",
        brandColor: "#111111",
        limitTotal: 1000,
        closeDay: 4,
        dueDay: 20,
        manualInvoiceAmount: 0
      }
      const legacyTransaction: Transaction = {
        id: "legacy-tx",
        label: "Compra antiga",
        value: 100,
        date: "2025-05-10",
        type: 2,
        paymentMethod: "credit",
        cardId: legacyCard.id,
        categoryId: "cat-1",
        subcategoryId: "sub-1",
        tags: []
      }
      const legacyFixedCost: FixedCost = {
        id: "legacy-fixed",
        name: "Assinatura",
        amount: 30,
        startMonth: "2025-03",
        chargeDay: 15,
        categoryId: "cat-1",
        subcategoryId: "sub-1",
        paymentMethod: "credit",
        cardId: legacyCard.id
      }

      const migrate = useTransactionStore.persist.getOptions().migrate
      expect(migrate).toBeTypeOf("function")

      const migrated = migrate!(
        {
          cards: [legacyCard],
          transactions: [legacyTransaction],
          fixedCosts: [legacyFixedCost],
          installmentPlans: []
        },
        34
      ) as {
        transactions: Transaction[]
        fixedCosts: FixedCost[]
      }

      expect(migrated.transactions[0]?.statementMonth).toBe(
        getCreditTransactionStatementMonth(legacyTransaction.date, legacyCard)
      )
      expect(migrated.fixedCosts[0]?.statementMonthByOccurrence?.["2025-05"]).toBeDefined()
      expect(migrated.fixedCosts[0]?.statementMonthByOccurrence?.["2025-06"]).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
})
