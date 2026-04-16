export type PaymentMethod =
  | "cash"
  | "debit"
  | "pix"
  | "bank-transfer"
  | "bank-slip"
  | "cash-money"
  | "credit"

export type Transaction = {
  id: string
  label: string
  value: number
  date: string
  type: number
  paymentMethod: PaymentMethod
  cardId?: string
  categoryId: string
  subcategoryId: string
  tags: string[]
  competenceMonth?: string
}
