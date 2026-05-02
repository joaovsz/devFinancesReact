import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { Transaction } from "../types/transaction"
import { defaultCategories } from "../data/categories"
import { defaultCreditCards } from "../data/cards"
import { CreditCard } from "../types/card"
import { BankAccount } from "../types/bank-account"
import { bankPresets } from "../data/banks"
import {
  ContractConfig,
  FixedCost,
  InstallmentPlan,
  ProjectionSettings
} from "../types/planning"
import {
  addMonths,
  getCltProjectedRevenueForMonth,
  getPjProjectedRevenueForMonth,
  dateToMonthKey,
  getCardManualInvoiceAmount,
  getCurrentMonthKey,
  getCommittedCostsForMonth,
  getInstallmentProgress,
  getOperationalCostsForMonth,
  isMonthKeyAfter,
  sanitizeChargeDay
} from "../utils/projections"

export type TransactionStore = {
  activeMonthKey: string
  bankAccounts: BankAccount[]
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  contractConfig: ContractConfig
  projectionSettings: ProjectionSettings
  totalIncomes: number
  totalExpenses: number
  totalAmount: number
  setActiveMonthKey: (monthKey: string) => void
  resetActiveMonthKey: () => void
  addCard: (card: CreditCard) => void
  addBankAccount: (account: BankAccount) => void
  updateBankAccount: (account: BankAccount) => void
  removeBankAccount: (id: string) => void
  allocateFromBankAccount: (id: string, amount: number) => boolean
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
  markCardInvoiceAsPaid: (cardId: string, monthKey: string) => void
  setCardManualInvoiceAmountForMonth: (cardId: string, monthKey: string, amount: number) => void
  clearCardManualInvoiceAmountForMonth: (cardId: string, monthKey: string) => void
  updateContractConfig: (config: Partial<ContractConfig>) => void
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void
  loadMockData: () => void
  clearAllData: () => void
}

function calculateTotals(input: {
  activeMonthKey?: string
  transactions: Transaction[]
  cards: CreditCard[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
}) {
  const monthKey = input.activeMonthKey || getCurrentMonthKey()
  const totalIncomes = input.transactions
    .filter(
      (transaction) =>
        transaction.type === 1 &&
        (transaction.competenceMonth
          ? transaction.competenceMonth === monthKey
          : dateToMonthKey(transaction.date) === monthKey)
    )
    .reduce((sum, transaction) => sum + transaction.value, 0)

  const totalExpenses = getOperationalCostsForMonth({
    cards: input.cards,
    transactions: input.transactions,
    fixedCosts: input.fixedCosts,
    installmentPlans: input.installmentPlans,
    monthKey
  }).total

  return {
    totalIncomes,
    totalExpenses,
    totalAmount: totalIncomes - totalExpenses
  }
}

function getLatestPaidThroughMonth(previousMonthKey: string | undefined, monthKey: string) {
  if (!previousMonthKey) {
    return monthKey
  }

  return isMonthKeyAfter(monthKey, previousMonthKey) ? monthKey : previousMonthKey
}

function getProjectedRevenueForMonth(
  contractConfig: ContractConfig,
  monthKey: string
) {
  if (contractConfig.incomeMode === "clt") {
    return getCltProjectedRevenueForMonth(contractConfig, monthKey)
  }

  return getPjProjectedRevenueForMonth({
    contractConfig,
    monthKey,
    holidays: []
  })
}

export function selectProjectedMonthlyLeftover(state: TransactionStore) {
  const monthKey = state.activeMonthKey
  const projectedRevenue = getProjectedRevenueForMonth(state.contractConfig, monthKey)
  const committedCosts = getCommittedCostsForMonth({
    cards: state.cards,
    transactions: state.transactions,
    fixedCosts: state.fixedCosts,
    installmentPlans: state.installmentPlans,
    monthKey
  })

  return projectedRevenue - committedCosts.total
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

function normalizePaidThroughMonth(value?: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value
  }

  return undefined
}

function sanitizeManualInvoiceByMonth(value?: Record<string, number>) {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const entries = Object.entries(value).filter(
    ([monthKey, amount]) => /^\d{4}-\d{2}$/.test(monthKey) && Number.isFinite(amount)
  )

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(entries.map(([monthKey, amount]) => [monthKey, amount]))
}

function setManualInvoiceAmountForMonth(card: CreditCard, monthKey: string, amount: number) {
  // O ajuste manual representa diferenca entre total real e total calculado.
  // Pode ser negativo quando o banco fechou menor que a previsao local.
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const manualInvoiceByMonth = {
    ...(sanitizeManualInvoiceByMonth(card.manualInvoiceByMonth) || {})
  }

  if (Math.abs(safeAmount) >= 0.01) {
    manualInvoiceByMonth[monthKey] = safeAmount
  } else {
    delete manualInvoiceByMonth[monthKey]
  }

  return {
    ...card,
    manualInvoiceAmount: monthKey === getCurrentMonthKey() ? safeAmount : card.manualInvoiceAmount,
    manualInvoiceByMonth:
      Object.keys(manualInvoiceByMonth).length > 0 ? manualInvoiceByMonth : undefined
  }
}

function sanitizeCard(card: CreditCard, fallback?: CreditCard): CreditCard {
  const safeLimit = Number.isFinite(card.limitTotal)
    ? card.limitTotal
    : fallback?.limitTotal || 0
  const safeCloseDay = Number.isFinite(card.closeDay)
    ? Math.min(Math.max(Math.round(card.closeDay), 1), 31)
    : fallback?.closeDay || 1
  const safeDueDay = Number.isFinite(card.dueDay)
    ? Math.min(Math.max(Math.round(card.dueDay), 1), 31)
    : fallback?.dueDay || 1
  const safeManualInvoiceAmount = Number.isFinite(card.manualInvoiceAmount)
    ? card.manualInvoiceAmount
    : fallback?.manualInvoiceAmount || 0

  return {
    id: card.id || fallback?.id || crypto.randomUUID(),
    bankId: card.bankId ?? fallback?.bankId,
    name: card.name || fallback?.name || "Cartão",
    brandColor: normalizeCardBrandColor({
      ...card,
      brandColor: card.brandColor || fallback?.brandColor || "#64748B"
    }),
    logoUrl: normalizeCardLogoUrl({
      ...card,
      logoUrl: card.logoUrl || fallback?.logoUrl
    }),
    limitTotal: safeLimit,
    closeDay: safeCloseDay,
    dueDay: safeDueDay,
    manualInvoiceAmount: safeManualInvoiceAmount,
    manualInvoiceByMonth: sanitizeManualInvoiceByMonth(
      card.manualInvoiceByMonth ?? fallback?.manualInvoiceByMonth
    ),
    paidThroughMonth: normalizePaidThroughMonth(
      card.paidThroughMonth ?? fallback?.paidThroughMonth
    )
  }
}

function sanitizeInstallmentPlan(plan: InstallmentPlan): InstallmentPlan {
  const totalInstallments = Number.isFinite(plan.totalInstallments)
    ? Math.max(Math.round(plan.totalInstallments), 1)
    : 1
  const paidInstallments = Number.isFinite(plan.paidInstallments)
    ? Math.min(Math.max(Math.floor(plan.paidInstallments), 0), totalInstallments)
    : 0

  return {
    ...plan,
    totalInstallments,
    paidInstallments,
    chargeDay: sanitizeChargeDay(plan.chargeDay)
  }
}

function sanitizeFixedCost(cost: FixedCost): FixedCost {
  return {
    ...cost,
    startMonth:
      typeof cost.startMonth === "string" && /^\d{4}-\d{2}$/.test(cost.startMonth)
        ? cost.startMonth
        : undefined,
    dueDay: cost.paymentMethod === "credit" ? undefined : sanitizeChargeDay(cost.dueDay),
    chargeDay: cost.paymentMethod === "credit" ? sanitizeChargeDay(cost.chargeDay) : undefined
  }
}

function getTodayIsoDate() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function sanitizeCltPaydayDate(value?: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  return getTodayIsoDate()
}

function sanitizePjPaydayDate(value?: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  return getTodayIsoDate()
}

function sanitizeCompetenceOffsetMonths(value?: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(Math.round(value || 0), 0), 12)
}

function sanitizeBankAccount(account: BankAccount, fallback?: BankAccount): BankAccount {
  const safeBalance = Number.isFinite(account.balance)
    ? Math.max(account.balance, 0)
    : fallback?.balance || 0

  return {
    id: account.id || fallback?.id || crypto.randomUUID(),
    name: account.name?.trim() || fallback?.name || "Conta",
    type: account.type || fallback?.type || "checking",
    balance: safeBalance
  }
}

function sanitizeActiveMonthKey(value?: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value
  }

  return getCurrentMonthKey()
}

function createMockTransactionState() {
  const currentMonth = getCurrentMonthKey()
  const previousMonth = addMonths(currentMonth, -1)
  const twoMonthsAgo = addMonths(currentMonth, -2)
  const currentMonthStart = `${currentMonth}-`

  const bankAccounts: BankAccount[] = [
    {
      id: "mock-account-nubank",
      name: "Conta Nubank",
      type: "checking",
      balance: 4350
    },
    {
      id: "mock-account-itau-cdb",
      name: "CDB Itaú",
      type: "investment",
      balance: 12100
    },
    {
      id: "mock-account-reserva",
      name: "Reserva Liquidez Diária",
      type: "savings",
      balance: 2870
    }
  ]

  const cards: CreditCard[] = [
    {
      id: "mock-card-nubank",
      bankId: "nubank",
      name: "Nubank",
      brandColor: "#8B5CF6",
      logoUrl: "https://www.google.com/s2/favicons?domain=nubank.com.br&sz=128",
      limitTotal: 12000,
      closeDay: 8,
      dueDay: 15,
      manualInvoiceAmount: 180.5
    },
    {
      id: "mock-card-itau",
      bankId: "itau",
      name: "Itaú Platinum",
      brandColor: "#F97316",
      logoUrl: "https://www.google.com/s2/favicons?domain=itau.com.br&sz=128",
      limitTotal: 8500,
      closeDay: 5,
      dueDay: 12,
      manualInvoiceAmount: 0
    },
    {
      id: "mock-card-inter",
      bankId: "inter",
      name: "Inter Black",
      brandColor: "#F59E0B",
      logoUrl: "https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=128",
      limitTotal: 15000,
      closeDay: 20,
      dueDay: 28,
      manualInvoiceAmount: 90
    }
  ]

  const transactions: Transaction[] = [
    {
      id: "mock-income-pj-1",
      label: "Faturamento Projeto Alpha",
      value: 9800,
      date: `${currentMonthStart}03`,
      type: 1,
      paymentMethod: "pix",
      categoryId: "rendas",
      subcategoryId: "faturamento-pj",
      tags: ["cliente-a", "retainer"]
    },
    {
      id: "mock-income-freela-1",
      label: "Freela Landing Page",
      value: 2400,
      date: `${currentMonthStart}10`,
      type: 1,
      paymentMethod: "bank-transfer",
      categoryId: "rendas",
      subcategoryId: "freelas",
      tags: ["extra"]
    },
    {
      id: "mock-expense-market-1",
      label: "Mercado mensal",
      value: 850,
      date: `${currentMonthStart}05`,
      type: 2,
      paymentMethod: "credit",
      cardId: "mock-card-nubank",
      categoryId: "alimentacao",
      subcategoryId: "mercado",
      tags: ["casa"]
    },
    {
      id: "mock-expense-streaming-1",
      label: "Assinaturas streaming",
      value: 120,
      date: `${currentMonthStart}09`,
      type: 2,
      paymentMethod: "credit",
      cardId: "mock-card-itau",
      categoryId: "lazer-assinaturas",
      subcategoryId: "streaming",
      tags: ["fixo"]
    },
    {
      id: "mock-expense-internet-1",
      label: "Internet fibra",
      value: 139,
      date: `${currentMonthStart}06`,
      type: 2,
      paymentMethod: "pix",
      categoryId: "moradia",
      subcategoryId: "internet",
      tags: ["fixo"]
    },
    {
      id: "mock-expense-academia-1",
      label: "Academia",
      value: 99.9,
      date: `${currentMonthStart}11`,
      type: 2,
      paymentMethod: "debit",
      categoryId: "saude-bem-estar",
      subcategoryId: "academia",
      tags: ["saude"]
    },
    {
      id: "mock-expense-eletronicos-1",
      label: "Headset novo",
      value: 430,
      date: `${currentMonthStart}14`,
      type: 2,
      paymentMethod: "credit",
      cardId: "mock-card-inter",
      categoryId: "bens-equipamentos",
      subcategoryId: "perifericos",
      tags: ["home-office"]
    },
    {
      id: "mock-expense-books-1",
      label: "Livros técnicos",
      value: 210,
      date: `${previousMonth}-18`,
      type: 2,
      paymentMethod: "credit",
      cardId: "mock-card-nubank",
      categoryId: "educacao-carreira",
      subcategoryId: "livros",
      tags: ["estudo"]
    },
    {
      id: "mock-income-old-1",
      label: "Faturamento suporte",
      value: 5400,
      date: `${twoMonthsAgo}-12`,
      type: 1,
      paymentMethod: "bank-transfer",
      categoryId: "rendas",
      subcategoryId: "faturamento-pj",
      tags: ["cliente-b"]
    }
  ]

  const fixedCosts: FixedCost[] = [
    {
      id: "mock-fixed-rent",
      name: "Aluguel",
      amount: 2100,
      dueDay: 5,
      categoryId: "moradia",
      subcategoryId: "aluguel",
      paymentMethod: "pix"
    },
    {
      id: "mock-fixed-contab",
      name: "Contabilidade",
      amount: 390,
      dueDay: 10,
      categoryId: "impostos-empresa",
      subcategoryId: "contabilidade",
      paymentMethod: "bank-transfer"
    },
    {
      id: "mock-fixed-course",
      name: "Plataforma de cursos",
      amount: 89.9,
      categoryId: "educacao-carreira",
      subcategoryId: "cursos-assinaturas",
      paymentMethod: "credit",
      cardId: "mock-card-itau"
    }
  ]

  const installmentPlans: InstallmentPlan[] = [
    {
      id: "mock-install-notebook",
      name: "Notebook trabalho",
      installmentValue: 650,
      totalInstallments: 10,
      paidInstallments: 3,
      startMonth: addMonths(currentMonth, -3),
      paymentMethod: "credit",
      cardId: "mock-card-inter"
    },
    {
      id: "mock-install-curso",
      name: "Mentoria carreira",
      installmentValue: 220,
      totalInstallments: 6,
      paidInstallments: 1,
      startMonth: addMonths(currentMonth, -1),
      paymentMethod: "pix"
    }
  ]

  const contractConfig: ContractConfig = {
    incomeMode: "pj",
    hourlyRate: 165,
    hoursPerWorkday: 6,
    cltNetSalary: 0,
    cltPaydayDate: getTodayIsoDate(),
    pjPaydayDate: getTodayIsoDate(),
    localityState: "SP",
    localityCity: "Sao Paulo",
    useHolidayApi: true
  }

  const projectionSettings: ProjectionSettings = {
    projectedBalance: 0,
    projectedRevenue: 0
  }

  return {
    activeMonthKey: currentMonth,
    bankAccounts,
    cards,
    transactions,
    fixedCosts,
    installmentPlans,
    contractConfig,
    projectionSettings
  }
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      activeMonthKey: getCurrentMonthKey(),
      bankAccounts: [],
      cards: defaultCreditCards,
      transactions: [],
      fixedCosts: [],
      installmentPlans: [],
      contractConfig: {
        incomeMode: "pj",
        hourlyRate: 0,
        hoursPerWorkday: 8,
        cltNetSalary: 0,
        cltPaydayDate: getTodayIsoDate(),
        pjPaydayDate: getTodayIsoDate(),
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
      setActiveMonthKey: (monthKey) =>
        set((state) => {
          const activeMonthKey = sanitizeActiveMonthKey(monthKey)
          return {
            activeMonthKey,
            ...calculateTotals({
              activeMonthKey,
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      resetActiveMonthKey: () =>
        set((state) => {
          const activeMonthKey = getCurrentMonthKey()
          return {
            activeMonthKey,
            ...calculateTotals({
              activeMonthKey,
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      addBankAccount: (account) =>
        set((state) => ({
          bankAccounts: [...state.bankAccounts, sanitizeBankAccount(account)]
        })),
      updateBankAccount: (account) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.map((current) =>
            current.id === account.id
              ? sanitizeBankAccount(account, current)
              : current
          )
        })),
      removeBankAccount: (id) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((account) => account.id !== id)
        })),
      allocateFromBankAccount: (id, amount) => {
        let hasAllocated = false

        set((state) => {
          const safeAmount = Number.isFinite(amount) ? Math.max(amount, 0) : 0
          if (safeAmount <= 0) {
            return state
          }

          const bankAccounts = state.bankAccounts.map((account) => {
            if (account.id !== id) {
              return account
            }

            if (account.balance < safeAmount) {
              return account
            }

            hasAllocated = true
            return {
              ...account,
              balance: account.balance - safeAmount
            }
          })

          return {
            bankAccounts
          }
        })

        return hasAllocated
      },
      addCard: (card) =>
        set((state) => {
          const cards = [
            ...state.cards,
            sanitizeCard(card)
          ]
          return {
            cards,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
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
              ? sanitizeCard(card, currentCard)
              : currentCard
          )
          return {
            cards,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
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
              activeMonthKey: state.activeMonthKey,
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
              activeMonthKey: state.activeMonthKey,
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
              activeMonthKey: state.activeMonthKey,
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
              activeMonthKey: state.activeMonthKey,
              transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      addFixedCost: (cost) =>
        set((state) => {
          const fixedCosts = [...state.fixedCosts, sanitizeFixedCost(cost)]
          return {
            fixedCosts,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
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
            currentCost.id === cost.id ? sanitizeFixedCost(cost) : currentCost
          )
          return {
            fixedCosts,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
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
              activeMonthKey: state.activeMonthKey,
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      addInstallmentPlan: (plan) =>
        set((state) => {
          const installmentPlans = [...state.installmentPlans, sanitizeInstallmentPlan(plan)]
          return {
            installmentPlans,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
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
            currentPlan.id === plan.id ? sanitizeInstallmentPlan(plan) : currentPlan
          )
          return {
            installmentPlans,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
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
              activeMonthKey: state.activeMonthKey,
              transactions: state.transactions,
              cards: state.cards,
              fixedCosts: state.fixedCosts,
              installmentPlans
            })
          }
        }),
      markCardInvoiceAsPaid: (cardId, monthKey) =>
        set((state) => {
          // Pagar fatura e uma mudanca de estado, nao um novo lancamento.
          // Nao pode remover ajuste manual nem recalcular saldo/saidas do mes.
          const targetCard = state.cards.find((card) => card.id === cardId)
          if (
            targetCard?.paidThroughMonth &&
            !isMonthKeyAfter(monthKey, targetCard.paidThroughMonth)
          ) {
            return state
          }

          const cards = state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  paidThroughMonth: getLatestPaidThroughMonth(card.paidThroughMonth, monthKey),
                  manualInvoiceAmount:
                    monthKey === getCurrentMonthKey() ? card.manualInvoiceAmount : 0
                }
              : card
          )
          const installmentPlans = state.installmentPlans.map((plan) => {
            if (!(plan.paymentMethod === "credit" && plan.cardId === cardId)) {
              return plan
            }

            const progress = getInstallmentProgress(plan, monthKey)
            if (!progress.isActive) {
              return plan
            }

            // Avanca apenas o estado usado para liberar limite. A linha do tempo
            // visual continua cronologica em getInstallmentProgress.
            return sanitizeInstallmentPlan({
              ...plan,
              paidInstallments: Math.min(
                Math.max(plan.paidInstallments || 0, progress.currentInstallment),
                plan.totalInstallments
              )
            })
          })

          return {
            cards,
            installmentPlans,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
              transactions: state.transactions,
              cards,
              fixedCosts: state.fixedCosts,
              installmentPlans
            })
          }
        }),
      setCardManualInvoiceAmountForMonth: (cardId, monthKey, amount) =>
        set((state) => {
          const cards = state.cards.map((card) =>
            card.id === cardId ? setManualInvoiceAmountForMonth(card, monthKey, amount) : card
          )

          return {
            cards,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
              transactions: state.transactions,
              cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      clearCardManualInvoiceAmountForMonth: (cardId, monthKey) =>
        set((state) => {
          const cards = state.cards.map((card) =>
            card.id === cardId ? setManualInvoiceAmountForMonth(card, monthKey, 0) : card
          )

          return {
            cards,
            ...calculateTotals({
              activeMonthKey: state.activeMonthKey,
              transactions: state.transactions,
              cards,
              fixedCosts: state.fixedCosts,
              installmentPlans: state.installmentPlans
            })
          }
        }),
      updateContractConfig: (config) =>
        set((state) => ({
          contractConfig: {
            ...state.contractConfig,
            ...config,
            cltPaydayDate: sanitizeCltPaydayDate(
              config.cltPaydayDate || state.contractConfig.cltPaydayDate
            ),
            pjPaydayDate: sanitizePjPaydayDate(
              config.pjPaydayDate || state.contractConfig.pjPaydayDate
            ),
            cltCompetenceOffsetMonths: sanitizeCompetenceOffsetMonths(
              config.cltCompetenceOffsetMonths ?? state.contractConfig.cltCompetenceOffsetMonths
            ),
            pjCompetenceOffsetMonths: sanitizeCompetenceOffsetMonths(
              config.pjCompetenceOffsetMonths ?? state.contractConfig.pjCompetenceOffsetMonths
            )
          }
        })),
      updateProjectionSettings: (settings) =>
        set((state) => ({
          projectionSettings: {
            ...state.projectionSettings,
            ...settings
          }
        })),
      loadMockData: () =>
        set(() => {
          const mock = createMockTransactionState()
          return {
            ...mock,
            ...calculateTotals({
              activeMonthKey: mock.activeMonthKey,
              cards: mock.cards,
              transactions: mock.transactions,
              fixedCosts: mock.fixedCosts,
              installmentPlans: mock.installmentPlans
            })
          }
        }),
      clearAllData: () =>
        set(() => {
          const bankAccounts: BankAccount[] = []
          const cards: CreditCard[] = []
          const transactions: Transaction[] = []
          const fixedCosts: FixedCost[] = []
          const installmentPlans: InstallmentPlan[] = []
          const contractConfig: ContractConfig = {
            incomeMode: "pj",
            hourlyRate: 0,
            hoursPerWorkday: 8,
            cltNetSalary: 0,
            cltPaydayDate: getTodayIsoDate(),
            pjPaydayDate: getTodayIsoDate(),
            localityState: "SP",
            localityCity: "Sao Paulo",
            useHolidayApi: true
          }
          const projectionSettings: ProjectionSettings = {
            projectedBalance: 0,
            projectedRevenue: 0
          }

          return {
            bankAccounts,
            activeMonthKey: getCurrentMonthKey(),
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            contractConfig,
            projectionSettings,
            ...calculateTotals({
              activeMonthKey: getCurrentMonthKey(),
              cards,
              transactions,
              fixedCosts,
              installmentPlans
            })
          }
        })
    }),
    {
      name: "devfinances-storage",
      version: 32,
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
              cltPaydayDate: getTodayIsoDate(),
              pjPaydayDate: getTodayIsoDate(),
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
                cltPaydayDate: getTodayIsoDate(),
                pjPaydayDate: getTodayIsoDate(),
                localityState: "SP",
                localityCity: "Sao Paulo",
                useHolidayApi: true
              }),
              cltNetSalary: Number.isFinite(state.contractConfig?.cltNetSalary)
                ? state.contractConfig.cltNetSalary
                : 0,
              cltPaydayDate: sanitizeCltPaydayDate(state.contractConfig?.cltPaydayDate),
              pjPaydayDate: sanitizePjPaydayDate(state.contractConfig?.pjPaydayDate)
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
                cltPaydayDate: getTodayIsoDate(),
                pjPaydayDate: getTodayIsoDate(),
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

        if (version < 20) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => sanitizeCard(card))
          }
        }

        if (version < 21) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            cards: (state.cards || []).map((card) => sanitizeCard(card))
          }
        }

        if (version < 22) {
          const state = persistedState as TransactionStore
          const installmentPlans = (state.installmentPlans || []).map((plan) =>
            sanitizeInstallmentPlan(plan)
          )
          return {
            ...state,
            installmentPlans,
            ...calculateTotals({
              cards: state.cards || [],
              transactions: state.transactions || [],
              fixedCosts: state.fixedCosts || [],
              installmentPlans
            })
          }
        }

        if (version < 23) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            bankAccounts: Array.isArray(state.bankAccounts)
              ? state.bankAccounts.map((account) => sanitizeBankAccount(account))
              : []
          }
        }

        if (version < 24) {
          const state = persistedState as TransactionStore
          const cltPayday = Number((state.contractConfig as { cltPayday?: number })?.cltPayday)
          const now = new Date()
          const fallbackFromLegacy = Number.isFinite(cltPayday)
            ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
                Math.min(Math.max(Math.round(cltPayday), 1), 31)
              ).padStart(2, "0")}`
            : undefined

          return {
            ...state,
            contractConfig: {
              ...(state.contractConfig || {
                incomeMode: "pj",
                hourlyRate: 0,
                hoursPerWorkday: 8,
                cltNetSalary: 0,
                cltPaydayDate: getTodayIsoDate(),
                pjPaydayDate: getTodayIsoDate(),
                localityState: "SP",
                localityCity: "Sao Paulo",
                useHolidayApi: true
              }),
              cltPaydayDate: sanitizeCltPaydayDate(
                state.contractConfig?.cltPaydayDate || fallbackFromLegacy
              ),
              pjPaydayDate: sanitizePjPaydayDate(state.contractConfig?.pjPaydayDate)
            }
          }
        }

        if (version < 25) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            contractConfig: {
              ...(state.contractConfig || {
                incomeMode: "pj",
                hourlyRate: 0,
                hoursPerWorkday: 8,
                cltNetSalary: 0,
                cltPaydayDate: getTodayIsoDate(),
                pjPaydayDate: getTodayIsoDate(),
                localityState: "SP",
                localityCity: "Sao Paulo",
                useHolidayApi: true
              }),
              cltPaydayDate: sanitizeCltPaydayDate(state.contractConfig?.cltPaydayDate),
              pjPaydayDate: sanitizePjPaydayDate(state.contractConfig?.pjPaydayDate)
            }
          }
        }

        if (version < 26) {
          const state = persistedState as TransactionStore
          return {
            ...state,
            contractConfig: {
              ...(state.contractConfig || {
                incomeMode: "pj",
                hourlyRate: 0,
                hoursPerWorkday: 8,
                cltNetSalary: 0,
                cltPaydayDate: getTodayIsoDate(),
                pjPaydayDate: getTodayIsoDate(),
                localityState: "SP",
                localityCity: "Sao Paulo",
                useHolidayApi: true
              }),
              pjPaydayDate: sanitizePjPaydayDate(state.contractConfig?.pjPaydayDate)
            }
          }
        }

        if (version < 27) {
          const state = persistedState as TransactionStore
          const cards = (state.cards || []).map((card) => sanitizeCard(card))
          return {
            ...state,
            cards,
            ...calculateTotals({
              cards,
              transactions: state.transactions || [],
              fixedCosts: state.fixedCosts || [],
              installmentPlans: state.installmentPlans || []
            })
          }
        }

        if (version < 28) {
          const state = persistedState as TransactionStore
          const cards = (state.cards || []).map((card) => sanitizeCard(card))
          const transactions = state.transactions || []
          const fixedCosts = state.fixedCosts || []
          const installmentPlans = (state.installmentPlans || []).map((plan) =>
            sanitizeInstallmentPlan(plan)
          )
          return {
            ...state,
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            ...calculateTotals({
              cards,
              transactions,
              fixedCosts,
              installmentPlans
            })
          }
        }

        if (version < 29) {
          const state = persistedState as TransactionStore
          const activeMonthKey = sanitizeActiveMonthKey(state.activeMonthKey)
          const cards = (state.cards || []).map((card) => {
            const sanitizedCard = sanitizeCard(card)
            const manualInvoiceByMonth = {
              ...(sanitizedCard.manualInvoiceByMonth || {})
            }

            if (
              Number.isFinite(sanitizedCard.manualInvoiceAmount) &&
              sanitizedCard.manualInvoiceAmount > 0 &&
              !Number.isFinite(manualInvoiceByMonth[getCurrentMonthKey()])
            ) {
              manualInvoiceByMonth[getCurrentMonthKey()] = sanitizedCard.manualInvoiceAmount
            }

            return {
              ...sanitizedCard,
              manualInvoiceByMonth:
                Object.keys(manualInvoiceByMonth).length > 0 ? manualInvoiceByMonth : undefined
            }
          })
          const transactions = state.transactions || []
          const fixedCosts = (state.fixedCosts || []).map((cost) => sanitizeFixedCost(cost))
          const installmentPlans = (state.installmentPlans || []).map((plan) =>
            sanitizeInstallmentPlan(plan)
          )

          return {
            ...state,
            activeMonthKey,
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            ...calculateTotals({
              activeMonthKey,
              cards,
              transactions,
              fixedCosts,
              installmentPlans
            })
          }
        }

        if (version < 30) {
          const state = persistedState as TransactionStore
          const activeMonthKey = sanitizeActiveMonthKey(state.activeMonthKey)
          const cards = (state.cards || []).map((card) => sanitizeCard(card))
          const transactions = state.transactions || []
          const fixedCosts = (state.fixedCosts || []).map((cost) =>
            sanitizeFixedCost({
              ...cost,
              startMonth:
                cost.startMonth
                  ? cost.startMonth
                  : cost.paymentMethod === "credit"
                  ? activeMonthKey
                  : undefined
            })
          )
          const installmentPlans = (state.installmentPlans || []).map((plan) =>
            sanitizeInstallmentPlan(plan)
          )

          return {
            ...state,
            activeMonthKey,
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            ...calculateTotals({
              activeMonthKey,
              cards,
              transactions,
              fixedCosts,
              installmentPlans
            })
          }
        }

        if (version < 31) {
          const state = persistedState as TransactionStore
          const activeMonthKey = sanitizeActiveMonthKey(state.activeMonthKey)
          const cards = (state.cards || []).map((card) => sanitizeCard(card))
          const transactions = state.transactions || []
          const fixedCosts = (state.fixedCosts || []).map((cost) => sanitizeFixedCost(cost))
          const installmentPlans = (state.installmentPlans || []).map((plan) =>
            sanitizeInstallmentPlan(plan)
          )

          return {
            ...state,
            activeMonthKey,
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            ...calculateTotals({
              activeMonthKey,
              cards,
              transactions,
              fixedCosts,
              installmentPlans
            })
          }
        }

        if (version < 32) {
          const state = persistedState as TransactionStore
          const activeMonthKey = sanitizeActiveMonthKey(state.activeMonthKey)
          const cards = (state.cards || []).map((card) => sanitizeCard(card))
          const transactions = state.transactions || []
          const fixedCosts = (state.fixedCosts || []).map((cost) => sanitizeFixedCost(cost))
          const installmentPlans = (state.installmentPlans || []).map((plan) =>
            sanitizeInstallmentPlan(plan)
          )

          return {
            ...state,
            activeMonthKey,
            cards,
            transactions,
            fixedCosts,
            installmentPlans,
            ...calculateTotals({
              activeMonthKey,
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
