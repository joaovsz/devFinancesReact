export type Transaction = {
  id: string
  label: string
  value: number
  date: string
  type: number
  paymentMethod: "cash" | "credit"
  cardId?: string
  categoryId: string
  subcategoryId: string
  tags: string[]
}
