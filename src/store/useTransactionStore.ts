import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { Transaction } from "../types/transaction"

type TransactionStore = {
  transactions: Transaction[]
  totalIncomes: number
  totalExpenses: number
  totalAmount: number
  addTransaction: (transaction: Transaction) => void
  removeTransaction: (id: string) => void
}

function calculateTotals(transactions: Transaction[]) {
  const { totalIncomes, totalExpenses } = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 1) {
        acc.totalIncomes += transaction.value
      } else {
        acc.totalExpenses += transaction.value
      }

      return acc
    },
    { totalIncomes: 0, totalExpenses: 0 }
  )

  return {
    totalIncomes,
    totalExpenses,
    totalAmount: totalIncomes - totalExpenses
  }
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      transactions: [],
      totalIncomes: 0,
      totalExpenses: 0,
      totalAmount: 0,
      addTransaction: (transaction) =>
        set((state) => {
          const transactions = [...state.transactions, transaction]
          return { transactions, ...calculateTotals(transactions) }
        }),
      removeTransaction: (id) =>
        set((state) => {
          const transactions = state.transactions.filter(
            (transaction) => transaction.id !== id
          )
          return { transactions, ...calculateTotals(transactions) }
        })
    }),
    {
      name: "devfinances-storage",
      version: 1,
      storage: createJSONStorage(() => localStorage)
    }
  )
)
