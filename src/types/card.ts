export type CreditCard = {
  id: string
  bankId?: string
  name: string
  brandColor: string
  logoUrl?: string
  limitTotal: number
  closeDay: number
  dueDay: number
  manualInvoiceAmount: number
  manualInvoiceByMonth?: Record<string, number>
  paidThroughMonth?: string
}
