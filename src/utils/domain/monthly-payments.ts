import { CreditCard } from "../../types/card"
import { FixedCost, InstallmentPlan } from "../../types/planning"
import { Transaction } from "../../types/transaction"
import {
  addMonths,
  dateToMonthKey,
  getCardManualInvoiceAmount,
  getCreditFixedCostStatementMonth,
  getCreditInstallmentStatementMonth,
  getCreditTransactionStatementMonth,
  getFixedCostDueMonth,
  getCurrentMonthKey,
  getInstallmentDueMonth,
  getInstallmentProgress,
  getMonthDateFromDay,
  isCardInvoicePaidForMonth,
  isFixedCostActiveForMonth,
  isMonthKeyAfter
} from "../projections"

export type MonthlyPayableKind = "fixedCost" | "installment" | "cardInvoice"
export type MonthlyPayableStatus = "paid" | "pending" | "dueSoon" | "overdue"

export type MonthlyPayable = {
  id: string
  kind: MonthlyPayableKind
  sourceId: string
  monthKey: string
  label: string
  amount: number
  dueDate?: string
  status: MonthlyPayableStatus
}

export function buildMonthlyPayableKey(
  kind: Exclude<MonthlyPayableKind, "cardInvoice">,
  sourceId: string,
  monthKey: string
) {
  return `${kind}:${sourceId}:${monthKey}`
}

export function sanitizePaidPlannedItems(value?: Record<string, string>) {
  if (!value || typeof value !== "object") {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, paidAt]) =>
        /^(fixedCost|installment):[^:]+:\d{4}-\d{2}$/.test(key) &&
        /^\d{4}-\d{2}-\d{2}$/.test(paidAt)
    )
  )
}

function getStatusForDueDate(
  dueDate: string | undefined,
  isPaid: boolean,
  referenceDate: string
) {
  if (isPaid) {
    return "paid" as const
  }

  if (!dueDate) {
    return "pending" as const
  }

  const referenceMonthKey = dateToMonthKey(referenceDate)
  const dueMonthKey = dateToMonthKey(dueDate)
  if (isMonthKeyAfter(referenceMonthKey, dueMonthKey)) {
    return "overdue" as const
  }

  if (referenceMonthKey === dueMonthKey && dueDate < referenceDate) {
    return "overdue" as const
  }

  if (referenceMonthKey === dueMonthKey) {
    const referenceDay = Number(referenceDate.slice(-2))
    const dueDay = Number(dueDate.slice(-2))
    if (Number.isFinite(referenceDay) && Number.isFinite(dueDay) && dueDay - referenceDay <= 7) {
      return "dueSoon" as const
    }
  }

  return "pending" as const
}

export function getCreditCardInvoiceOperationalTotalForMonth(input: {
  card: CreditCard
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}) {
  const creditTransactionsTotal = input.transactions
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod === "credit" &&
        transaction.cardId === input.card.id &&
        getCreditTransactionStatementMonth(transaction.date, input.card) === input.monthKey
    )
    .reduce((total, transaction) => total + transaction.value, 0)

  return (
    input.fixedCosts
      .filter(
        (cost) =>
          cost.paymentMethod === "credit" &&
          cost.cardId === input.card.id &&
          isFixedCostActiveForMonth(cost, input.monthKey) &&
          getCreditFixedCostStatementMonth(cost, input.monthKey, input.card) === input.monthKey
      )
      .reduce((total, cost) => total + cost.amount, 0) +
    input.installmentPlans
      .filter((plan) => plan.paymentMethod === "credit" && plan.cardId === input.card.id)
      .filter((plan) => getInstallmentProgress(plan, input.monthKey).isActive)
      .filter(
        (plan) =>
          getCreditInstallmentStatementMonth(plan, input.monthKey, input.card) === input.monthKey
      )
      .reduce((total, plan) => total + plan.installmentValue, 0) +
    creditTransactionsTotal +
    getCardManualInvoiceAmount(input.card, input.monthKey)
  )
}

export function buildMonthlyPayables(input: {
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
  paidPlannedItems: Record<string, string>
  referenceDate?: string
}) {
  const referenceDate = input.referenceDate || `${getCurrentMonthKey()}-01`
  const payables: MonthlyPayable[] = []

  input.fixedCosts
    .filter((cost) => cost.paymentMethod !== "credit")
    .forEach((cost) => {
      if (!isFixedCostActiveForMonth(cost, input.monthKey)) {
        return
      }

      const dueMonth = getFixedCostDueMonth(cost, input.monthKey)
      const dueDate = cost.dueDay
        ? getMonthDateFromDay(dueMonth, cost.dueDay)
        : undefined
      const key = buildMonthlyPayableKey("fixedCost", cost.id, input.monthKey)
      payables.push({
        id: key,
        kind: "fixedCost",
        sourceId: cost.id,
        monthKey: input.monthKey,
        label: cost.name,
        amount: cost.amount,
        dueDate,
        status: getStatusForDueDate(dueDate, Boolean(input.paidPlannedItems[key]), referenceDate)
      })
    })

  input.installmentPlans
    .filter((plan) => plan.paymentMethod !== "credit")
    .forEach((plan) => {
      const progress = getInstallmentProgress(plan, input.monthKey)
      if (!progress.isActive) {
        return
      }

      const dueMonth = getInstallmentDueMonth(plan, input.monthKey)
      const dueDate = plan.chargeDay
        ? getMonthDateFromDay(dueMonth, plan.chargeDay)
        : undefined
      const key = buildMonthlyPayableKey("installment", plan.id, input.monthKey)
      payables.push({
        id: key,
        kind: "installment",
        sourceId: plan.id,
        monthKey: input.monthKey,
        label: `${plan.name} (${progress.currentInstallment}/${plan.totalInstallments})`,
        amount: plan.installmentValue,
        dueDate,
        status: getStatusForDueDate(dueDate, Boolean(input.paidPlannedItems[key]), referenceDate)
      })
    })

  input.cards.forEach((card) => {
    const amount = getCreditCardInvoiceOperationalTotalForMonth({
      card,
      transactions: input.transactions,
      fixedCosts: input.fixedCosts,
      installmentPlans: input.installmentPlans,
      monthKey: input.monthKey
    })
    if (Math.abs(amount) < 0.01) {
      return
    }

    const dueDate = getMonthDateFromDay(addMonths(input.monthKey, 1), card.dueDay)
    payables.push({
      id: `cardInvoice:${card.id}:${input.monthKey}`,
      kind: "cardInvoice",
      sourceId: card.id,
      monthKey: input.monthKey,
      label: `Fatura ${card.name}`,
      amount,
      dueDate,
      status: getStatusForDueDate(
        dueDate,
        isCardInvoicePaidForMonth(card, input.monthKey),
        referenceDate
      )
    })
  })

  return payables.sort((left, right) => (left.dueDate || "9999-99-99").localeCompare(right.dueDate || "9999-99-99"))
}

export function getMonthlyPaymentMetrics(payables: MonthlyPayable[]) {
  const totalCount = payables.length
  const paidCount = payables.filter((item) => item.status === "paid").length
  const totalAmount = payables.reduce((sum, item) => sum + item.amount, 0)
  const paidAmount = payables
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0)

  return {
    totalCount,
    paidCount,
    unpaidCount: Math.max(totalCount - paidCount, 0),
    totalAmount,
    paidAmount,
    unpaidAmount: Math.max(totalAmount - paidAmount, 0),
    paidCountPercentage: totalCount > 0 ? (paidCount / totalCount) * 100 : 0,
    paidAmountPercentage: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
  }
}

export function getMonthlyPaymentAlerts(payables: MonthlyPayable[]) {
  return {
    overdue: payables.filter((item) => item.status === "overdue"),
    dueSoon: payables.filter((item) => item.status === "dueSoon"),
    pendingInvoices: payables.filter(
      (item) => item.kind === "cardInvoice" && item.status !== "paid"
    ),
    pendingFixedCosts: payables.filter(
      (item) => item.kind === "fixedCost" && item.status !== "paid"
    ),
    pendingInstallments: payables.filter(
      (item) => item.kind === "installment" && item.status !== "paid"
    )
  }
}
