import { CreditCard } from "../../types/card"
import { FixedCost, InstallmentPlan } from "../../types/planning"
import { Transaction } from "../../types/transaction"
import {
  addMonths,
  getCardManualInvoiceAmount,
  getCreditFixedCostStatementMonth,
  getCreditFixedCostTotalForMonth,
  getCreditInstallmentStatementMonth,
  getCreditInstallmentTotalForMonth,
  getCreditTransactionDueMonth,
  getCreditTransactionStatementMonth,
  getInstallmentProgress,
  getInstallmentRemainingTotalAfterPaidThrough,
  getMonthDateFromDay,
  isCreditChargeAlreadyPosted,
  isFixedCostActiveForMonth,
  isMonthKeyAfter
} from "../projections"

export type CreditCardInvoicePlannedItem = {
  id: string
  label: string
  value: number
  sourceLabel: string
}

export type CreditCardUsageSummary = CreditCard & {
  currentInvoice: number
  postedInvoice: number
  pendingInvoice: number
  manualInvoiceAmount: number
  used: number
  available: number
  usagePercentage: number
}

export function calculateManualInvoiceAdjustment(input: {
  realInvoiceTotal: number
  currentInvoice: number
  manualAdjustmentValue: number
}) {
  const safeRealInvoiceTotal = Number.isFinite(input.realInvoiceTotal)
    ? input.realInvoiceTotal
    : 0
  const baseInvoiceWithoutManualAdjustment =
    input.currentInvoice - input.manualAdjustmentValue

  return safeRealInvoiceTotal - baseInvoiceWithoutManualAdjustment
}

export function getCreditCardUsageSummaries(input: {
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}): CreditCardUsageSummary[] {
  return input.cards.map((card) =>
    getCreditCardUsageSummary({
      card,
      transactions: input.transactions,
      fixedCosts: input.fixedCosts,
      installmentPlans: input.installmentPlans,
      monthKey: input.monthKey
    })
  )
}

export function getCreditCardUsageSummary(input: {
  card: CreditCard
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}): CreditCardUsageSummary {
  const { card, transactions, fixedCosts, installmentPlans, monthKey } = input
  const manualInvoiceAmount = getCardManualInvoiceAmount(card, monthKey)
  const transactionUsage = transactions
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod === "credit" &&
        transaction.cardId === card.id &&
        (!card.paidThroughMonth ||
          isMonthKeyAfter(
            getCreditTransactionDueMonth(transaction.date, card),
            card.paidThroughMonth
          ))
    )
    .reduce((sum, transaction) => sum + transaction.value, 0)

  const currentMonthInvoiceTransactions = transactions
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod === "credit" &&
        transaction.cardId === card.id &&
        getCreditTransactionStatementMonth(transaction.date, card) === monthKey &&
        (!card.paidThroughMonth ||
          isMonthKeyAfter(
            getCreditTransactionDueMonth(transaction.date, card),
            card.paidThroughMonth
          ))
    )
    .reduce((sum, transaction) => sum + transaction.value, 0)

  const plannedFixedUsage = getCreditFixedCostTotalForMonth({
    fixedCosts,
    monthKey,
    card,
    mode: "statement"
  })
  const postedFixedUsage = fixedCosts
    .filter(
      (cost) =>
        cost.paymentMethod === "credit" &&
        cost.cardId === card.id &&
        getCreditFixedCostStatementMonth(cost, monthKey, card) === monthKey &&
        isCreditChargeAlreadyPosted({
          monthKey,
          chargeDay: cost.chargeDay
        })
    )
    .reduce((sum, cost) => sum + cost.amount, 0)

  const plannedInstallmentsCurrentMonth = getCreditInstallmentTotalForMonth({
    installmentPlans,
    monthKey,
    card,
    mode: "statement"
  })
  const postedInstallmentsCurrentMonth = installmentPlans
    .filter(
      (plan) =>
        plan.paymentMethod === "credit" &&
        plan.cardId === card.id &&
        getCreditInstallmentStatementMonth(plan, monthKey, card) === monthKey &&
        isCreditChargeAlreadyPosted({
          monthKey,
          chargeDay: plan.chargeDay
        })
    )
    .reduce((sum, plan) => sum + plan.installmentValue, 0)

  const plannedInstallmentsLimitUsage = installmentPlans
    .filter((plan) => plan.paymentMethod === "credit" && plan.cardId === card.id)
    .reduce(
      (sum, plan) =>
        sum +
        getInstallmentRemainingTotalAfterPaidThrough(
          plan,
          monthKey,
          card.paidThroughMonth
        ),
      0
    )

  const postedInvoice =
    currentMonthInvoiceTransactions +
    postedFixedUsage +
    postedInstallmentsCurrentMonth +
    manualInvoiceAmount
  const projectedInvoice =
    currentMonthInvoiceTransactions +
    plannedFixedUsage +
    plannedInstallmentsCurrentMonth +
    manualInvoiceAmount
  const used =
    transactionUsage +
    fixedCosts
      .filter(
        (cost) =>
          cost.paymentMethod === "credit" &&
          cost.cardId === card.id &&
          isFixedCostActiveForMonth(cost, monthKey)
      )
      .reduce((sum, cost) => sum + cost.amount, 0) +
    plannedInstallmentsLimitUsage +
    manualInvoiceAmount
  const available = Math.max(card.limitTotal - used, 0)
  const usagePercentage = Math.min((used / Math.max(card.limitTotal, 1)) * 100, 100)

  return {
    ...card,
    currentInvoice: projectedInvoice,
    postedInvoice,
    pendingInvoice: Math.max(projectedInvoice - postedInvoice, 0),
    manualInvoiceAmount,
    used,
    available,
    usagePercentage
  }
}

export function getCreditCardInvoiceTransactions(input: {
  card: CreditCard
  transactions: Transaction[]
  monthKey: string
}) {
  return input.transactions
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod === "credit" &&
        transaction.cardId === input.card.id &&
        getCreditTransactionStatementMonth(transaction.date, input.card) === input.monthKey
    )
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function getCreditCardInvoicePlannedItems(input: {
  card: CreditCard
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}): CreditCardInvoicePlannedItem[] {
  const occurrenceMonths = [
    addMonths(input.monthKey, -2),
    addMonths(input.monthKey, -1),
    input.monthKey
  ]
  const items: CreditCardInvoicePlannedItem[] = []

  occurrenceMonths.forEach((occurrenceMonth) => {
    input.fixedCosts
      .filter(
        (cost) =>
          cost.paymentMethod === "credit" &&
          cost.cardId === input.card.id &&
          isFixedCostActiveForMonth(cost, occurrenceMonth) &&
          getCreditFixedCostStatementMonth(cost, occurrenceMonth, input.card) === input.monthKey
      )
      .forEach((cost) => {
        const date = getMonthDateFromDay(occurrenceMonth, cost.chargeDay)
        items.push({
          id: `planned-fixed-${cost.id}-${occurrenceMonth}`,
          label: cost.name,
          value: cost.amount,
          sourceLabel: `Gasto fixo planejado${
            isCreditChargeAlreadyPosted({
              monthKey: occurrenceMonth,
              chargeDay: Number(date.slice(-2))
            })
              ? ""
              : ` · cobra dia ${date.slice(-2)}`
          }`
        })
      })

    input.installmentPlans
      .filter(
        (plan) =>
          plan.paymentMethod === "credit" &&
          plan.cardId === input.card.id &&
          getInstallmentProgress(plan, occurrenceMonth).isActive &&
          getCreditInstallmentStatementMonth(plan, occurrenceMonth, input.card) === input.monthKey
      )
      .forEach((plan) => {
        const progress = getInstallmentProgress(plan, occurrenceMonth)
        const date = getMonthDateFromDay(occurrenceMonth, plan.chargeDay)
        items.push({
          id: `planned-installment-${plan.id}-${occurrenceMonth}`,
          label: `${plan.name} (${progress.currentInstallment}/${plan.totalInstallments})`,
          value: plan.installmentValue,
          sourceLabel: `Parcelamento planejado${
            isCreditChargeAlreadyPosted({
              monthKey: occurrenceMonth,
              chargeDay: Number(date.slice(-2))
            })
              ? ""
              : ` · cobra dia ${date.slice(-2)}`
          }`
        })
      })
  })

  const manualInvoiceAmount = getCardManualInvoiceAmount(input.card, input.monthKey)
  if (Math.abs(manualInvoiceAmount) >= 0.01) {
    items.push({
      id: `planned-manual-invoice-${input.card.id}-${input.monthKey}`,
      label: "Ajuste manual de fatura",
      value: manualInvoiceAmount,
      sourceLabel: "Ajuste manual"
    })
  }

  return items
}
