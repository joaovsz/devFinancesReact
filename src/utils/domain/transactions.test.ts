import { describe, expect, it } from "vitest"
import { CreditCard } from "../../types/card"
import { Transaction } from "../../types/transaction"
import { isTransactionInOperationalMonth } from "./transactions"

const card: CreditCard = {
  id: "card-1",
  name: "Nubank",
  brandColor: "#111111",
  limitTotal: 1000,
  closeDay: 26,
  dueDay: 1,
  manualInvoiceAmount: 0
}

function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "transaction-1",
    label: "Lancamento",
    value: 100,
    date: "2025-04-27",
    type: 2,
    paymentMethod: "credit",
    cardId: card.id,
    categoryId: "cat",
    subcategoryId: "sub",
    tags: [],
    ...overrides
  }
}

describe("transaction operational month", () => {
  it("shows credit expenses in the card statement operational month", () => {
    const transaction = createTransaction({
      date: "2025-04-27",
      paymentMethod: "credit",
      cardId: card.id
    })

    expect(
      isTransactionInOperationalMonth({
        transaction,
        cards: [card],
        monthKey: "2025-04"
      })
    ).toBe(false)
    expect(
      isTransactionInOperationalMonth({
        transaction,
        cards: [card],
        monthKey: "2025-05"
      })
    ).toBe(true)
  })

  it("shows income by competence month when it exists", () => {
    const transaction = createTransaction({
      type: 1,
      paymentMethod: "pix",
      date: "2025-05-10",
      competenceMonth: "2025-06",
      cardId: undefined
    })

    expect(
      isTransactionInOperationalMonth({
        transaction,
        cards: [card],
        monthKey: "2025-05"
      })
    ).toBe(false)
    expect(
      isTransactionInOperationalMonth({
        transaction,
        cards: [card],
        monthKey: "2025-06"
      })
    ).toBe(true)
  })
})
