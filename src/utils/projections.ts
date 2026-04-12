import { Transaction } from "../types/transaction"
import { FixedCost, InstallmentPlan } from "../types/planning"

export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function monthKeyToIndex(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  return year * 12 + (month - 1)
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

export function getInstallmentProgress(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  const start = monthKeyToIndex(installmentPlan.startMonth)
  const target = monthKeyToIndex(targetMonth)
  const currentInstallment = target - start + 1
  const isActive =
    currentInstallment >= 1 && currentInstallment <= installmentPlan.totalInstallments

  return {
    isActive,
    currentInstallment: isActive ? currentInstallment : 0
  }
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
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}) {
  const fixedCostsTotal = getFixedCostsTotal(input.fixedCosts)
  const installmentsTotal = getInstallmentTotalForMonth(
    input.installmentPlans,
    input.monthKey
  )

  return {
    fixedCostsTotal,
    installmentsTotal,
    total: fixedCostsTotal + installmentsTotal
  }
}

export function buildProjectionTimeline(input: {
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  targetMonth: string
  monthsForward?: number
  projectedRevenueByMonth?: Record<string, number>
}) {
  const monthsForward = input.monthsForward ?? 12
  const baseline = getAverageMonthlyLeftover(
    input.transactions,
    input.targetMonth,
    3
  )

  let cumulativeBalance = 0

  return Array.from({ length: monthsForward }).map((_, index) => {
    const monthKey = addMonths(input.targetMonth, index)
    const hasObservedData = hasTransactionsInMonth(input.transactions, monthKey)
    const monthlyLeftover = hasObservedData
      ? getMonthlyLeftoverFromTransactions(input.transactions, monthKey)
      : baseline
    const projectedRevenue = input.projectedRevenueByMonth?.[monthKey] || 0
    const committed = getCommittedCostsForMonth({
      fixedCosts: input.fixedCosts,
      installmentPlans: input.installmentPlans,
      monthKey
    })

    const projectedLeftover = monthlyLeftover + projectedRevenue - committed.total
    cumulativeBalance += projectedLeftover

    return {
      monthKey,
      hasObservedData,
      monthlyLeftover,
      projectedRevenue,
      projectedLeftover,
      committedCosts: committed.total,
      fixedCostsTotal: committed.fixedCostsTotal,
      installmentsTotal: committed.installmentsTotal,
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
