import { PaymentMethod } from "./transaction"

export type FixedExpenseFormValues = {
  name: string
  amount: string
  amountMode: "fixed" | "percentageOfRevenue"
  revenuePercentage: string
  categoryId: string
  subcategoryId: string
  dueDay: string
  dueOffsetMonths: string
  chargeDay: string
  paymentMethod: PaymentMethod
  cardId: string
}

export type InstallmentFormValues = {
  name: string
  value: string
  total: string
  paid: string
  paymentMethod: PaymentMethod
  cardId: string
  chargeDay: string
  dueOffsetMonths: string
  startMonth: string
}
