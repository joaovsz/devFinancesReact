import { CreditCard } from "../../types/card"
import { Transaction } from "../../types/transaction"
import { dateToMonthKey, getCreditTransactionStatementMonth } from "../projections"

export function isTransactionInOperationalMonth(input: {
  transaction: Transaction
  cards: CreditCard[]
  monthKey: string
}) {
  const { transaction, cards, monthKey } = input

  if (transaction.type === 1) {
    return transaction.competenceMonth
      ? transaction.competenceMonth === monthKey
      : dateToMonthKey(transaction.date) === monthKey
  }

  if (transaction.paymentMethod !== "credit") {
    return dateToMonthKey(transaction.date) === monthKey
  }

  const card = cards.find((item) => item.id === transaction.cardId)
  const transactionMonth = card
    ? getCreditTransactionStatementMonth(transaction.date, card)
    : dateToMonthKey(transaction.date)

  return transactionMonth === monthKey
}
