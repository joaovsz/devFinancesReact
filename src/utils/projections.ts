import { Transaction } from "../types/transaction"
import { FixedCost, InstallmentPlan } from "../types/planning"
import { CreditCard } from "../types/card"

export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function monthKeyToIndex(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  return year * 12 + (month - 1)
}

export function isMonthKeyOnOrBefore(monthKey: string, referenceMonthKey: string) {
  return monthKeyToIndex(monthKey) <= monthKeyToIndex(referenceMonthKey)
}

export function isMonthKeyAfter(monthKey: string, referenceMonthKey: string) {
  return monthKeyToIndex(monthKey) > monthKeyToIndex(referenceMonthKey)
}

export function isCardInvoicePaidForMonth(card: CreditCard, monthKey: string) {
  if (!card.paidThroughMonth) {
    return false
  }

  return isMonthKeyOnOrBefore(monthKey, card.paidThroughMonth)
}

export function dateToMonthKey(dateString: string) {
  if (!dateString) {
    return getCurrentMonthKey()
  }

  const [year, month] = dateString.split("-")
  return `${year}-${month}`
}

export function getFixedCostsTotal(fixedCosts: FixedCost[]) {
  return fixedCosts.reduce((total, cost) => total + cost.amount, 0)
}

export function getInstallmentPaidCount(installmentPlan: InstallmentPlan) {
  const paidInstallments = Number.isFinite(installmentPlan.paidInstallments)
    ? Math.floor(installmentPlan.paidInstallments)
    : 0

  return Math.min(Math.max(paidInstallments, 0), installmentPlan.totalInstallments)
}

export function getInstallmentProgress(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  const start = monthKeyToIndex(installmentPlan.startMonth)
  const target = monthKeyToIndex(targetMonth)
  const paidInstallments = getInstallmentPaidCount(installmentPlan)
  const currentInstallment = paidInstallments + target - start + 1
  const isActive =
    currentInstallment > paidInstallments &&
    currentInstallment >= 1 &&
    currentInstallment <= installmentPlan.totalInstallments

  return {
    isActive,
    currentInstallment: isActive ? currentInstallment : 0
  }
}

export function getInstallmentRemainingCount(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  const paidInstallments = getInstallmentPaidCount(installmentPlan)
  const start = monthKeyToIndex(installmentPlan.startMonth)
  const target = monthKeyToIndex(targetMonth)

  if (target < start) {
    return Math.max(installmentPlan.totalInstallments - paidInstallments, 0)
  }

  const progress = getInstallmentProgress(installmentPlan, targetMonth)
  if (!progress.isActive) {
    return 0
  }

  return installmentPlan.totalInstallments - progress.currentInstallment + 1
}

export function getInstallmentRemainingTotal(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  return installmentPlan.installmentValue * getInstallmentRemainingCount(installmentPlan, targetMonth)
}

export function getInstallmentTotalForMonth(
  installmentPlans: InstallmentPlan[],
  targetMonth: string
) {
  return installmentPlans
    .filter((plan) => getInstallmentProgress(plan, targetMonth).isActive)
    .reduce((total, plan) => total + plan.installmentValue, 0)
}

export function getMonthlyLeftoverFromTransactions(
  transactions: Transaction[],
  targetMonth: string
) {
  return transactions
    .filter((transaction) => dateToMonthKey(transaction.date) === targetMonth)
    .reduce((total, transaction) => {
      if (transaction.type === 1) {
        return total + transaction.value
      }

      return total - transaction.value
    }, 0)
}

export function getAverageMonthlyLeftover(
  transactions: Transaction[],
  targetMonth: string,
  monthsBack = 3
) {
  const validMonths = Array.from({ length: monthsBack }).map((_, index) =>
    addMonths(targetMonth, -index)
  )

  const monthlyLeftovers = validMonths.map((monthKey) =>
    getMonthlyLeftoverFromTransactions(transactions, monthKey)
  )

  if (monthlyLeftovers.length === 0) {
    return 0
  }

  const total = monthlyLeftovers.reduce((sum, value) => sum + value, 0)
  return total / monthlyLeftovers.length
}

export function hasTransactionsInMonth(
  transactions: Transaction[],
  targetMonth: string
) {
  return transactions.some(
    (transaction) => dateToMonthKey(transaction.date) === targetMonth
  )
}

export function getCommittedCostsForMonth(input: {
  cards?: CreditCard[]
  transactions?: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}) {
  const fixedCostsTotal = getFixedCostsTotal(input.fixedCosts)
  const installmentsTotal = getInstallmentTotalForMonth(input.installmentPlans, input.monthKey)

  // Business rule: total outflows should include cash expenses PLUS the full credit card invoices.
  // A credit card invoice for a month is:
  // active installments + credit fixed costs + ad-hoc credit transactions + manualInvoiceAmount.
  const cards = input.cards || []
  const cashFixedCostsTotal = input.fixedCosts
    .filter((cost) => cost.paymentMethod !== "credit")
    .reduce((total, cost) => total + cost.amount, 0)
  const cashInstallmentsTotal = getInstallmentTotalForMonth(
    input.installmentPlans.filter((plan) => plan.paymentMethod !== "credit"),
    input.monthKey
  )
  const cashTransactionsTotal = (input.transactions || [])
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod !== "credit" &&
        dateToMonthKey(transaction.date) === input.monthKey
    )
    .reduce((total, transaction) => total + transaction.value, 0)

  const creditInvoicesTotal = cards.reduce((sum, card) => {
    if (isCardInvoicePaidForMonth(card, input.monthKey)) {
      return sum
    }

    const creditFixedCostsTotal = input.fixedCosts
      .filter((cost) => cost.paymentMethod === "credit" && cost.cardId === card.id)
      .reduce((total, cost) => total + cost.amount, 0)

    const creditInstallmentsTotal = getInstallmentTotalForMonth(
      input.installmentPlans.filter(
        (plan) => plan.paymentMethod === "credit" && plan.cardId === card.id
      ),
      input.monthKey
    )

    const creditTransactionsTotal = (input.transactions || [])
      .filter(
        (transaction) =>
          transaction.type === 2 &&
          transaction.paymentMethod === "credit" &&
          transaction.cardId === card.id &&
          dateToMonthKey(transaction.date) === input.monthKey
      )
      .reduce((total, transaction) => total + transaction.value, 0)

    const manualInvoiceAmount = card.manualInvoiceAmount || 0

    return (
      sum +
      creditFixedCostsTotal +
      creditInstallmentsTotal +
      creditTransactionsTotal +
      manualInvoiceAmount
    )
  }, 0)

  return {
    fixedCostsTotal,
    installmentsTotal,
    total:
      cashFixedCostsTotal +
      cashInstallmentsTotal +
      cashTransactionsTotal +
      creditInvoicesTotal
  }
}

export function buildProjectionTimeline(input: {
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  goalsMonthlyContribution?: number
  targetMonth: string
  monthsForward?: number
  projectedRevenueByMonth?: Record<string, number>
}) {
  const monthsForward = input.monthsForward ?? 12

  let cumulativeBalance = 0

  return Array.from({ length: monthsForward }).map((_, index) => {
    const monthKey = addMonths(input.targetMonth, index)
    const projectedRevenue = input.projectedRevenueByMonth?.[monthKey] || 0
    const goalsMonthlyContribution = Math.max(input.goalsMonthlyContribution || 0, 0)
    const committed = getCommittedCostsForMonth({
      cards: input.cards,
      transactions: input.transactions,
      fixedCosts: input.fixedCosts,
      installmentPlans: input.installmentPlans,
      monthKey
    })

    // Projected leftover should reflect what will remain:
    // projected revenue minus all outflows (cash + credit invoices + goals contribution).
    const committedCosts = committed.total + goalsMonthlyContribution
    const projectedLeftover = projectedRevenue - committedCosts
    cumulativeBalance += projectedLeftover

    return {
      monthKey,
      projectedRevenue,
      projectedLeftover,
      committedCosts,
      fixedCostsTotal: committed.fixedCostsTotal,
      installmentsTotal: committed.installmentsTotal,
      goalsMonthlyContribution,
      cumulativeBalance
    }
  })
}

export function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1, 1)

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })
}

export function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}
