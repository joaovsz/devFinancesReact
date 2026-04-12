export type FixedCost = {
  id: string
  name: string
  amount: number
  paymentMethod: "cash" | "credit"
  cardId?: string
}

export type InstallmentPlan = {
  id: string
  name: string
  installmentValue: number
  totalInstallments: number
  startMonth: string // YYYY-MM
  paymentMethod: "cash" | "credit"
  cardId?: string
}

export type ContractConfig = {
  incomeMode: "pj" | "clt"
  hourlyRate: number
  hoursPerWorkday: number
  cltNetSalary: number
  localityState: string
  localityCity: string
  useHolidayApi: boolean
}

export type ProjectionSettings = {
  projectedBalance: number
  projectedRevenue: number
}
