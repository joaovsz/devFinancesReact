import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { Transaction } from "../types/transaction"
import { defaultCategories } from "../data/categories"
import { defaultCreditCards } from "../data/cards"
import { CreditCard } from "../types/card"
import { bankPresets } from "../data/banks"
import {
  ContractConfig,
  FixedCost,
  InstallmentPlan,
  ProjectionSettings
} from "../types/planning"
import {
  dateToMonthKey,
  getCurrentMonthKey,
  getInstallmentTotalForMonth
} from "../utils/projections"

type TransactionStore = {
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  contractConfig: ContractConfig
  projectionSettings: ProjectionSettings
  totalIncomes: number
  totalExpenses: number
  totalAmount: number
  addCard: (card: CreditCard) => void
  updateCard: (card: CreditCard) => void
  removeCard: (id: string) => void
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (transaction: Transaction) => void
  removeTransaction: (id: string) => void
  addFixedCost: (cost: FixedCost) => void
  updateFixedCost: (cost: FixedCost) => void
  removeFixedCost: (id: string) => void
  addInstallmentPlan: (plan: InstallmentPlan) => void
  updateInstallmentPlan: (plan: InstallmentPlan) => void
  removeInstallmentPlan: (id: string) => void
  updateContractConfig: (config: Partial<ContractConfig>) => void
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void
}

function calculateTotals(input: {
  transactions: Transaction[]
  cards: CreditCard[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
}) {
  const monthKey = getCurrentMonthKey()
  const totalIncomes = input.transactions
    .filter(
      (transaction) =>
        transaction.type === 1 && dateToMonthKey(transaction.date) === monthKey
    )
    .reduce((sum, transaction) => sum + transaction.value, 0)

  const cashExpenses = input.transactions
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod === "cash" &&
        dateToMonthKey(transaction.date) === monthKey
    )
    .reduce((sum, transaction) => sum + transaction.value, 0)

  const cardsInvoices = input.cards.reduce((sum, card) => {
    const fixedCostsTotal = input.fixedCosts
      .filter((cost) => cost.paymentMethod === "credit" && cost.cardId === card.id)
      .reduce((total, cost) => total + cost.amount, 0)

    const installmentsTotal = getInstallmentTotalForMonth(
      input.installmentPlans.filter(
        (plan) => plan.paymentMethod === "credit" && plan.cardId === card.id
      ),
      monthKey
    )

    const creditTransactionsTotal = input.transactions
      .filter(
        (transaction) =>
          transaction.type === 2 &&
          transaction.paymentMethod === "credit" &&
          transaction.cardId === card.id &&
          dateToMonthKey(transaction.date) === monthKey
      )
      .reduce((total, transaction) => total + transaction.value, 0)

    const manualInvoiceAmount = card.manualInvoiceAmount || 0

    return (
      sum +
      fixedCostsTotal +
      installmentsTotal +
      creditTransactionsTotal +
      manualInvoiceAmount
    )
  }, 0)

  const totalExpenses = cashExpenses + cardsInvoices

  return {
    totalIncomes,
    totalExpenses,
    totalAmount: totalIncomes - totalExpenses
  }
}

function getFallbackCategoryIds() {
  const category = defaultCategories[0]
  return {
    categoryId: category.id,
    subcategoryId: category.subcategories[0].id
  }
}

function normalizeLegacyLogoUrl(logoUrl?: string) {
  if (!logoUrl) {
    return logoUrl
  }

  const clearbitMatch = logoUrl.match(/logo\.clearbit\.com\/([^/?#]+)/i)
  if (clearbitMatch?.[1]) {
    return `https://www.google.com/s2/favicons?domain=${clearbitMatch[1]}&sz=128`
  }

  return logoUrl
}

function normalizeCardBrandColor(card: CreditCard) {
  const cardName = card.name.toLowerCase()
  if (cardName.includes("ourocard")) {
    return "#FFCD00"
  }

  return card.brandColor
}

function normalizeCardLogoUrl(card: CreditCard) {
  return normalizeLegacyLogoUrl(card.logoUrl)
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      cards: defaultCreditCards,
      transactions: [],
      fixedCosts: [],
      installmentPlans: [],
      contractConfig: {
        incomeMode: "pj",
        hourlyRate: 0,
        hoursPerWorkday: 8,
        cltNetSalary: 0,
        localityState: "SP",
        localityCity: "Sao Paulo",
        useHolidayApi: true
      },
      projectionSettings: {
        projectedBalance: 0,
        projectedRevenue: 0
      },
      totalIncomes: 0,
      totalExpenses: 0,
      totalAmount: 0,
      addCard: (card) =>
        set((state) => {
          const cards = [
            ...state.cards,
            {
              ...card,
              brandColor: normalizeCardBrandColor(card),
              logoUrl: normalizeCardLogoUrl(card)
            }
          ]
          return {
            cards,
            ...calculateTotals({
              transactions: state.transactions,
              cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      updateCard: (card) =>
        set((state) => {
          const cards = state.cards.map((currentCard) =>
            currentCard.id === card.id
              ? {
                  ...card,
                  brandColor: normalizeCardBrandColor(card),
                  logoUrl: normalizeCardLogoUrl(card)
                }
              : currentCard
          )
          return {
            cards,
            ...calculateTotals({
              transactions: state.transactions,
              cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      removeCard: (id) =>
        set((state) => {
          const cards = state.cards.filter((card) => card.id !== id)
          const transactions = state.transactions.map((transaction) =>
            transaction.paymentMethod === "credit" && transaction.cardId === id
              ? { ...transaction, cardId: undefined }
              : transaction
          )
          const fixedCosts = state.fixedCosts.map((cost) =>
            cost.paymentMethod === "credit" && cost.cardId === id
              ? { ...cost, paymentMethod: "cash" as const, cardId: undefined }
              : cost
          )
          const installmentPlans = state.installmentPlans.map((plan) =>
            plan.paymentMethod === "credit" && plan.cardId === id
              ? { ...plan, paymentMethod: "cash" as const, cardId: undefined }
              : plan
          )
          return {
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            ...calculateTotals({
              transactions,
              cards,
              fixedCosts,
              installmentPlans
            })
          }
        }),
      addTransaction: (transaction) =>
        set((state) => {
          const transactions = [...state.transactions, transaction]
          return {
            transactions,
            ...calculateTotals({
              transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      updateTransaction: (transaction) =>
        set((state) => {
          const transactions = state.transactions.map((currentTransaction) =>
            currentTransaction.id === transaction.id ? transaction : currentTransaction
          )
          return {
            transactions,
            ...calculateTotals({
              transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      removeTransaction: (id) =>
        set((state) => {
          const transactions = state.transactions.filter(
            (transaction) => transaction.id !== id
          )
          return {
            transactions,
            ...calculateTotals({
              transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      addFixedCost: (cost) =>
        set((state) => {
          const fixedCosts = [...state.fixedCosts, cost]
          return {
            fixedCosts,
            ...calculateTotals({
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      updateFixedCost: (cost) =>
        set((state) => {
          const fixedCosts = state.fixedCosts.map((currentCost) =>
            currentCost.id === cost.id ? cost : currentCost
          )
          return {
            fixedCosts,
            ...calculateTotals({
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      removeFixedCost: (id) =>
        set((state) => {
          const fixedCosts = state.fixedCosts.filter((cost) => cost.id !== id)
          return {
            fixedCosts,
            ...calculateTotals({
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      addInstallmentPlan: (plan) =>
        set((state) => {
          const installmentPlans = [...state.installmentPlans, plan]
          return {
            installmentPlans,
            ...calculateTotals({
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans
            })
          }
        }),
      updateInstallmentPlan: (plan) =>
        set((state) => {
          const installmentPlans = state.installmentPlans.map((currentPlan) =>
            currentPlan.id === plan.id ? plan : currentPlan
          )
          return {
            installmentPlans,
            ...calculateTotals({
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans
            })
          }
        }),
      removeInstallmentPlan: (id) =>
        set((state) => {
          const installmentPlans = state.installmentPlans.filter((plan) => plan.id !== id)
          return {
            installmentPlans,
            ...calculateTotals({
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans
            })
          }
        }),
      updateContractConfig: (config) =>
        set((state) => ({
          contractConfig: {
            ...state.contractConfig,
            ...config
          }
        })),
      updateProjectionSettings: (settings) =>
        set((state) => ({
          projectionSettings: {
            ...state.projectionSettings,
            ...settings
          }
        }))
    }),
    {
      name: "devfinances-storage",
      version: 19,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as TransactionStore
        }

        if (version < 2) {
          const state = persistedState as TransactionStore
          const { categoryId, subcategoryId } = getFallbackCategoryIds()
          const transactions = (state.transactions || []).map((transaction) => ({
            ...transaction,
            categoryId: transaction.categoryId || categoryId,
            subcategoryId: transaction.subcategoryId || subcategoryId,
            tags: Array.isArray(transaction.tags) ? transaction.tags : []
          }))
          return {
            ...state,
            transactions,
            ...calculateTotals({
              transactions,
              cards: state.cards || [],
              fixedCosts: state.fixedCosts || [],
              installmentPlans: state.installmentPlans || []
            })
          }
        }

        if (version < 3) {
          const state = persistedState as TransactionStore
          const transactions = (state.transactions || []).map((transaction) => ({
            ...transaction,
            paymentMethod: transaction.paymentMethod || "cash",
            cardId: transaction.cardId || undefined,
            tags: Array.isArray(transaction.tags) ? transaction.tags : []
          }))
          return {
            ...state,
            transactions,
            ...calculateTotals({
              transactions,
              cards: state.cards || [],
              fixedCosts: state.fixedCosts || [],
              installmentPlans: state.installmentPlans || []
            })
          }
        }

        if (version < 4) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards:
              Array.isArray(state.cards) && state.cards.length > 0
                ? state.cards
                : defaultCreditCards
          }
        }

        if (version < 5) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || defaultCreditCards).map((card) => {
              const preset = bankPresets.find(
                (bank) => bank.name.toLowerCase() === card.name.toLowerCase()
              )
              return {
                ...card,
                brandColor: card.brandColor || preset?.brandColor || "#10B981",
                manualInvoiceAmount: Number.isFinite(card.manualInvoiceAmount)
                  ? card.manualInvoiceAmount
                  : 0
              }
            })
          }
        }

        if (version < 6) {
          const state = persistedState as TransactionStore & {
            installmentPlans?: InstallmentPlan[]
          }
          return {
            ...state,
            installmentPlans: Array.isArray(state.installmentPlans)
              ? state.installmentPlans
              : [],
            projectionSettings: state.projectionSettings || {
              projectedBalance: 0,
              projectedRevenue: 0
            }
          }
        }

        if (version < 7) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            fixedCosts: Array.isArray(state.fixedCosts) ? state.fixedCosts : []
          }
        }

        if (version < 8) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            contractConfig: state.contractConfig || {
              hourlyRate: 0,
              hoursPerWorkday: 8,
              cltNetSalary: 0,
              localityState: "SP",
              localityCity: "Sao Paulo",
              useHolidayApi: true
            }
          }
        }

        if (version < 9) {
          const state = persistedState as TransactionStore & {
            installmentPlans?: InstallmentPlan[]
          }
          return {
            ...state,
            fixedCosts: (state.fixedCosts || []).map((cost) => ({
              ...cost,
              paymentMethod: cost.paymentMethod || "cash",
              cardId: cost.cardId || undefined
            })),
            installmentPlans: (state.installmentPlans || []).map((plan) => ({
              ...plan,
              paymentMethod: plan.paymentMethod || "cash",
              cardId: plan.cardId || undefined
            }))
          }
        }

        if (version < 10) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            contractConfig: {
              ...(state.contractConfig || {
                hourlyRate: 0,
                hoursPerWorkday: 8,
                localityState: "SP",
                localityCity: "Sao Paulo",
                useHolidayApi: true
              }),
              cltNetSalary: Number.isFinite(state.contractConfig?.cltNetSalary)
                ? state.contractConfig.cltNetSalary
                : 0
            }
          }
        }

        if (version < 11) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            contractConfig: {
              ...(state.contractConfig || {
                hourlyRate: 0,
                hoursPerWorkday: 8,
                cltNetSalary: 0,
                localityState: "SP",
                localityCity: "Sao Paulo",
                useHolidayApi: true
              }),
              incomeMode:
                state.contractConfig?.incomeMode === "clt" ? "clt" : "pj"
            }
          }
        }

        if (version < 12) {
          const state = persistedState as TransactionStore
          const { categoryId, subcategoryId } = getFallbackCategoryIds()
          return {
            ...state,
            fixedCosts: (state.fixedCosts || []).map((cost) => ({
              ...cost,
              categoryId: cost.categoryId || categoryId,
              subcategoryId: cost.subcategoryId || subcategoryId
            }))
          }
        }

        if (version < 13) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => {
              const preset = bankPresets.find(
                (bank) => bank.name.toLowerCase() === card.name.toLowerCase()
              )
              return {
                ...card,
                bankId: card.bankId || preset?.id,
                logoUrl: card.logoUrl || preset?.logoUrl
              }
            })
          }
        }

        if (version < 14) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => ({
              ...card,
              logoUrl: normalizeLegacyLogoUrl(card.logoUrl)
            }))
          }
        }

        if (version < 15) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => ({
              ...card,
              brandColor: normalizeCardBrandColor(card)
            }))
          }
        }

        if (version < 16) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => ({
              ...card,
              brandColor: normalizeCardBrandColor(card),
              logoUrl: normalizeCardLogoUrl(card)
            }))
          }
        }

        if (version < 17) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => ({
              ...card,
              brandColor: normalizeCardBrandColor(card),
              logoUrl: normalizeCardLogoUrl(card)
            }))
          }
        }

        if (version < 18) {
          const state = persistedState as TransactionStore
          const hardcodedCardIds = new Set([
            "nubank",
            "ourocard",
            "credicard",
            "mercado-pago"
          ])
          return {
            ...state,
            cards: (state.cards || []).filter((card) => !hardcodedCardIds.has(card.id))
          }
        }

        if (version < 19) {
          const state = persistedState as TransactionStore
          const cards = state.cards || []
          const transactions = state.transactions || []
          const fixedCosts = state.fixedCosts || []
          const installmentPlans = state.installmentPlans || []
          return {
            ...state,
            ...calculateTotals({
              cards,
              transactions,
              fixedCosts,
              installmentPlans
            })
          }
        }

        return persistedState as TransactionStore
      }
    }
  )
)
