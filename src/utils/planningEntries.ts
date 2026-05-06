import { Holiday } from "../services/calendar"
import { FixedCost, InstallmentPlan, ContractConfig } from "../types/planning"
import { PaymentMethod } from "../types/transaction"
import {
  getFixedCostDueMonth,
  getInstallmentDueMonth,
  getCltIncomeDateForMonth,
  getCltProjectedRevenueForMonth,
  getMonthDateFromDay,
  getPjIncomeDateForMonth,
  getPjProjectedRevenueForMonth,
  getInstallmentProgress,
  isFixedCostActiveForMonth
} from "./projections"

export type PlannedEntry = {
  id: string
  label: string
  value: number
  date: string
  type: 1 | 2
  paymentMethod: PaymentMethod
  cardId?: string
  isPlanned: true
  plannedSourceType: "fixed" | "installment" | "income"
  sourceId?: string
}

function monthKeyToDate(monthKey: string) {
  return `${monthKey}-01`
}

export function buildPlannedEntriesForMonth(input: {
  monthKey: string
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  contractConfig: ContractConfig
  holidays: Holiday[]
}) {
  const entries: PlannedEntry[] = []

  input.fixedCosts.filter((cost) => isFixedCostActiveForMonth(cost, input.monthKey)).forEach((cost) => {
    const dueMonth =
      cost.paymentMethod === "credit"
        ? input.monthKey
        : getFixedCostDueMonth(cost, input.monthKey)
    entries.push({
      id: `planned-fixed-${cost.id}-${input.monthKey}`,
      label: cost.name,
      value: cost.amount,
      date:
        cost.paymentMethod === "credit"
          ? getMonthDateFromDay(input.monthKey, cost.chargeDay)
          : getMonthDateFromDay(dueMonth, cost.dueDay),
      type: 2,
      paymentMethod: cost.paymentMethod,
      cardId: cost.cardId,
      isPlanned: true,
      plannedSourceType: "fixed",
      sourceId: cost.id
    })
  })

  input.installmentPlans.forEach((plan) => {
    const progress = getInstallmentProgress(plan, input.monthKey)
    if (!progress.isActive) {
      return
    }

    const dueMonth =
      plan.paymentMethod === "credit"
        ? input.monthKey
        : getInstallmentDueMonth(plan, input.monthKey)

    entries.push({
      id: `planned-installment-${plan.id}-${input.monthKey}`,
      label: `${plan.name} (${progress.currentInstallment}/${plan.totalInstallments})`,
      value: plan.installmentValue,
      date: getMonthDateFromDay(dueMonth, plan.chargeDay),
      type: 2,
      paymentMethod: plan.paymentMethod,
      cardId: plan.cardId,
      isPlanned: true,
      plannedSourceType: "installment",
      sourceId: plan.id
    })
  })

  if (input.contractConfig.incomeMode === "clt") {
    const cltRevenue = getCltProjectedRevenueForMonth(input.contractConfig, input.monthKey)
    if (cltRevenue > 0) {
      entries.push({
        id: `planned-clt-${input.monthKey}`,
        label: "Salário líquido CLT",
        value: cltRevenue,
        date: getCltIncomeDateForMonth(input.contractConfig, input.monthKey),
        type: 1,
        paymentMethod: "cash",
        isPlanned: true,
        plannedSourceType: "income"
      })
    }
  } else {
    const pjRevenue = getPjProjectedRevenueForMonth({
      contractConfig: input.contractConfig,
      monthKey: input.monthKey,
      holidays: input.holidays
    })

    if (pjRevenue > 0) {
      entries.push({
        id: `planned-pj-${input.monthKey}`,
        label: "Faturamento PJ",
        value: pjRevenue,
        date: getPjIncomeDateForMonth(input.contractConfig, input.monthKey),
        type: 1,
        paymentMethod: "cash",
        isPlanned: true,
        plannedSourceType: "income"
      })
    }
  }

  return entries
}
