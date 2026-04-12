import { Holiday } from "../services/calendar"
import { FixedCost, InstallmentPlan, ContractConfig } from "../types/planning"
import { getInstallmentProgress } from "./projections"
import { getWorkingMonthMetrics } from "./business-days"

export type PlannedEntry = {
  id: string
  label: string
  value: number
  date: string
  type: 1 | 2
  paymentMethod: "cash" | "credit"
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

  input.fixedCosts.forEach((cost) => {
    entries.push({
      id: `planned-fixed-${cost.id}-${input.monthKey}`,
      label: cost.name,
      value: cost.amount,
      date: monthKeyToDate(input.monthKey),
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

    entries.push({
      id: `planned-installment-${plan.id}-${input.monthKey}`,
      label: `${plan.name} (${progress.currentInstallment}/${plan.totalInstallments})`,
      value: plan.installmentValue,
      date: monthKeyToDate(input.monthKey),
      type: 2,
      paymentMethod: plan.paymentMethod,
      cardId: plan.cardId,
      isPlanned: true,
      plannedSourceType: "installment",
      sourceId: plan.id
    })
  })

  if (input.contractConfig.incomeMode === "clt") {
    if (input.contractConfig.cltNetSalary > 0) {
      entries.push({
        id: `planned-clt-${input.monthKey}`,
        label: "Salário líquido CLT",
        value: input.contractConfig.cltNetSalary,
        date: monthKeyToDate(input.monthKey),
        type: 1,
        paymentMethod: "cash",
        isPlanned: true,
        plannedSourceType: "income"
      })
    }
  } else {
    const pjRevenue = getWorkingMonthMetrics({
      monthKey: input.monthKey,
      holidays: input.holidays,
      hoursPerWorkday: input.contractConfig.hoursPerWorkday,
      hourlyRate: input.contractConfig.hourlyRate
    }).projectedRevenue

    if (pjRevenue > 0) {
      entries.push({
        id: `planned-pj-${input.monthKey}`,
        label: "Faturamento PJ",
        value: pjRevenue,
        date: monthKeyToDate(input.monthKey),
        type: 1,
        paymentMethod: "cash",
        isPlanned: true,
        plannedSourceType: "income"
      })
    }
  }

  return entries
}
