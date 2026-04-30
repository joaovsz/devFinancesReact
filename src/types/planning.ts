import { PaymentMethod } from "./transaction"

export type FixedCost = {
  id: string
  name: string
  amount: number
  startMonth?: string
  dueDay?: number
  chargeDay?: number
  categoryId: string
  subcategoryId: string
  paymentMethod: PaymentMethod
  cardId?: string
}

export type InstallmentPlan = {
  id: string
  name: string
  installmentValue: number
  totalInstallments: number
  paidInstallments: number
  startMonth: string // YYYY-MM
  chargeDay?: number
  paymentMethod: PaymentMethod
  cardId?: string
}

export type ContractConfig = {
  incomeMode: "pj" | "clt"
  hourlyRate: number
  hoursPerWorkday: number
  cltNetSalary: number
  cltPaydayDate: string
  pjPaydayDate: string
  cltCompetenceOffsetMonths?: number
  pjCompetenceOffsetMonths?: number
  localityState: string
  localityCity: string
  useHolidayApi: boolean
}

export type ProjectionSettings = {
  projectedBalance: number
  projectedRevenue: number
}
